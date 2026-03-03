import type { Creature } from './creature'

// ─── Rarity ───────────────────────────────────────────────────────────────────
export type CardRarity =
  | 'whisper'
  | 'remnant'
  | 'manifestation'
  | 'awakened'
  | 'ephemeral'
  | 'void_touched'

export type CardGrade = 'mint' | 'near_mint' | 'weathered' | 'cursed'

export type AcquiredVia = 'pack' | 'trade' | 'event_drop' | 'achievement' | 'market' | 'auction'

export type TradeStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'countered'

export type ListingStatus = 'active' | 'sold' | 'cancelled'

export type AuctionStatus = 'active' | 'ended' | 'cancelled'

// ─── Card Definition (the template) ──────────────────────────────────────────
export interface CardDefinition {
  id: string
  creature_id: string
  rarity: CardRarity
  flavor_text: string | null
  art_variant: string
  is_event_exclusive: boolean
  event_key: string | null
  edition_size: number | null
  copies_minted: number
  created_at: string
  // joined
  creature?: Creature
}

// ─── User Card (a physical copy) ─────────────────────────────────────────────
export interface UserCard {
  id: string
  user_id: string
  card_def_id: string
  serial_number: number
  acquired_via: AcquiredVia
  grade: CardGrade
  is_listed_market: boolean
  is_listed_auction: boolean
  is_locked: boolean
  created_at: string
  // joined
  definition?: CardDefinition & { creature: Creature }
}

// ─── Card Pack ────────────────────────────────────────────────────────────────
export interface CardPack {
  id: string
  name: string
  slug: string
  description: string | null
  cost_anima: number
  card_count: number
  weight_whisper: number
  weight_remnant: number
  weight_manifestation: number
  weight_awakened: number
  weight_ephemeral: number
  weight_void_touched: number
  region_filter: string | null
  event_key_filter: string | null
  requires_verified: boolean
  is_active: boolean
  created_at: string
}

// ─── Market Listing ───────────────────────────────────────────────────────────
export interface MarketListing {
  id: string
  seller_id: string
  user_card_id: string
  price_anima: number
  status: ListingStatus
  buyer_id: string | null
  sold_at: string | null
  created_at: string
  // joined
  user_card?: UserCard & { definition: CardDefinition & { creature: Creature } }
  seller?: { username: string | null; display_name: string | null }
}

// ─── Auction Listing ──────────────────────────────────────────────────────────
export interface AuctionListing {
  id: string
  seller_id: string
  user_card_id: string
  starting_bid_anima: number
  current_bid_anima: number | null
  current_bidder_id: string | null
  reserve_anima: number | null
  ends_at: string
  snipe_extended_at: string | null
  status: AuctionStatus
  winner_id: string | null
  created_at: string
  // joined
  user_card?: UserCard & { definition: CardDefinition & { creature: Creature } }
  seller?: { username: string | null; display_name: string | null }
  bid_count?: number
}

// ─── Auction Bid ──────────────────────────────────────────────────────────────
export interface AuctionBid {
  id: string
  auction_id: string
  bidder_id: string
  amount_anima: number
  created_at: string
}

// ─── Trade Offer ──────────────────────────────────────────────────────────────
export interface TradeOffer {
  id: string
  from_user_id: string
  to_user_id: string
  offered_card_ids: string[]
  requested_card_ids: string[]
  message: string | null
  status: TradeStatus
  counter_offer_id: string | null
  created_at: string
  responded_at: string | null
  // joined
  from_user?: { username: string | null; display_name: string | null }
  to_user?: { username: string | null; display_name: string | null }
  offered_cards?: UserCard[]
  requested_cards?: UserCard[]
}

// ─── Anima Ledger ─────────────────────────────────────────────────────────────
export interface AnimaLedgerEntry {
  id: string
  user_id: string
  amount: number
  balance_after: number
  reason: string
  reference_id: string | null
  created_at: string
}

// ─── Card Showcase ────────────────────────────────────────────────────────────
export interface CardShowcase {
  id: string
  user_id: string
  title: string
  description: string | null
  card_ids: string[]
  is_public: boolean
  created_at: string
  updated_at: string
  // joined
  cards?: UserCard[]
}

// ─── Pack Open Result ─────────────────────────────────────────────────────────
export interface PackOpenResult {
  newCards: UserCard[]
  totalSpent: number  // in anima
  newBalance: number
}

// ─── Rarity meta ──────────────────────────────────────────────────────────────
export interface RarityMeta {
  label: string
  glyph: string
  color: string      // Tailwind text color class
  border: string     // Tailwind border class
  shadow: string     // CSS box-shadow (inline style)
  foil: 'none' | 'shimmer' | 'gold' | 'silver' | 'prismatic' | 'holographic'
  order: number      // for sorting (lower = more common)
}

export const RARITY_META: Record<CardRarity, RarityMeta> = {
  whisper: {
    label: 'Whisper', glyph: '◌',
    color: 'text-parchment-muted', border: 'border-parchment-muted/30',
    shadow: 'none', foil: 'none', order: 1,
  },
  remnant: {
    label: 'Remnant', glyph: '◎',
    color: 'text-parchment', border: 'border-parchment/40',
    shadow: 'none', foil: 'shimmer', order: 2,
  },
  manifestation: {
    label: 'Manifestation', glyph: '◈',
    color: 'text-gold', border: 'border-gold/50',
    shadow: '0 0 18px rgba(200,168,75,0.35)', foil: 'gold', order: 3,
  },
  awakened: {
    label: 'Awakened', glyph: '✦',
    color: 'text-[#C8D8E4]', border: 'border-[#B8C6D0]/60',
    shadow: '0 0 22px rgba(184,198,208,0.3)', foil: 'silver', order: 4,
  },
  ephemeral: {
    label: 'Ephemeral', glyph: '◇',
    color: 'text-violet-300', border: 'border-violet-400/70',
    shadow: '0 0 25px rgba(167,139,250,0.4)', foil: 'prismatic', order: 5,
  },
  void_touched: {
    label: 'Void-Touched', glyph: '⬡',
    color: 'text-purple-300', border: 'border-purple-500/80',
    shadow: '0 0 35px rgba(168,85,247,0.5), 0 0 60px rgba(139,92,246,0.2)', foil: 'holographic', order: 6,
  },
}

export const GRADE_META: Record<CardGrade, { label: string; color: string }> = {
  mint:      { label: 'Mint',      color: 'text-emerald-400' },
  near_mint: { label: 'NM',        color: 'text-parchment-muted' },
  weathered: { label: 'Weathered', color: 'text-amber-700' },
  cursed:    { label: 'Cursed',    color: 'text-crimson' },
}
