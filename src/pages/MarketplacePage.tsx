import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Tag, Search, SlidersHorizontal, ShoppingCart, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { MarketListing, CardRarity } from '../types/cards'
import { RARITY_META } from '../types/cards'
import CardDisplay from '../components/cards/CardDisplay'
import CurrencyBadge from '../components/cards/CurrencyBadge'
import RarityBadge from '../components/cards/RarityBadge'
import { useSEO } from '../hooks/useSEO'

function useVisible(ref: React.RefObject<Element | null>) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.25 })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [ref])
  return visible
}

export default function MarketplacePage() {
  useSEO({
    title: 'Creature Card Marketplace',
    description: 'Buy and sell rare folklore creature cards in the LocaLore marketplace. Browse listings by rarity and trade with the community using Anima currency.',
    url: '/market',
  })
  const { user } = useAuth()
  const [listings, setListings]   = useState<MarketListing[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [rarityFilter, setRarity] = useState<CardRarity | 'all'>('all')
  const [buying, setBuying]       = useState<MarketListing | null>(null)
  const [buyLoading, setBuyLoad]  = useState(false)
  const [buyError, setBuyError]   = useState<string | null>(null)
  const [balance, setBalance]     = useState(0)

  const s2Ref = useRef<HTMLElement>(null)
  const s3Ref = useRef<HTMLElement>(null)
  const s2Vis = useVisible(s2Ref as React.RefObject<Element>)
  const s3Vis = useVisible(s3Ref as React.RefObject<Element>)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data }, { data: u }] = await Promise.all([
        supabase.from('market_listings')
          .select('*, user_card:user_cards(*, definition:card_definitions(*, creature:creatures(*)))')
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        user ? supabase.from('users').select('anima_balance').eq('id', user.id).maybeSingle() : { data: null },
      ])
      setListings((data ?? []) as MarketListing[])
      setBalance(u?.anima_balance ?? 0)
      setLoading(false)
    }
    void load()
  }, [user])

  const featured = listings.slice(0, 3)
  const filtered = listings.filter(l => {
    const name = l.user_card?.definition?.creature?.name?.toLowerCase() ?? ''
    if (search && !name.includes(search.toLowerCase())) return false
    if (rarityFilter !== 'all' && l.user_card?.definition?.rarity !== rarityFilter) return false
    return true
  })

  async function buyNow(listing: MarketListing) {
    if (!user) return
    setBuyLoad(true)
    setBuyError(null)
    if (balance < listing.price_anima) {
      setBuyError('Insufficient anima. Visit The Vault to learn how to earn more.')
      setBuyLoad(false)
      return
    }
    // Transfer card
    const newBalance = balance - listing.price_anima
    await supabase.from('user_cards').update({ user_id: user.id, acquired_via: 'market', is_listed_market: false }).eq('id', listing.user_card_id)
    await supabase.from('market_listings').update({ status: 'sold', buyer_id: user.id, sold_at: new Date().toISOString() }).eq('id', listing.id)
    await supabase.from('users').update({ anima_balance: newBalance }).eq('id', user.id)
    // Credit seller
    if (listing.seller_id) {
      await supabase.rpc('increment_anima', { uid: listing.seller_id, amount: listing.price_anima }).then(() => null)
    }
    await supabase.from('anima_ledger').insert({ user_id: user.id, amount: -listing.price_anima, balance_after: newBalance, reason: `Purchased: ${listing.user_card?.definition?.creature?.name}`, reference_id: listing.id })
    setBalance(newBalance)
    setBuying(null)
    setListings(prev => prev.filter(l => l.id !== listing.id))
    setBuyLoad(false)
  }

  return (
    <div
      className="h-[calc(100dvh-theme(spacing.14))] overflow-y-auto"
      style={{ scrollSnapType: 'y mandatory', scrollBehavior: 'smooth' }}
    >

      {/* ── Scene 1 — Vault Floor ───────────────────────────────────────── */}
      <section
        className="relative flex h-[100dvh] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-void via-app-background to-app-surface"
        style={{ scrollSnapAlign: 'start' }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(200,168,75,0.5) 0, rgba(200,168,75,0.5) 1px, transparent 0, transparent 50%)', backgroundSize: '24px 24px' }} />
        <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-gold/20 animate-glow-pulse" />
            <Tag className="h-7 w-7 text-gold" />
          </div>
          <div>
            <p className="font-ui text-[10px] uppercase tracking-[0.5em] text-parchment-muted mb-2">Archive Exchange</p>
            <h1 className="font-heading text-5xl sm:text-6xl tracking-[0.1em] text-gold drop-shadow-gold">Marketplace</h1>
            <p className="mt-4 font-body text-lg text-parchment-muted max-w-md mx-auto leading-relaxed">
              Fixed-price manifests, set by collectors. The archive takes no commission.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-ui text-[10px] uppercase tracking-[0.3em] text-parchment-muted">
              {listings.length} listing{listings.length !== 1 ? 's' : ''} active
            </span>
          </div>
          <p className="font-ui text-[9px] uppercase tracking-[0.3em] text-parchment-muted/40 animate-bounce mt-4">
            Scroll to browse
          </p>
        </div>
      </section>

      {/* ── Scene 2 — Featured ─────────────────────────────────────────── */}
      <section
        ref={s2Ref}
        className="relative flex h-[100dvh] flex-col items-center justify-center overflow-hidden bg-app-surface"
        style={{ scrollSnapAlign: 'start' }}
      >
        <div className={`relative z-10 w-full max-w-4xl px-6 transition-all duration-700 ${s2Vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-8">
            <p className="font-ui text-[10px] uppercase tracking-[0.4em] text-parchment-muted mb-2">Spotlit</p>
            <h2 className="font-heading text-3xl tracking-[0.12em] text-gold">Featured Listings</h2>
          </div>
          {featured.length === 0 ? (
            <p className="text-center font-body text-parchment-muted py-8">No active listings yet. Be the first to offer a manifest.</p>
          ) : (
            <div className="flex flex-wrap justify-center gap-6">
              {featured.map(listing => listing.user_card?.definition && (
                <div key={listing.id} className="flex flex-col items-center gap-3">
                  <CardDisplay card={listing.user_card as never} size="lg" interactive />
                  <div className="flex items-center gap-2">
                    <CurrencyBadge anima={listing.price_anima} size="sm" />
                    <button
                      type="button"
                      onClick={() => setBuying(listing)}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-900/20 px-3 py-1.5 font-ui text-[11px] uppercase tracking-[0.2em] text-emerald-400 hover:bg-emerald-900/40 transition-colors"
                    >
                      <ShoppingCart className="h-3 w-3" />
                      Buy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Scene 3 — Full listing grid ─────────────────────────────────── */}
      <section
        ref={s3Ref}
        className="min-h-[100dvh] bg-app-background px-4 py-12 sm:px-6"
        style={{ scrollSnapAlign: 'start' }}
      >
        <div className={`mx-auto max-w-7xl transition-all duration-700 ${s3Vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-parchment-muted" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search manifests..."
                className="w-full rounded-lg border border-app-border bg-app-surface pl-9 pr-4 py-2 font-ui text-sm text-parchment placeholder:text-parchment-muted/50 focus:border-gold/40 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-parchment-muted" />
              <select
                value={rarityFilter}
                onChange={e => setRarity(e.target.value as CardRarity | 'all')}
                className="rounded border border-app-border bg-app-surface px-2 py-1.5 font-ui text-[11px] text-parchment-muted focus:border-gold/40 focus:outline-none"
              >
                <option value="all">All rarities</option>
                {(['whisper', 'remnant', 'manifestation', 'awakened', 'ephemeral', 'void_touched'] as CardRarity[]).map(r => (
                  <option key={r} value={r}>{RARITY_META[r].label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex justify-center py-20"><Eye className="h-6 w-6 text-gold animate-flicker" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <p className="font-heading text-xl text-parchment-muted">The floor is bare.</p>
              <Link to="/collection" className="text-sm text-gold hover:underline">List a manifest from your collection →</Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filtered.map(listing => listing.user_card?.definition && (
                <div key={listing.id} className="group rounded-xl border border-app-border bg-app-surface p-4 hover:border-gold/25 transition-all">
                  <div className="flex justify-center mb-4">
                    <CardDisplay card={listing.user_card as never} size="sm" interactive={false} />
                  </div>
                  <div className="space-y-2">
                    <p className="font-heading text-sm text-parchment line-clamp-1">{listing.user_card.definition.creature?.name}</p>
                    <div className="flex items-center justify-between">
                      <RarityBadge rarity={listing.user_card.definition.rarity} size="xs" />
                      <CurrencyBadge anima={listing.price_anima} size="xs" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setBuying(listing)}
                      className="w-full rounded-lg border border-emerald-500/30 py-1.5 font-ui text-[10px] uppercase tracking-[0.2em] text-emerald-400 hover:border-emerald-400/60 hover:bg-emerald-900/20 transition-colors"
                    >
                      Purchase
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Buy confirm modal ────────────────────────────────────────────── */}
      {buying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-gold/30 bg-app-surface p-6 space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="font-heading text-lg text-gold">Confirm Purchase</h3>
              <button type="button" onClick={() => setBuying(null)} className="text-parchment-muted hover:text-parchment"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-3">
              {buying.user_card?.definition && <CardDisplay card={buying.user_card as never} size="sm" interactive={false} />}
              <div className="space-y-1">
                <p className="font-heading text-sm text-parchment">{buying.user_card?.definition?.creature?.name}</p>
                <RarityBadge rarity={buying.user_card?.definition?.rarity ?? 'whisper'} size="xs" />
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="font-ui text-[10px] text-parchment-muted">Cost:</span>
                  <CurrencyBadge anima={buying.price_anima} size="xs" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-ui text-[10px] text-parchment-muted">Balance:</span>
                  <CurrencyBadge anima={balance} size="xs" />
                </div>
              </div>
            </div>
            {buyError && <p className="text-xs text-crimson">{buyError}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => void buyNow(buying)}
                disabled={buyLoading}
                className="flex-1 rounded-lg border border-emerald-500/40 bg-emerald-900/20 py-2 font-ui text-[11px] uppercase tracking-[0.2em] text-emerald-400 hover:bg-emerald-900/40 disabled:opacity-50 transition-colors"
              >
                {buyLoading ? 'Processing...' : 'Confirm Purchase'}
              </button>
              <button type="button" onClick={() => setBuying(null)} className="rounded-lg border border-app-border px-4 py-2 font-ui text-[11px] text-parchment-muted hover:border-parchment-muted/40 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
