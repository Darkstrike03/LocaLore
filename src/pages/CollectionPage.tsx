import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import html2canvas from 'html2canvas'
import { useParams } from 'react-router-dom'
import { Eye, LayoutGrid, List, Tag, ArrowUpDown, Filter, Bookmark, Globe, Gavel } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { UserCard, CardRarity, CardDefinition } from '../types/cards'
import { RARITY_META } from '../types/cards'
import CardDisplay from '../components/cards/CardDisplay'
import CardDownload from '../components/cards/CardDownload'
import RarityBadge from '../components/cards/RarityBadge'
import CurrencyBadge from '../components/cards/CurrencyBadge'

type SortKey = 'acquired' | 'rarity_asc' | 'rarity_desc' | 'name'
type DisplayMode = 'grid' | 'list'

const COUNTRY_FLAGS: Record<string, string> = {
  Japan: '\uD83C\uDDEF\uD83C\uDDF5', China: '\uD83C\uDDE8\uD83C\uDDF3', Korea: '\uD83C\uDDF0\uD83C\uDDF7',
  India: '\uD83C\uDDEE\uD83C\uDDF3', Thailand: '\uD83C\uDDF9\uD83C\uDDED', Indonesia: '\uD83C\uDDEE\uD83C\uDDE9',
  Philippines: '\uD83C\uDDF5\uD83C\uDDED', Malaysia: '\uD83C\uDDF2\uD83C\uDDFE', Vietnam: '\uD83C\uDDFB\uD83C\uDDF3',
  UK: '\uD83C\uDDEC\uD83C\uDDE7', Ireland: '\uD83C\uDDEE\uD83C\uDDEA', Germany: '\uD83C\uDDE9\uD83C\uDDEA',
  France: '\uD83C\uDDEB\uD83C\uDDF7', Russia: '\uD83C\uDDF7\uD83C\uDDFA', USA: '\uD83C\uDDFA\uD83C\uDDF8',
  Mexico: '\uD83C\uDDF2\uD83C\uDDFD', Brazil: '\uD83C\uDDE7\uD83C\uDDF7', Egypt: '\uD83C\uDDEA\uD83C\uDDEC',
  Nigeria: '\uD83C\uDDF3\uD83C\uDDEC',
}
const getFlag = (country: string | null | undefined) => COUNTRY_FLAGS[country ?? ''] ?? '\uD83C\uDF10'

// ── Module-level collection cache (survives tab switches) ─────────────────────
const CARDS_CACHE = new Map<string, { data: unknown[], profileName: string, ts: number }>()
const CACHE_TTL = 3 * 60 * 1000 // 3 minutes

