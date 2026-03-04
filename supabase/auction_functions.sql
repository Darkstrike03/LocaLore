-- ─── Auction Functions ──────────────────────────────────────────────────────
-- Run this migration in the Supabase SQL editor.
-- Requires: auction_listings, auction_bids, user_cards, users tables.

-- ─── 1. place_auction_bid ───────────────────────────────────────────────────
-- Atomically:
--   a) Validates the bid (active auction, above current price, bidder has funds)
--   b) Refunds the previous top bidder
--   c) Deducts from the new bidder
--   d) Inserts the bid row
--   e) Updates the listing (+ snipe extension if < 5 min remaining)
create or replace function public.place_auction_bid(
  p_auction_id uuid,
  p_amount     integer
)
returns void
language plpgsql
security definer
as $$
declare
  v_bidder_id      uuid := auth.uid();   -- always the caller — no client-supplied id
  v_listing        public.auction_listings%rowtype;
  v_min_bid        integer;
  v_bidder_balance integer;
  v_new_ends_at    timestamptz;
  v_snipe_at       timestamptz;
begin
  -- Must be authenticated
  if v_bidder_id is null then
    raise exception 'Not authenticated.';
  end if;

  -- Lock the listing row for this transaction
  select * into v_listing
  from public.auction_listings
  where id = p_auction_id
  for update;

  -- Guards
  if not found then
    raise exception 'Auction not found.';
  end if;

  if v_listing.status <> 'active' then
    raise exception 'Auction has ended.';
  end if;

  if now() > v_listing.ends_at then
    raise exception 'Auction has expired.';
  end if;

  v_min_bid := coalesce(v_listing.current_bid_anima, v_listing.starting_bid_anima) + 1;
  if p_amount < v_min_bid then
    raise exception 'Bid too low. Minimum is %.', v_min_bid;
  end if;

  if v_bidder_id = v_listing.seller_id then
    raise exception 'Sellers cannot bid on their own auctions.';
  end if;

  -- Check bidder balance
  select anima_balance into v_bidder_balance
  from public.users
  where id = v_bidder_id;

  if v_bidder_balance < p_amount then
    raise exception 'Insufficient anima balance.';
  end if;

  -- Refund previous top bidder (if exists and not the same person)
  if v_listing.current_bidder_id is not null
     and v_listing.current_bidder_id <> v_bidder_id
     and v_listing.current_bid_anima is not null
  then
    update public.users
    set anima_balance = anima_balance + v_listing.current_bid_anima
    where id = v_listing.current_bidder_id;
  end if;

  -- Deduct from new bidder
  update public.users
  set anima_balance = anima_balance - p_amount
  where id = v_bidder_id;

  -- Snipe protection: extend by 5 min if bid within last 5 min
  if v_listing.ends_at - now() < interval '5 minutes' then
    v_new_ends_at := now() + interval '5 minutes';
    v_snipe_at    := now();
  else
    v_new_ends_at := v_listing.ends_at;
    v_snipe_at    := v_listing.snipe_extended_at; -- preserve existing value
  end if;

  -- Record the bid
  insert into public.auction_bids (auction_id, bidder_id, amount_anima)
  values (p_auction_id, v_bidder_id, p_amount);

  -- Update listing
  update public.auction_listings
  set
    current_bid_anima  = p_amount,
    current_bidder_id  = v_bidder_id,
    ends_at            = v_new_ends_at,
    snipe_extended_at  = v_snipe_at
  where id = p_auction_id;
end;
$$;

-- Allow authenticated users to call this function
grant execute on function public.place_auction_bid(uuid, integer) to authenticated;
-- Revoke the old 3-arg signature if it still exists from a previous migration
drop function if exists public.place_auction_bid(uuid, uuid, integer);


-- ─── 2. settle_auction ──────────────────────────────────────────────────────
-- Call this from a Supabase Edge Function / pg_cron job after ends_at passes.
-- Atomically:
--   a) Marks the listing as ended + sets winner_id
--   b) Transfers the user_card to the winner (updates owner_id)
--   c) Pays the seller
--   d) Marks the card as no longer listed
--   e) If no bids: returns card to seller (already theirs), sets cancelled
create or replace function public.settle_auction(p_auction_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_listing public.auction_listings%rowtype;
begin
  select * into v_listing
  from public.auction_listings
  where id = p_auction_id
  for update;

  if not found then
    raise exception 'Auction not found.';
  end if;

  if v_listing.status <> 'active' then
    return; -- Already settled, idempotent
  end if;

  if now() < v_listing.ends_at then
    raise exception 'Auction has not ended yet.';
  end if;

  -- No bids: simply cancel and unlist
  if v_listing.current_bidder_id is null then
    update public.auction_listings
    set status = 'cancelled'
    where id = p_auction_id;

    update public.user_cards
    set is_listed_auction = false
    where id = v_listing.user_card_id;

    return;
  end if;

  -- Has a winner
  update public.auction_listings
  set
    status    = 'ended',
    winner_id = v_listing.current_bidder_id
  where id = p_auction_id;

  -- Transfer the card to the winner
  update public.user_cards
  set
    user_id           = v_listing.current_bidder_id,
    is_listed_auction = false,
    acquired_via      = 'auction'
  where id = v_listing.user_card_id;

  -- Pay the seller (reserve check: if reserve not met we still pay — reserve is informational here)
  update public.users
  set anima_balance = anima_balance + v_listing.current_bid_anima
  where id = v_listing.seller_id;
end;
$$;

-- Only service-role (Edge Functions / pg_cron) should call settle_auction
-- Revoke from authenticated users for safety
revoke execute on function public.settle_auction(uuid) from authenticated;
grant  execute on function public.settle_auction(uuid) to service_role;


-- ─── 3. Enable Realtime on the relevant tables ──────────────────────────────
-- Idempotent: only adds the table if it is not already in the publication.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'auction_listings'
  ) then
    alter publication supabase_realtime add table public.auction_listings;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'auction_bids'
  ) then
    alter publication supabase_realtime add table public.auction_bids;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'users'
  ) then
    alter publication supabase_realtime add table public.users;
  end if;
end $$;


-- ─── 4. pg_cron fallback (safety net) ──────────────────────────────────────
-- Runs every 5 minutes to catch any auctions no client was watching.
-- Requires the pg_cron extension enabled in Supabase Dashboard → Database → Extensions.
-- The settle_auction function is idempotent — safe to call multiple times.
select cron.schedule(
  'settle-expired-auctions-fallback',
  '*/5 * * * *',
  $$
    select public.settle_auction(id)
    from public.auction_listings
    where status = 'active'
      and ends_at <= now();
  $$
);
