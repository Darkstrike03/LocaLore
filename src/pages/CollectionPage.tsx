import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Eye, LayoutGrid, List, Tag, ArrowUpDown, Filter, Bookmark, Globe } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { UserCard, CardRarity, CardDefinition } from '../types/cards'
import { RARITY_META } from '../types/cards'
import CardDisplay from '../components/cards/CardDisplay'
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
  const [viewMode, setViewMode]        = useState<'cards' | 'collections'>('cards')
  const [allDefs, setAllDefs]          = useState<CardDefinition[]>([])
  const [defsLoading, setDefsLoading]  = useState(false)

  const targetUserId = isOwn ? user?.id : null

  const load = useCallback(async () => {
    setLoading(true)
    let uid = targetUserId
    if (!isOwn && username) {
      const { data: u } = await supabase.from('users').select('id, display_name, username').eq('username', username).maybeSingle()
      if (u) { uid = u.id; setProfileName(u.display_name ?? u.username ?? username) }
    } else if (isOwn && user) {
      const { data: u } = await supabase.from('users').select('display_name, username').eq('id', user.id).maybeSingle()
      setProfileName(u?.display_name ?? u?.username ?? 'Your Collection')
    }

    if (!uid) { setLoading(false); return }

    const { data } = await supabase
      .from('user_cards')
      .select('*, definition:card_definitions!card_def_id(*, creature:creatures!creature_id(*))')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    setCards((data ?? []) as (UserCard & { definition: NonNullable<UserCard['definition']> })[])
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
    void load()
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
        <div className="flex flex-wrap gap-4">
          {filtered.map((card, i) => (
            <div key={card.id} className="relative">
              <CardDisplay
                card={card}
                size="md"
                interactive
                animDelay={i * 50}
                className="animate-card-rise"
                onClick={() => isOwn && !card.is_listed_market && setListingCard(card)}
              />
              {/* Listed badge */}
              {card.is_listed_market && (
                <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-gold/20 border border-gold/30 px-1.5 py-0.5">
                  <Tag className="h-2.5 w-2.5 text-gold" />
                  <span className="font-ui text-[8px] text-gold uppercase tracking-[0.15em]">Listed</span>
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
            <div key={card.id} className="flex items-center gap-4 rounded-lg border border-app-border bg-app-surface px-4 py-3 hover:border-gold/20 transition-colors">
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
              {isOwn && !card.is_listed_market && (
                <button
                  type="button"
                  onClick={() => setListingCard(card)}
                  className="flex items-center gap-1 rounded border border-app-border px-2 py-1 font-ui text-[10px] text-parchment-muted hover:border-gold/40 hover:text-gold transition-colors"
                >
                  <Tag className="h-3 w-3" />
                  List
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Collections view ─────────────────────────────────────────────── */}
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
