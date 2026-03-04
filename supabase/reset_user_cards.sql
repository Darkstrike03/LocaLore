-- ═══════════════════════════════════════════════════════════════════════════
-- LocaLore — Full Card Reset + Anima Refund for a single user
-- ═══════════════════════════════════════════════════════════════════════════
-- Replace '00000000-0000-0000-0000-000000000000' with your actual user UUID
-- (find it in Authentication → Users in the Supabase dashboard).
-- Run in the SQL editor. Wrap in a transaction so it is all-or-nothing.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

do $$
declare
  v_user_id   uuid := '00000000-0000-0000-0000-000000000000'; -- ← your UUID here
  v_refund    integer;
begin

  -- ── 1. Cancel any active auction listings this user created ──────────────
  update public.auction_listings
  set status = 'cancelled'
  where seller_id = v_user_id
    and status = 'active';

  -- ── 2. Refund anima that was locked in bids by this user ─────────────────
  --    (auctions where they are the current top bidder but the auction is active)
  update public.users
  set anima_balance = anima_balance + (
    select coalesce(sum(current_bid_anima), 0)
    from   public.auction_listings
    where  current_bidder_id = v_user_id
      and  status            = 'active'
  )
  where id = v_user_id;

  -- Remove them as bidder on those auctions (outbid = refunded above)
  update public.auction_listings
  set current_bidder_id = null,
      current_bid_anima = null
  where current_bidder_id = v_user_id
    and status            = 'active';

  -- ── 3. Cancel pending trades involving this user ──────────────────────────
  update public.trade_offers
  set status = 'cancelled'
  where (from_user_id = v_user_id or to_user_id = v_user_id)
    and status = 'pending';

  -- ── 4. Cancel market listings this user created + remember refund amount ─
  --    (market listings lock no anima, so no monetary refund needed here)
  update public.market_listings
  set status = 'cancelled'
  where seller_id = v_user_id
    and status    = 'active';

  -- ── 5. Calculate a fair refund for cards held by this user ───────────────
  --    Refund policy: sum of anima spent opening packs that produced these cards.
  --    We use anima_ledger entries with reason 'pack_open' as the source of truth.
  select coalesce(sum(abs(amount)), 0)
  into   v_refund
  from   public.anima_ledger
  where  user_id = v_user_id
    and  reason  = 'pack_open';

  -- ── 6. Delete all user_cards belonging to this user ──────────────────────
  delete from public.user_cards
  where user_id = v_user_id;

  -- ── 7. Credit the refund ──────────────────────────────────────────────────
  if v_refund > 0 then
    update public.users
    set anima_balance = anima_balance + v_refund
    where id = v_user_id;

    insert into public.anima_ledger (user_id, amount, balance_after, reason)
    select v_user_id, v_refund,
           (select anima_balance from public.users where id = v_user_id),
           'card_reset_refund';
  end if;

  raise notice 'Reset complete for %. Refunded % anima.', v_user_id, v_refund;
end $$;

commit;
