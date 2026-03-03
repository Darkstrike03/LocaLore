-- ============================================================
-- LocaLore – Card Economy Migration
-- ============================================================
-- Currency: Anima (base unit). 10 anima = 1 obol, 1000 anima = 1 grim
-- Run after schema.sql
-- ============================================================

-- ─── Balances on users ───────────────────────────────────────────────────────
alter table public.users
  add column if not exists anima_balance integer not null default 0;

-- ─── Card Definitions ────────────────────────────────────────────────────────
-- One row = one "print run" of a card (creature + rarity + variant combo).
-- Multiple users can own copies; serial numbers track per-edition ordering.
create table if not exists public.card_definitions (
  id              uuid primary key default gen_random_uuid(),
  creature_id     uuid not null references public.creatures(id) on delete cascade,
  rarity          text not null check (rarity in (
    'whisper', 'remnant', 'manifestation', 'awakened', 'ephemeral', 'void_touched'
  )),
  flavor_text     text,
  art_variant     text not null default 'default',
  is_event_exclusive boolean not null default false,
  event_key       text,           -- matches SeasonalBanner event key
  edition_size    integer,        -- null = unlimited
  copies_minted   integer not null default 0,
  created_at      timestamptz not null default now()
);

alter table public.card_definitions enable row level security;
create policy "Anyone can read card definitions" on public.card_definitions for select using (true);
create policy "Admins can insert card definitions" on public.card_definitions for insert with check (auth.role() = 'authenticated');

-- ─── User Cards ──────────────────────────────────────────────────────────────
-- Each row = one physical copy of a card owned by a user.
create table if not exists public.user_cards (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  card_def_id     uuid not null references public.card_definitions(id) on delete cascade,
  serial_number   integer not null,           -- e.g. 043 of 200
  acquired_via    text not null check (acquired_via in (
    'pack', 'trade', 'event_drop', 'achievement', 'market', 'auction'
  )),
  grade           text not null default 'near_mint' check (grade in (
    'mint', 'near_mint', 'weathered', 'cursed'
  )),
  is_listed_market  boolean not null default false,
  is_listed_auction boolean not null default false,
  is_locked         boolean not null default false,  -- locked during active trade
  created_at      timestamptz not null default now()
);

alter table public.user_cards enable row level security;
create policy "Users read own cards" on public.user_cards for select using (auth.uid() = user_id);
create policy "Anyone can read cards for public profiles" on public.user_cards for select using (true);
create policy "Users insert own cards" on public.user_cards for insert with check (auth.uid() = user_id);
create policy "Users update own cards" on public.user_cards for update using (auth.uid() = user_id);