export default function CollectionPage() {
  const { username } = useParams<{ username?: string }>()
  const { user } = useAuth()

  // If no username param, show own collection
  const isOwn = !username

  const [cards, setCards]             = useState<(UserCard & { definition: NonNullable<UserCard['definition']> })[]>([])
  const [loading, setLoading]         = useState(true)
  const [profileName, setProfileName] = useState<string>('')
  const [rarityFilter, setRarityFilter] = useState<CardRarity | 'all'>('all')
  const [sortKey, setSortKey]          = useState<SortKey>('acquired')
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid')
  const [listingCard, setListingCard]  = useState<UserCard | null>(null)
  const [listPrice, setListPrice]      = useState('')
  const [auctionCard, setAuctionCard]  = useState<UserCard | null>(null)
  const [auctionStartBid, setAuctionStartBid] = useState('')
  const [auctionDuration, setAuctionDuration] = useState('24')
  const [auctionError, setAuctionError] = useState<string | null>(null)
  const [auctionLoading, setAuctionLoading] = useState(false)
  const [viewingCard, setViewingCard]  = useState<(UserCard & { definition: NonNullable<UserCard['definition']> }) | null>(null)
  const [viewMode, setViewMode]        = useState<'cards' | 'collections'>('cards')
  const [allDefs, setAllDefs]          = useState<CardDefinition[]>([])
  const [defsLoading, setDefsLoading]  = useState(false)
  const [cardSize, setCardSize]        = useState<'sm' | 'md'>('md')
  const cardDownloadRef                = useRef<HTMLDivElement>(null)

  // Responsive card size
  useEffect(() => {
    const check = () => setCardSize(window.innerWidth < 640 ? 'sm' : 'md')
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const targetUserId = isOwn ? user?.id : null

  const load = useCallback(async (forceRefresh = false) => {
    // ── Cache check (own collection only, module-level so survives tab switches) ─
    const cacheKey = isOwn && user ? `localore_cards_${user.id}` : null
    if (cacheKey && !forceRefresh) {
      const hit = CARDS_CACHE.get(cacheKey)
      if (hit && Date.now() - hit.ts < CACHE_TTL) {
        setCards(hit.data as (UserCard & { definition: NonNullable<UserCard['definition']> })[])
        setProfileName(hit.profileName)
        setLoading(false)
        return
      }
    }

    setLoading(true)
    let uid = targetUserId
    let resolvedName = 'Your Collection'
    if (!isOwn && username) {
      const { data: u } = await supabase.from('users').select('id, display_name, username').eq('username', username).maybeSingle()
      if (u) { uid = u.id; resolvedName = u.display_name ?? u.username ?? username; setProfileName(resolvedName) }
    } else if (isOwn && user) {
      const { data: u } = await supabase.from('users').select('display_name, username').eq('id', user.id).maybeSingle()
      resolvedName = u?.display_name ?? u?.username ?? 'Your Collection'
      setProfileName(resolvedName)
    }

    if (!uid) { setLoading(false); return }

    const { data } = await supabase
      .from('user_cards')
      .select('*, definition:card_definitions!card_def_id(*, creature:creatures!creature_id(*))')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    const fetched = (data ?? []) as (UserCard & { definition: NonNullable<UserCard['definition']> })[]
    setCards(fetched)
    // Write to cache
    if (cacheKey) CARDS_CACHE.set(cacheKey, { data: fetched, profileName: resolvedName, ts: Date.now() })
    setLoading(false)
  }, [targetUserId, isOwn, username, user])

  useEffect(() => { void load() }, [load])

  // ── Load all defs when switching to collections view ─────────────────────
  useEffect(() => {
    if (viewMode !== 'collections' || allDefs.length > 0 || defsLoading) return
    setDefsLoading(true)
    void supabase
      .from('card_definitions')
      .select('id, rarity, creature:creatures!creature_id(id, name, country, image_url)')
      .then(({ data }) => {
        setAllDefs((data ?? []) as unknown as CardDefinition[])
        setDefsLoading(false)
      })
  }, [viewMode, allDefs.length, defsLoading])

  // ── Country collections ───────────────────────────────────────────────────
  const countryCollections = useMemo(() => {
    const map = new Map<string, { owned: typeof cards; totalDefs: number }>()
    for (const card of cards) {
      const country = card.definition?.creature?.country ?? 'Unknown'
      if (!map.has(country)) map.set(country, { owned: [], totalDefs: 0 })
      map.get(country)!.owned.push(card)
    }
    for (const def of allDefs) {
      const country = (def as any).creature?.country ?? 'Unknown'
      if (!map.has(country)) map.set(country, { owned: [], totalDefs: 0 })
      map.get(country)!.totalDefs++
    }
    return Array.from(map.entries())
      .filter(([, { owned }]) => owned.length > 0)
      .map(([country, { owned, totalDefs }]) => ({
        country,
        owned,
        total: totalDefs,
        pct: totalDefs > 0 ? Math.round((owned.length / totalDefs) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct || b.owned.length - a.owned.length)
  }, [cards, allDefs])

  // ── Filtering + sorting ──────────────────────────────────────────────────
  const filtered = cards
    .filter(c => rarityFilter === 'all' || c.definition?.rarity === rarityFilter)
    .sort((a, b) => {
      if (sortKey === 'rarity_desc') return (RARITY_META[b.definition.rarity]?.order ?? 0) - (RARITY_META[a.definition.rarity]?.order ?? 0)
      if (sortKey === 'rarity_asc')  return (RARITY_META[a.definition.rarity]?.order ?? 0) - (RARITY_META[b.definition.rarity]?.order ?? 0)
      if (sortKey === 'name') return (a.definition?.creature?.name ?? '').localeCompare(b.definition?.creature?.name ?? '')
      return 0 // acquired (already sorted)
    })

  // ── Rarity breakdown ────────────────────────────────────────────────────
  const rarityCount = Object.fromEntries(
    (['whisper', 'remnant', 'manifestation', 'awakened', 'ephemeral', 'void_touched'] as CardRarity[]).map(r => [
      r, cards.filter(c => c.definition?.rarity === r).length
    ])
  ) as Record<CardRarity, number>

  // ── List for sale ──────────────────────────────────────────────────────
  async function listForSale() {
    if (!listingCard || !user) return
    const price = parseInt(listPrice, 10)
    if (!price || price <= 0) return
    await supabase.from('market_listings').insert({ seller_id: user.id, user_card_id: listingCard.id, price_anima: price })
    await supabase.from('user_cards').update({ is_listed_market: true }).eq('id', listingCard.id)
    setListingCard(null)
    setListPrice('')
    // Invalidate cache so the updated listing state is shown immediately
    if (user) CARDS_CACHE.delete(`localore_cards_${user.id}`)
    void load(true)
  }

  // ── List for auction ───────────────────────────────────────────────────
  async function listForAuction() {
    if (!auctionCard || !user) return
    const startBid = parseInt(auctionStartBid, 10)
    if (!startBid || startBid <= 0) { setAuctionError('Starting bid must be greater than 0.'); return }
    const hours = parseInt(auctionDuration, 10)
    if (!hours || hours <= 0) { setAuctionError('Invalid duration.'); return }
    setAuctionLoading(true)
    setAuctionError(null)
    const endsAt = new Date(Date.now() + hours * 3_600_000).toISOString()
    const { error } = await supabase
      .from('auction_listings')
      .insert({ seller_id: user.id, user_card_id: auctionCard.id, starting_bid_anima: startBid, ends_at: endsAt })
    if (error) { setAuctionError(error.message); setAuctionLoading(false); return }
    await supabase.from('user_cards').update({ is_listed_auction: true }).eq('id', auctionCard.id)
    setAuctionCard(null)
    setAuctionStartBid('')
    setAuctionDuration('24')
    setAuctionLoading(false)
    if (user) CARDS_CACHE.delete(`localore_cards_${user.id}`)
    void load(true)
  }

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <Eye className="h-6 w-6 text-gold animate-flicker" />
    </div>
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="font-ui text-[10px] uppercase tracking-[0.4em] text-parchment-muted mb-1">
          {isOwn ? 'My Archive' : 'Collector'}
        </p>
        <h1 className="font-heading text-3xl tracking-[0.12em] text-gold">
          {isOwn ? 'Your Collection' : (profileName || username)}
        </h1>
        <p className="mt-1 font-ui text-sm text-parchment-muted">
          {cards.length} {cards.length === 1 ? 'manifest' : 'manifests'} on record
        </p>
      </div>

      {/* ── View mode tabs ──────────────────────────────────────── */}
      <div className="mb-8 flex gap-1 rounded-lg border border-app-border bg-app-surface p-1 w-fit">
        <button
          type="button"
          onClick={() => setViewMode('cards')}
          className={`rounded px-4 py-1.5 font-ui text-[11px] uppercase tracking-[0.15em] transition-all ${
            viewMode === 'cards'
              ? 'bg-gold/15 text-gold border border-gold/30'
              : 'text-parchment-muted hover:text-parchment'
          }`}
        >
          Manifests
        </button>
        <button
          type="button"
          onClick={() => setViewMode('collections')}
          className={`flex items-center gap-1.5 rounded px-4 py-1.5 font-ui text-[11px] uppercase tracking-[0.15em] transition-all ${
            viewMode === 'collections'
              ? 'bg-gold/15 text-gold border border-gold/30'
              : 'text-parchment-muted hover:text-parchment'
          }`}
        >
          <Globe className="h-3 w-3" />
          Collections
        </button>
      </div>

      {/* ── Rarity breakdown bar ──────────────────────────────────── */}
      {viewMode === 'cards' && cards.length > 0 && (
        <div className="mb-8 rounded-xl border border-app-border bg-app-surface p-4">
          <p className="font-ui text-[10px] uppercase tracking-[0.3em] text-parchment-muted mb-3">Collection breakdown</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {(['whisper', 'remnant', 'manifestation', 'awakened', 'ephemeral', 'void_touched'] as CardRarity[]).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRarityFilter(prev => prev === r ? 'all' : r)}
                className={`rounded-lg border p-2 text-center transition-all ${
                  rarityFilter === r ? `${RARITY_META[r].border} bg-app-surfaceElevated` : 'border-app-border bg-app-surface hover:border-app-border/80'
                }`}
              >
                <div className={`font-heading text-xl ${RARITY_META[r].color}`}>{RARITY_META[r].glyph}</div>
                <div className={`font-ui text-[10px] mt-0.5 ${RARITY_META[r].color}`}>{rarityCount[r]}</div>
                <div className="font-ui text-[8px] uppercase tracking-[0.1em] text-parchment-muted mt-0.5">{RARITY_META[r].label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      {viewMode === 'cards' && (
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Rarity filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-parchment-muted" />
          <select
            value={rarityFilter}
            onChange={e => setRarityFilter(e.target.value as CardRarity | 'all')}
            className="rounded border border-app-border bg-app-surface px-2 py-1 font-ui text-[11px] text-parchment-muted focus:border-gold/40 focus:outline-none"
          >
            <option value="all">All rarities</option>
            {(['whisper', 'remnant', 'manifestation', 'awakened', 'ephemeral', 'void_touched'] as CardRarity[]).map(r => (
              <option key={r} value={r}>{RARITY_META[r].label}</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-parchment-muted" />
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="rounded border border-app-border bg-app-surface px-2 py-1 font-ui text-[11px] text-parchment-muted focus:border-gold/40 focus:outline-none"
          >
            <option value="acquired">Recently acquired</option>
            <option value="rarity_desc">Rarity (highest first)</option>
            <option value="rarity_asc">Rarity (lowest first)</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        {/* Display mode */}
        <div className="ml-auto flex gap-1">
          <button type="button" onClick={() => setDisplayMode('grid')} className={`p-1.5 rounded border ${displayMode === 'grid' ? 'border-gold/40 text-gold' : 'border-app-border text-parchment-muted'}`}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => setDisplayMode('list')} className={`p-1.5 rounded border ${displayMode === 'list' ? 'border-gold/40 text-gold' : 'border-app-border text-parchment-muted'}`}>
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {viewMode === 'cards' && cards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <Bookmark className="h-10 w-10 text-parchment-muted/30" />
          <p className="font-heading text-xl text-parchment-muted">
            {isOwn ? 'Your archive holds no manifests yet.' : 'This collector has not yet begun.'}
          </p>
          {isOwn && (
            <p className="text-sm text-parchment-muted">
              Visit <a href="/vault" className="text-gold hover:underline">The Vault</a> to open your first pack.
            </p>
          )}
        </div>
      )}

      {/* ── Grid view ────────────────────────────────────────────────────── */}
      {viewMode === 'cards' && displayMode === 'grid' && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          {filtered.map((card, i) => (
            <div key={card.id} className="relative flex justify-center">
              <CardDisplay
                card={card}
                size={cardSize}
                interactive
                animDelay={i * 50}
                className="animate-card-rise"
                onClick={() => setViewingCard(card)}
              />
              {/* Listed badge */}
              {card.is_listed_market && (
                <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-gold/20 border border-gold/30 px-1.5 py-0.5">
                  <Tag className="h-2.5 w-2.5 text-gold" />
                  <span className="font-ui text-[8px] text-gold uppercase tracking-[0.15em]">Listed</span>
                </div>
              )}
              {card.is_listed_auction && (
                <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5">
                  <Gavel className="h-2.5 w-2.5 text-amber-400" />
                  <span className="font-ui text-[8px] text-amber-400 uppercase tracking-[0.15em]">Auction</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── List view ────────────────────────────────────────────────────── */}
      {viewMode === 'cards' && displayMode === 'list' && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map(card => (
            <div
              key={card.id}
              className="flex items-center gap-4 rounded-lg border border-app-border bg-app-surface px-4 py-3 hover:border-gold/20 transition-colors cursor-pointer"
              onClick={() => setViewingCard(card)}
            >
              {/* Thumb */}
              <div className="h-12 w-9 rounded overflow-hidden shrink-0 border border-app-border">
                {card.definition?.creature?.image_url
                  ? <img src={card.definition.creature.image_url} alt="" className="h-full w-full object-cover" />
                  : <div className="h-full bg-void flex items-center justify-center"><span className="text-gold/20 text-xs">☽</span></div>
                }
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-heading text-sm text-parchment truncate">{card.definition?.creature?.name}</p>
                <p className="font-ui text-[10px] text-parchment-muted">{card.definition?.creature?.region}</p>
              </div>
              <RarityBadge rarity={card.definition?.rarity ?? 'whisper'} size="xs" />
              <span className="font-ui text-[10px] text-parchment-muted hidden sm:block">
                #{card.serial_number}
              </span>
              {isOwn && !card.is_listed_market && !card.is_listed_auction && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setListingCard(card) }}
                    className="flex items-center gap-1 rounded border border-app-border px-2 py-1 font-ui text-[10px] text-parchment-muted hover:border-gold/40 hover:text-gold transition-colors"
                  >
                    <Tag className="h-3 w-3" />
                    Sell
                  </button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setAuctionCard(card); setAuctionStartBid(''); setAuctionError(null) }}
                    className="flex items-center gap-1 rounded border border-app-border px-2 py-1 font-ui text-[10px] text-parchment-muted hover:border-amber-500/40 hover:text-amber-400 transition-colors"
                  >
                    <Gavel className="h-3 w-3" />
                    Bid
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Card view / share modal ───────────────────────────────── */}
      {viewingCard && (() => {
        const vc = viewingCard
        const creature = vc.definition?.creature
        const rarity = RARITY_META[vc.definition?.rarity ?? 'whisper']
        const creatureUrl = `${window.location.origin}/creature/${creature?.slug ?? ''}`
        const shareText = `🌑 *${creature?.name ?? 'Unknown'}* — a ${rarity.label} manifest from the LocaLore Archive.\n\nFound in ${creature?.region ?? creature?.country ?? 'unknown lands'}.\n\n"${vc.definition?.flavor_text ?? ((creature?.description?.slice(0, 120) ?? '') + '…')}"\n\n📜 View in the Archive: ${creatureUrl}\n🃏 Collect your own at: ${window.location.origin}/vault`

        async function downloadAsCard() {
          if (!cardDownloadRef.current) return
          try {
            const canvas = await html2canvas(cardDownloadRef.current, {
              backgroundColor: null,
              scale: 2,
              useCORS: true,
              logging: false,
            })
            const a = document.createElement('a')
            a.href = canvas.toDataURL('image/png')
            a.download = `${creature?.name ?? 'card'}-localore.png`
            a.click()
          } catch {
            // Fallback: download raw image if available
            const url = creature?.image_url
            if (url) window.open(url, '_blank')
          }
        }

        function shareWhatsApp() {
          window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')
        }

        async function shareNative() {
          if (navigator.share) {
            // Try to include the card image when possible (Web Share API Level 2)
            if (cardDownloadRef.current) {
              try {
                const canvas = await html2canvas(cardDownloadRef.current, {
                  backgroundColor: null,
                  scale: 2,
                  useCORS: true,
                  logging: false,
                })
                const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
                if (blob) {
                  const file = new File([blob], `${creature?.name ?? 'card'}-localore.png`, { type: 'image/png' })
                  try {
                    if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
                      await navigator.share({ files: [file], title: `${creature?.name} — LocaLore`, text: shareText })
                      return
                    }
                  } catch {
                    // fall through to URL share
                  }
                }
              } catch {
                // canvas generation failed — fall back to URL share
              }
            }

            try {
              await navigator.share({ title: `${creature?.name} — LocaLore`, text: shareText, url: creatureUrl })
              return
            } catch { /* user cancelled or platform doesn't support files */ }
          }
          shareWhatsApp()
        }

        return (
          <>
            {/* ── Off-screen card rendered for html2canvas download ── */}
            <div
              ref={cardDownloadRef}
              aria-hidden="true"
              style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none' }}
            >
              <CardDownload card={vc} />
            </div>

          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) setViewingCard(null) }}
          >
            <div className="w-full max-w-sm rounded-2xl border border-app-border bg-app-surface overflow-hidden">
              {/* Card display area */}
              <div className="flex justify-center py-6 bg-gradient-to-b from-void to-app-surface">
                <CardDisplay card={vc} size="lg" interactive showGrade />
              </div>

              {/* Info */}
              <div className="px-5 pb-5 space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-heading text-xl tracking-[0.1em] text-parchment">{creature?.name}</h2>
                      <p className="font-ui text-[10px] text-parchment-muted mt-0.5">
                        {creature?.region ?? creature?.country} · <span className={rarity.color}>{rarity.label}</span>
                        {vc.definition?.edition_size
                          ? ` · #${String(vc.serial_number).padStart(3, '0')}/${vc.definition.edition_size}`
                          : ` · #${vc.serial_number}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewingCard(null)}
                      className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full border border-app-border text-parchment-muted hover:text-parchment transition-colors"
                    >
                      ×
                    </button>
                  </div>
                  {vc.definition?.flavor_text && (
                    <p className="mt-2 font-body text-xs text-parchment-muted italic leading-relaxed">
                      “{vc.definition.flavor_text}”
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Share / WhatsApp */}
                  <button
                    type="button"
                    onClick={() => void shareNative()}
                    className="flex items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2.5 font-ui text-[11px] uppercase tracking-[0.15em] text-parchment-muted hover:border-gold/40 hover:text-gold transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Share
                  </button>

                  {/* Download card as image */}
                  <button
                    type="button"
                    onClick={() => void downloadAsCard()}
                    className="flex items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2.5 font-ui text-[11px] uppercase tracking-[0.15em] text-parchment-muted hover:border-gold/40 hover:text-gold transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                    Download
                  </button>

                  {/* List for sale (own cards only) */}
                  {isOwn && !vc.is_listed_market && !vc.is_listed_auction && (
                    <button
                      type="button"
                      onClick={() => { setViewingCard(null); setListingCard(vc) }}
                      className="flex items-center justify-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2.5 font-ui text-[11px] uppercase tracking-[0.15em] text-gold hover:bg-gold/20 transition-colors"
                    >
                      <Tag className="h-3.5 w-3.5" />
                      List for Sale
                    </button>
                  )}
                  {/* List for auction (own cards only) */}
                  {isOwn && !vc.is_listed_market && !vc.is_listed_auction && (
                    <button
                      type="button"
                      onClick={() => { setViewingCard(null); setAuctionCard(vc); setAuctionStartBid(''); setAuctionError(null) }}
                      className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-900/10 px-3 py-2.5 font-ui text-[11px] uppercase tracking-[0.15em] text-amber-400 hover:bg-amber-900/20 transition-colors"
                    >
                      <Gavel className="h-3.5 w-3.5" />
                      List for Auction
                    </button>
                  )}
                  {isOwn && vc.is_listed_market && (
                    <div className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg border border-gold/20 bg-gold/5 px-3 py-2 font-ui text-[10px] text-gold/70">
                      <Tag className="h-3 w-3" />
                      Listed on the Market
                    </div>
                  )}
                  {isOwn && vc.is_listed_auction && (
                    <div className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-900/10 px-3 py-2 font-ui text-[10px] text-amber-400/70">
                      <Gavel className="h-3 w-3" />
                      In Auction
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          </>
        )
      })()}
      {viewMode === 'collections' && (
        <div>
          {defsLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Eye className="h-6 w-6 text-gold animate-flicker" />
            </div>
          ) : countryCollections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <Globe className="h-10 w-10 text-parchment-muted/30" />
              <p className="font-heading text-xl text-parchment-muted">No regional entries yet.</p>
              <p className="text-sm text-parchment-muted">
                Open origin-specific packs from{' '}
                <a href="/vault" className="text-gold hover:underline">The Vault</a>.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {countryCollections.map(({ country, owned, total, pct }) => {
                const isComplete = pct === 100 && total > 0
                const rarities = [...new Set(
                  owned.map(c => c.definition?.rarity).filter((r): r is CardRarity => !!r)
                )]
                return (
                  <div
                    key={country}
                    className={`relative overflow-hidden rounded-xl border p-5 bg-app-surface transition-all ${
                      isComplete
                        ? 'border-gold/60 shadow-gold-glow'
                        : 'border-app-border hover:border-gold/20'
                    }`}
                  >
                    {/* Complete seal */}
                    {isComplete && (
                      <div className="absolute top-3 right-3 rounded bg-gold/20 border border-gold/40 px-1.5 py-0.5">
                        <span className="font-ui text-[8px] uppercase tracking-[0.2em] text-gold">Complete</span>
                      </div>
                    )}

                    {/* Flag + country name */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-4xl leading-none">{getFlag(country)}</span>
                      <div>
                        <h3 className="font-heading text-base tracking-[0.08em] text-parchment">{country}</h3>
                        <p className="font-ui text-[10px] text-parchment-muted mt-0.5">
                          {owned.length} / {total > 0 ? total : '?'} entries collected
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="h-1.5 rounded-full bg-app-border overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${isComplete ? 'bg-gold' : 'bg-gold/50'}`}
                          style={{ width: `${total > 0 ? pct : 0}%` }}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="flex gap-1">
                          {rarities.map(r => (
                            <span
                              key={r}
                              className={`font-heading text-sm ${RARITY_META[r].color}`}
                              title={RARITY_META[r].label}
                            >
                              {RARITY_META[r].glyph}
                            </span>
                          ))}
                        </div>
                        <span className={`font-ui text-[10px] ${isComplete ? 'text-gold' : 'text-parchment-muted'}`}>
                          {total > 0 ? `${pct}%` : `${owned.length} card${owned.length !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </div>

                    {/* Creature image strip */}
                    {owned.length > 0 && (
                      <div className="flex gap-1 mt-3 overflow-hidden">
                        {owned.slice(0, 5).map(card => (
                          <div key={card.id} className="h-10 w-8 rounded overflow-hidden shrink-0 border border-app-border/50">
                            {card.definition?.creature?.image_url
                              ? <img src={card.definition.creature.image_url} alt="" className="h-full w-full object-cover" />
                              : <div className="h-full bg-void flex items-center justify-center">
                                  <span className="text-gold/20 text-[8px]">☽</span>
                                </div>
                            }
                          </div>
                        ))}
                        {owned.length > 5 && (
                          <div className="h-10 w-8 rounded border border-app-border/50 flex items-center justify-center bg-void shrink-0">
                            <span className="font-ui text-[8px] text-parchment-muted">+{owned.length - 5}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── List for auction modal ───────────────────────────────────────── */}
      {auctionCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-amber-400/30 bg-app-surface p-6 space-y-4">
            <h3 className="font-heading text-lg text-amber-400">List for Auction</h3>
            <p className="font-body text-sm text-parchment-muted">
              Start a timed auction for{' '}
              <strong className="text-parchment">{auctionCard.definition?.creature?.name}</strong>.
              The card is locked until the auction ends.
            </p>
            <div>
              <label className="font-ui text-[10px] uppercase tracking-[0.2em] text-parchment-muted block mb-1.5">
                Starting Bid (Anima ⬡)
              </label>
              <input
                type="number"
                min="1"
                value={auctionStartBid}
                onChange={e => setAuctionStartBid(e.target.value)}
                placeholder="e.g. 100"
                className="w-full rounded border border-app-border bg-void px-3 py-2 font-ui text-sm text-parchment focus:border-amber-400/40 focus:outline-none"
              />
              {auctionStartBid && parseInt(auctionStartBid) > 0 && (
                <p className="mt-1 font-ui text-[10px] text-parchment-muted">
                  ≈ <CurrencyBadge anima={parseInt(auctionStartBid)} size="xs" />
                </p>
              )}
            </div>
            <div>
              <label className="font-ui text-[10px] uppercase tracking-[0.2em] text-parchment-muted block mb-1.5">
                Duration
              </label>
              <select
                value={auctionDuration}
                onChange={e => setAuctionDuration(e.target.value)}
                className="w-full rounded border border-app-border bg-void px-3 py-2 font-ui text-sm text-parchment focus:border-amber-400/40 focus:outline-none"
              >
                <option value="1">1 hour</option>
                <option value="6">6 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
                <option value="72">3 days</option>
                <option value="168">7 days</option>
              </select>
            </div>
            {auctionError && <p className="text-xs text-red-400">{auctionError}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => void listForAuction()}
                disabled={auctionLoading}
                className="flex-1 rounded-lg border border-amber-500/40 bg-amber-900/20 py-2 font-ui text-[11px] uppercase tracking-[0.2em] text-amber-400 hover:bg-amber-900/40 disabled:opacity-50 transition-colors"
              >
                {auctionLoading ? 'Listing...' : 'Start Auction'}
              </button>
              <button
                type="button"
                onClick={() => { setAuctionCard(null); setAuctionError(null) }}
                className="rounded-lg border border-app-border px-4 py-2 font-ui text-[11px] text-parchment-muted hover:border-parchment-muted/40 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── List for sale modal ──────────────────────────────────────────── */}
      {listingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-gold/30 bg-app-surface p-6 space-y-4">
            <h3 className="font-heading text-lg text-gold">List for Sale</h3>
            <p className="font-body text-sm text-parchment-muted">
              Set a fixed price for <strong className="text-parchment">{listingCard.definition?.creature?.name}</strong>. 
              It will be locked until sold or cancelled.
            </p>
            <div>
              <label className="font-ui text-[10px] uppercase tracking-[0.2em] text-parchment-muted block mb-1.5">
                Price (in Anima ⬡)
              </label>
              <input
                type="number"
                min="1"
                value={listPrice}
                onChange={e => setListPrice(e.target.value)}
                placeholder="e.g. 500"
                className="w-full rounded border border-app-border bg-void px-3 py-2 font-ui text-sm text-parchment focus:border-gold/40 focus:outline-none"
              />
              {listPrice && parseInt(listPrice) > 0 && (
                <p className="mt-1 font-ui text-[10px] text-parchment-muted">
                  ≈ <CurrencyBadge anima={parseInt(listPrice)} size="xs" />
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => void listForSale()}
                className="flex-1 rounded-lg border border-gold/40 bg-gold/15 py-2 font-ui text-[11px] uppercase tracking-[0.2em] text-gold hover:bg-gold/25 transition-colors"
              >
                List Card
              </button>
              <button
                type="button"
                onClick={() => setListingCard(null)}
                className="rounded-lg border border-app-border px-4 py-2 font-ui text-[11px] uppercase tracking-[0.2em] text-parchment-muted hover:border-parchment-muted/40 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