-- ─── Card Packs ──────────────────────────────────────────────────────────────
create table if not exists public.card_packs (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  description     text,
  cost_anima      integer not null,
  card_count      integer not null default 3,
  -- Rarity weight distribution (summing to 100)
  weight_whisper       integer not null default 55,
  weight_remnant       integer not null default 28,
  weight_manifestation integer not null default 11,
  weight_awakened      integer not null default 4,
  weight_ephemeral     integer not null default 2,
  weight_void_touched  integer not null default 0,
  region_filter   text,    -- null = no filter (any region)
  event_key_filter text,   -- only cards with this event key
  requires_verified boolean not null default false,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

alter table public.card_packs enable row level security;
create policy "Anyone can read packs" on public.card_packs for select using (true);

-- Seed default packs
insert into public.card_packs (name, slug, description, cost_anima, card_count,
  weight_whisper, weight_remnant, weight_manifestation, weight_awakened, weight_ephemeral, weight_void_touched)
values
  ('Archivist''s Cache',   'archivists-cache',   'Three fragments from the general archive. Origin unknown.',
   200, 3, 55, 28, 11, 4, 2, 0),
  ('Regional Codex',       'regional-codex',     'Five records bound to a single region. The archive grows specific.',
   350, 5, 45, 32, 15, 6, 2, 0),
  ('Night Pack',           'night-pack',         'Opened only under active events. Contains rites sealed at the last threshold.',
   500, 4, 30, 25, 20, 12, 10, 3),
  ('Verified Grimoire',    'verified-grimoire',  'Cards drawn only from verified creature records. Elevated manifestation rate.',
   600, 4, 30, 30, 22, 12, 5, 1)
on conflict (slug) do nothing;

-- ─── Market Listings (fixed price) ───────────────────────────────────────────
create table if not exists public.market_listings (
  id              uuid primary key default gen_random_uuid(),
  seller_id       uuid not null references auth.users(id) on delete cascade,
  user_card_id    uuid not null references public.user_cards(id) on delete cascade,
  price_anima     integer not null check (price_anima > 0),
  status          text not null default 'active' check (status in ('active', 'sold', 'cancelled')),
  buyer_id        uuid references auth.users(id),
  sold_at         timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.market_listings enable row level security;
create policy "Anyone reads market listings" on public.market_listings for select using (true);
create policy "Sellers manage own listings" on public.market_listings for all using (auth.uid() = seller_id);
create policy "Buyers can update listings" on public.market_listings for update using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- ─── Auction Listings ────────────────────────────────────────────────────────
create table if not exists public.auction_listings (
  id                  uuid primary key default gen_random_uuid(),
  seller_id           uuid not null references auth.users(id) on delete cascade,
  user_card_id        uuid not null references public.user_cards(id) on delete cascade,
  starting_bid_anima  integer not null check (starting_bid_anima > 0),
  current_bid_anima   integer,
  current_bidder_id   uuid references auth.users(id),
  reserve_anima       integer,      -- hidden; null = no reserve
  ends_at             timestamptz not null,
  snipe_extended_at   timestamptz,  -- set when bid lands in last 5 min
  status              text not null default 'active' check (status in ('active', 'ended', 'cancelled')),
  winner_id           uuid references auth.users(id),
  created_at          timestamptz not null default now()
);

alter table public.auction_listings enable row level security;
create policy "Anyone reads auctions" on public.auction_listings for select using (true);
create policy "Sellers manage auctions" on public.auction_listings for all using (auth.uid() = seller_id);

-- ─── Auction Bids ────────────────────────────────────────────────────────────
create table if not exists public.auction_bids (
  id              uuid primary key default gen_random_uuid(),
  auction_id      uuid not null references public.auction_listings(id) on delete cascade,
  bidder_id       uuid not null references auth.users(id) on delete cascade,
  amount_anima    integer not null,
  created_at      timestamptz not null default now()
);

alter table public.auction_bids enable row level security;
create policy "Anyone reads bids" on public.auction_bids for select using (true);
create policy "Bidders insert own bids" on public.auction_bids for insert with check (auth.uid() = bidder_id);

-- ─── Trade Offers ────────────────────────────────────────────────────────────
create table if not exists public.trade_offers (
  id                  uuid primary key default gen_random_uuid(),
  from_user_id        uuid not null references auth.users(id) on delete cascade,
  to_user_id          uuid not null references auth.users(id) on delete cascade,
  offered_card_ids    uuid[] not null,    -- user_card ids from from_user
  requested_card_ids  uuid[] not null,    -- user_card ids from to_user
  message             text,
  status              text not null default 'pending' check (status in (
    'pending', 'accepted', 'declined', 'cancelled', 'countered'
  )),
  counter_offer_id    uuid references public.trade_offers(id),
  created_at          timestamptz not null default now(),
  responded_at        timestamptz
);

alter table public.trade_offers enable row level security;
create policy "Trade participants can read" on public.trade_offers for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);
create policy "Authenticated users create trades" on public.trade_offers for insert
  with check (auth.uid() = from_user_id);
create policy "Trade participants update" on public.trade_offers for update
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- ─── Anima Ledger ────────────────────────────────────────────────────────────
create table if not exists public.anima_ledger (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  amount          integer not null,   -- positive = credit, negative = debit
  balance_after   integer not null,
  reason          text not null,
  reference_id    uuid,               -- xp_event, trade, listing, etc.
  created_at      timestamptz not null default now()
);

alter table public.anima_ledger enable row level security;
create policy "Users read own ledger" on public.anima_ledger for select using (auth.uid() = user_id);
create policy "System inserts ledger" on public.anima_ledger for insert with check (auth.uid() = user_id);

-- ─── Card Wishlists ──────────────────────────────────────────────────────────
create table if not exists public.card_wishlists (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  card_def_id     uuid not null references public.card_definitions(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique(user_id, card_def_id)
);

alter table public.card_wishlists enable row level security;
create policy "Users manage own wishlist" on public.card_wishlists for all using (auth.uid() = user_id);

-- ─── Card Showcases (curated named decks) ────────────────────────────────────
create table if not exists public.card_showcases (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  description     text,
  card_ids        uuid[] not null,    -- user_card ids; max 20
  is_public       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.card_showcases enable row level security;
create policy "Anyone reads public showcases" on public.card_showcases for select
  using (is_public = true or auth.uid() = user_id);
create policy "Users manage own showcases" on public.card_showcases for all using (auth.uid() = user_id);

-- ─── Activity Feed View ──────────────────────────────────────────────────────
-- A denormalised view for the community hub feed
create or replace view public.community_activity as
  select
    'sale'            as activity_type,
    ml.sold_at        as occurred_at,
    ml.buyer_id       as actor_id,
    ml.price_anima,
    uc.card_def_id,
    cd.rarity,
    c.name            as creature_name,
    c.slug            as creature_slug
  from public.market_listings ml
  join public.user_cards uc on uc.id = ml.user_card_id
  join public.card_definitions cd on cd.id = uc.card_def_id
  join public.creatures c on c.id = cd.creature_id
  where ml.status = 'sold' and ml.sold_at is not null
  union all
  select
    'trade'           as activity_type,
    to_.responded_at  as occurred_at,
    to_.from_user_id  as actor_id,
    null              as price_anima,
    null              as card_def_id,
    null              as rarity,
    null              as creature_name,
    null              as creature_slug
  from public.trade_offers to_
  where to_.status = 'accepted' and to_.responded_at is not null
  order by occurred_at desc nulls last
  limit 50;
