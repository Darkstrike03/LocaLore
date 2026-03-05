import { useMemo, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Search, SlidersHorizontal, Skull, Dices, Eye, LayoutGrid, BookMarked } from 'lucide-react'
import type { Creature, CreatureType } from '../types/creature'
import { supabase } from '../lib/supabaseClient'
import { CreatureCard } from '../components/CreatureCard'
import { getTypeConfig } from '../components/CreatureTypeIcon'
import { useSEO } from '../hooks/useSEO'

const creatureTypeOptions: { value: CreatureType | 'all'; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'spirit', label: 'Spirit' },
  { value: 'demon', label: 'Demon' },
  { value: 'trickster', label: 'Trickster' },
  { value: 'water_creature', label: 'Water creature' },
  { value: 'shapeshifter', label: 'Shapeshifter' },
  { value: 'undead', label: 'Undead' },
  { value: 'other', label: 'Other' },
]

// ─── Rotating empty-state microcopy ───────────────────────────────────────────
const SEARCH_LINES: [string, string][] = [
  ["The archive has no record of this.", "It either doesn't exist, or it does and prefers not to be found."],
  ["Nothing answers to that name.", "Some entities respond poorly to being looked up directly."],
  ["This entry does not exist.", "Which is exactly what it would want you to think."],
  ["The archive drew a blank.", "That's unusual. The archive never draws blanks voluntarily."],
  ["No match found.", "The creature you seek may be listed under a different name. Or a different dimension."],
]
const FILTER_LINES: [string, string][] = [
  ["Nothing stirs under these conditions.", "The filters may be too specific. Or the creatures too evasive."],
  ["The archive returns nothing.", "Widen the parameters. Or accept that some things resist classification."],
  ["No entities match this configuration.", "That's either reassuring or deeply suspicious."],
  ["Empty. Which is not the same as safe.", "Try loosening your search. Or accept the silence."],
]

// ─── Shelf (Stacks) view ─────────────────────────────────────────────────────
const SHELF_ORDER: CreatureType[] = ['demon', 'spirit', 'undead', 'water_creature', 'shapeshifter', 'trickster', 'other']

const SPINE_STYLES: Record<CreatureType, { bg: string; hl: string; text: string; glow: string; label: string }> = {
  spirit:         { bg: '#0c1828', hl: '#1e3a5f', text: '#93c5fd', glow: 'rgba(147,197,253,0.4)',  label: 'Spirits & Ethereal Beings'       },
  demon:          { bg: '#2a0a0a', hl: '#7f1d1d', text: '#fca5a5', glow: 'rgba(252,165,165,0.4)',  label: 'Demons & Infernal Entities'      },
  trickster:      { bg: '#261500', hl: '#78350f', text: '#fcd34d', glow: 'rgba(252,211,77,0.4)',   label: 'Tricksters & Deceiving Spirits'  },
  water_creature: { bg: '#041820', hl: '#155e75', text: '#67e8f9', glow: 'rgba(103,232,249,0.4)',  label: 'Water Creatures & Sea Horrors'   },
  shapeshifter:   { bg: '#150828', hl: '#4c1d95', text: '#c4b5fd', glow: 'rgba(196,181,253,0.4)',  label: 'Shapeshifters & Metamorphs'      },
  undead:         { bg: '#101010', hl: '#3f3f46', text: '#a1a1aa', glow: 'rgba(161,161,170,0.25)', label: 'Undead & Revenants'              },
  other:          { bg: '#181310', hl: '#44403c', text: '#c8a84b', glow: 'rgba(200,168,75,0.3)',   label: 'Unclassified Entities'           },
}

function EmptyState({
  search, hasFilters, onClear,
}: { search: string; hasFilters: boolean; onClear: () => void }) {
  const [heading, body] = useMemo(() => {
    const pool = search ? SEARCH_LINES : FILTER_LINES
    const seed = search.split('').reduce((a, c) => a + c.charCodeAt(0), 0) || Math.floor(Date.now() / 60000)
    return pool[seed % pool.length]
  }, [search])

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
      <div className="relative">
        <span className="absolute inset-0 rounded-full border border-parchment-dim/10 animate-glow-pulse" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-app-border bg-app-surface">
          {search ? (
            <Skull className="h-6 w-6 text-parchment-dim/40" />
          ) : (
            <Eye className="h-6 w-6 text-parchment-dim/40" />
          )}
        </div>
      </div>
      <div className="max-w-xs">
        <p className="font-heading text-base text-gold/70 leading-snug">{heading}</p>
        <p className="mt-1.5 font-body text-sm text-parchment-muted/70 leading-relaxed italic">{body}</p>
      </div>
      {(search || hasFilters) && (
        <button
          type="button"
          onClick={onClear}
          className="btn-ghost text-[11px] py-1.5 px-4"
        >
          Clear all filters
        </button>
      )}
    </div>
  )
}

function LibraryPage() {
  useSEO({
    title: 'Creature Library',
    description: 'Browse the full LocaLore bestiary — search, filter, and explore folklore creatures, yokai, spirits, and monsters by type, region, and danger rating.',
    url: '/library',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'LocaLore Creature Library',
      url: 'https://localore.vercel.app/library',
      description: 'A searchable bestiary of folklore creatures from around the world, filterable by type, region, verification status, and danger rating.',
      about: {
        '@type': 'Thing',
        name: 'Folklore Creatures',
        description: 'Mythological entities, spirits, demons, yokai, and local legends documented from oral traditions and written folklore worldwide.',
      },
      isPartOf: { '@type': 'WebSite', name: 'LocaLore', url: 'https://localore.vercel.app' },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'LocaLore', item: 'https://localore.vercel.app/' },
          { '@type': 'ListItem', position: 2, name: 'Library', item: 'https://localore.vercel.app/library' },
        ],
      },
    },
  })
  const [creatures, setCreatures] = useState<Creature[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('')
  const [creatureType, setCreatureType] = useState<CreatureType | 'all'>('all')
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'danger_desc' | 'danger_asc'>('newest')
  const [diceSpinning, setDiceSpinning] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'shelf'>('grid')
  const [hoveredCreature, setHoveredCreature] = useState<Creature | null>(null)
  const navigate = useNavigate()

  const handleRandom = useCallback(() => {
    if (!creatures.length) return
    setDiceSpinning(true)
    const pick = creatures[Math.floor(Math.random() * creatures.length)]
    setTimeout(() => {
      setDiceSpinning(false)
      navigate(`/creatures/${pick.slug}`)
    }, 380)
  }, [creatures, navigate])

  useEffect(() => {
    supabase
      .from('creatures')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setCreatures(data as Creature[])
        setLoading(false)
      })
  }, [])

  const regions = useMemo(
    () =>
      Array.from(new Set(creatures.map((c) => c.region).filter((r): r is string => r !== null))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [creatures],
  )

  const filtered = useMemo(
    () => {
      const base = creatures.filter((c) => {
        const matchesSearch =
          !search ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.alternate_names.some((a) =>
            a.toLowerCase().includes(search.toLowerCase()),
          )
        const matchesRegion = !region || c.region === region
        const matchesType = creatureType === 'all' || c.creature_type === creatureType
        const matchesVerified =
          verifiedFilter === 'all' ||
          (verifiedFilter === 'verified' && c.verified) ||
          (verifiedFilter === 'unverified' && !c.verified)
        return matchesSearch && matchesRegion && matchesType && matchesVerified
      })

      base.sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        if (sortBy === 'danger_desc') return (b.danger_rating ?? 0) - (a.danger_rating ?? 0)
        if (sortBy === 'danger_asc') return (a.danger_rating ?? 0) - (b.danger_rating ?? 0)
        return 0
      })

      return base
    },
    [creatures, search, region, creatureType, verifiedFilter, sortBy],
  )

  const byType = useMemo(() => {
    const map = new Map<CreatureType, Creature[]>()
    for (const type of SHELF_ORDER) map.set(type, [])
    for (const c of filtered) {
      if (!map.has(c.creature_type)) map.set(c.creature_type, [])
      map.get(c.creature_type)!.push(c)
    }
    return map
  }, [filtered])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 animate-rise">

      {/* Page header */}
      <header className="mb-8">
        <p className="section-label mb-2 flex items-center gap-1.5">
          <BookOpen className="h-3 w-3" />
          The Bestiary
        </p>
        <h1 className="font-heading text-3xl sm:text-4xl text-gold leading-none tracking-wide">
          Creature Library
        </h1>
        <p className="mt-2 font-body text-base text-parchment-muted max-w-lg leading-relaxed">
          A growing archive of folklore beings, spirits, and monsters drawn from the forgotten margins of the world.
        </p>

        {/* Stats strip */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2">
            <Skull className="h-3.5 w-3.5 text-gold" />
            <span className="font-ui text-xs text-parchment">{creatures.length} entries catalogued</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-crimson animate-pin-pulse" />
            <span className="font-ui text-xs text-parchment">{creatures.filter(c => !c.verified).length} unverified sightings</span>
          </div>

          {/* View mode toggle */}
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-app-border bg-app-surface/70 p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Card grid view"
              className={`flex items-center gap-1 rounded px-2.5 py-1.5 font-ui text-[10px] uppercase tracking-[0.15em] transition-colors ${
                viewMode === 'grid' ? 'bg-gold/15 text-gold' : 'text-parchment-muted hover:text-parchment'
              }`}
            >
              <LayoutGrid className="h-3 w-3" />
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('shelf')}
              title="The Stacks — library shelf view"
              className={`flex items-center gap-1 rounded px-2.5 py-1.5 font-ui text-[10px] uppercase tracking-[0.15em] transition-colors ${
                viewMode === 'shelf' ? 'bg-gold/15 text-gold' : 'text-parchment-muted hover:text-parchment'
              }`}
            >
              <BookMarked className="h-3 w-3" />
              The Stacks
            </button>
          </div>

          <button
            type="button"
            onClick={handleRandom}
            disabled={loading || creatures.length === 0}
            title="Conjure a random entry from the archive"
            className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 px-4 py-2 font-ui text-[11px] uppercase tracking-[0.25em] text-gold/80 transition-all hover:border-gold/60 hover:bg-gold/10 hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Dices
              className={`h-3.5 w-3.5 transition-transform duration-300 ${diceSpinning ? 'rotate-180 scale-125' : ''}`}
            />
            Conjure random entry
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-app-border bg-app-surface p-4 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-center gap-2 text-parchment-muted shrink-0">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="font-ui text-[10px] uppercase tracking-[0.25em]">Filter</span>
        </div>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-parchment-dim" />
          <input
            type="search"
            aria-label="Search creatures"
            placeholder="Search by name or alias..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-forge pl-9 text-sm"
          />
        </div>
        <select
          aria-label="Filter by region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="input-forge text-sm sm:w-40"
        >
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r ?? ''}>{r}</option>
          ))}
        </select>
        <select
          aria-label="Filter by creature type"
          value={creatureType}
          onChange={(e) => setCreatureType(e.target.value as CreatureType | 'all')}
          className="input-forge text-sm sm:w-40"
        >
          {creatureTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          aria-label="Filter by verification status"
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value as 'all' | 'verified' | 'unverified')}
          className="input-forge text-sm sm:w-36"
        >
          <option value="all">All status</option>
          <option value="verified">Verified only</option>
          <option value="unverified">Unverified</option>
        </select>
        <select
          aria-label="Sort by"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'danger_desc' | 'danger_asc')}
          className="input-forge text-sm sm:w-40"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="danger_desc">Danger ↓ highest</option>
          <option value="danger_asc">Danger ↑ lowest</option>
        </select>
      </div>

      {/* Creature list — grid or shelf */}
      <section aria-label="Creature list">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-xl border border-app-border bg-app-surface" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            search={search}
            hasFilters={region !== '' || creatureType !== 'all' || verifiedFilter !== 'all'}
            onClear={() => { setSearch(''); setRegion(''); setCreatureType('all'); setVerifiedFilter('all') }}
          />
        ) : viewMode === 'grid' ? (
          <>
            <p className="mb-4 font-ui text-[11px] text-parchment-muted">
              {filtered.length} {filtered.length === 1 ? 'entity' : 'entities'} found
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((c) => (
                <CreatureCard key={c.id} creature={c} />
              ))}
            </div>
          </>
        ) : (
          /* ── THE STACKS — full-bleed dark room ──────────────────────────── */
          <div
            className="relative"
            style={{
              marginLeft: 'calc(-50vw + 50%)',
              marginRight: 'calc(-50vw + 50%)',
              marginBottom: '-2rem',
              width: '100vw',
              background: '#030201',
            }}
          >
            {/* ── Atmospheric lighting ──────────────────────────────────────── */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {/* Single overhead lamp — warm amber */}
              <div
                className="absolute left-1/2 -translate-x-1/2 top-0"
                style={{
                  width: '900px',
                  height: '700px',
                  background: 'radial-gradient(ellipse at top, rgba(190,110,10,0.22) 0%, rgba(140,60,5,0.08) 45%, transparent 75%)',
                }}
              />
              {/* Edge vignette — darkness eating the walls */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'radial-gradient(ellipse 85% 75% at 50% 15%, transparent 20%, rgba(0,0,0,0.88) 100%)',
                  pointerEvents: 'none',
                }}
              />
              {/* Side column shadows */}
              <div className="absolute inset-y-0 left-0 w-24" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.7), transparent)' }} />
              <div className="absolute inset-y-0 right-0 w-24" style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.7), transparent)' }} />
            </div>

            <div className="relative z-10">
              {/* ── SVG texture filter defs — zero deps, pure browser feTurbulence ── */}
              <svg className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
                <defs>
                  {/* DEMON — cracked reptile hide / deep scales */}
                  <filter id="spine-tex-demon" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
                    <feTurbulence type="turbulence" baseFrequency="0.055 0.04" numOctaves="4" seed="3" result="n"/>
                    <feColorMatrix type="saturate" values="0" in="n" result="g"/>
                    <feComponentTransfer in="g">
                      <feFuncR type="linear" slope="2.8" intercept="-0.9"/>
                      <feFuncG type="linear" slope="2.8" intercept="-0.9"/>
                      <feFuncB type="linear" slope="2.8" intercept="-0.9"/>
                    </feComponentTransfer>
                  </filter>
                  {/* SPIRIT — silky ethereal shimmer */}
                  <filter id="spine-tex-spirit" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
                    <feTurbulence type="fractalNoise" baseFrequency="0.018 0.012" numOctaves="2" seed="8" result="n"/>
                    <feColorMatrix type="saturate" values="0" in="n" result="g"/>
                    <feComponentTransfer in="g">
                      <feFuncR type="linear" slope="1.8" intercept="-0.4"/>
                      <feFuncG type="linear" slope="1.8" intercept="-0.4"/>
                      <feFuncB type="linear" slope="1.8" intercept="-0.4"/>
                    </feComponentTransfer>
                  </filter>
                  {/* UNDEAD — tattered ragged cloth, horizontal striations */}
                  <filter id="spine-tex-undead" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
                    <feTurbulence type="turbulence" baseFrequency="0.16 0.025" numOctaves="5" seed="14" result="n"/>
                    <feColorMatrix type="saturate" values="0" in="n" result="g"/>
                    <feComponentTransfer in="g">
                      <feFuncR type="linear" slope="3" intercept="-1"/>
                      <feFuncG type="linear" slope="3" intercept="-1"/>
                      <feFuncB type="linear" slope="3" intercept="-1"/>
                    </feComponentTransfer>
                  </filter>
                  {/* WATER_CREATURE — fish-scale ripple (vertical anisotropy) */}
                  <filter id="spine-tex-water_creature" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
                    <feTurbulence type="turbulence" baseFrequency="0.035 0.1" numOctaves="3" seed="5" result="n"/>
                    <feColorMatrix type="saturate" values="0" in="n" result="g"/>
                    <feComponentTransfer in="g">
                      <feFuncR type="linear" slope="2.2" intercept="-0.6"/>
                      <feFuncG type="linear" slope="2.2" intercept="-0.6"/>
                      <feFuncB type="linear" slope="2.2" intercept="-0.6"/>
                    </feComponentTransfer>
                  </filter>
                  {/* SHAPESHIFTER — fine woven lattice / mesh */}
                  <filter id="spine-tex-shapeshifter" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
                    <feTurbulence type="fractalNoise" baseFrequency="0.2 0.2" numOctaves="4" seed="9" result="n"/>
                    <feColorMatrix type="saturate" values="0" in="n" result="g"/>
                    <feComponentTransfer in="g">
                      <feFuncR type="linear" slope="2.2" intercept="-0.6"/>
                      <feFuncG type="linear" slope="2.2" intercept="-0.6"/>
                      <feFuncB type="linear" slope="2.2" intercept="-0.6"/>
                    </feComponentTransfer>
                  </filter>
                  {/* TRICKSTER — aged parchment, worn cloth */}
                  <filter id="spine-tex-trickster" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
                    <feTurbulence type="fractalNoise" baseFrequency="0.06 0.06" numOctaves="3" seed="11" result="n"/>
                    <feColorMatrix type="saturate" values="0" in="n" result="g"/>
                    <feComponentTransfer in="g">
                      <feFuncR type="linear" slope="1.6" intercept="-0.3"/>
                      <feFuncG type="linear" slope="1.6" intercept="-0.3"/>
                      <feFuncB type="linear" slope="1.6" intercept="-0.3"/>
                    </feComponentTransfer>
                  </filter>
                  {/* OTHER — rough stone / ancient wood grain */}
                  <filter id="spine-tex-other" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
                    <feTurbulence type="turbulence" baseFrequency="0.22 0.18" numOctaves="5" seed="2" result="n"/>
                    <feColorMatrix type="saturate" values="0" in="n" result="g"/>
                    <feComponentTransfer in="g">
                      <feFuncR type="linear" slope="2" intercept="-0.5"/>
                      <feFuncG type="linear" slope="2" intercept="-0.5"/>
                      <feFuncB type="linear" slope="2" intercept="-0.5"/>
                    </feComponentTransfer>
                  </filter>
                </defs>
              </svg>
              {/* ── Sticky manuscript catalog card ──────────────────────────── */}
              <div
                className="sticky top-14 z-20 px-6 pt-5 pb-3"
                style={{ background: 'linear-gradient(to bottom, #030201f5 60%, transparent)' }}
              >
                <div
                  className="mx-auto max-w-4xl overflow-hidden"
                  style={{
                    background: hoveredCreature ? '#0c0905' : 'transparent',
                    border: `1px solid ${hoveredCreature ? 'rgba(200,168,75,0.2)' : 'rgba(255,255,255,0.03)'}`,
                    borderRadius: '3px',
                    height: '100px',
                    boxShadow: hoveredCreature ? '0 0 60px rgba(160,90,5,0.12), inset 0 0 80px rgba(0,0,0,0.5)' : 'none',
                  }}
                >
                  {/* Ruled lines */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 26px, rgba(200,168,75,0.035) 27px)' }}
                  />
                  {/* Red margin line */}
                  <div className="pointer-events-none absolute inset-y-0 left-[52px]" style={{ width: '1px', background: 'rgba(160,30,30,0.18)' }} />

                  {hoveredCreature ? (
                    <div className="relative flex items-start gap-4 p-3 pl-4">
                      {/* Call number block */}
                      <div
                        className="flex-shrink-0 flex flex-col items-center pt-0.5"
                        style={{ width: '38px', borderRight: '1px solid rgba(160,30,30,0.15)', paddingRight: '8px' }}
                      >
                        <span className="font-ui text-[7px] uppercase tracking-[0.15em] text-parchment-dim/25 leading-none">Class</span>
                        <span className="font-ui text-[8px] text-gold/40 mt-1 leading-none">
                          {hoveredCreature.creature_type.slice(0, 3).toUpperCase()}
                        </span>
                        {hoveredCreature.danger_rating != null && (
                          <span className="font-ui text-[8px] text-red-500/45 mt-1">D{hoveredCreature.danger_rating}</span>
                        )}
                      </div>
                      {/* Thumbnail */}
                      <div
                        className="flex-shrink-0 overflow-hidden"
                        style={{ width: '52px', height: '68px', border: '1px solid rgba(200,168,75,0.1)', borderRadius: '1px' }}
                      >
                        {hoveredCreature.image_url
                          ? <img src={hoveredCreature.image_url} alt={hoveredCreature.name} className="h-full w-full object-cover opacity-75" />
                          : <div className="h-full flex items-center justify-center bg-void/50"><Eye className="h-4 w-4 text-parchment-dim/10" /></div>}
                      </div>
                      {/* Text */}
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="font-heading text-[22px] leading-none text-gold tracking-wide">{hoveredCreature.name}</p>
                        {(hoveredCreature.alternate_names?.length ?? 0) > 0 && (
                          <p className="font-ui text-[8px] italic text-parchment-dim/30 mt-0.5 leading-none">
                            also known as: {hoveredCreature.alternate_names.slice(0, 3).join(' · ')}
                          </p>
                        )}
                        <p className="font-ui text-[9px] uppercase tracking-[0.3em] text-parchment-muted/40 mt-1.5">
                          {hoveredCreature.creature_type.replace('_', ' ')}
                          {hoveredCreature.region ? ` · ${hoveredCreature.region}` : ''}
                          {hoveredCreature.country ? ` · ${hoveredCreature.country}` : ''}
                        </p>
                        {hoveredCreature.description && (
                          <p className="mt-1.5 line-clamp-2 font-body text-[11px] italic leading-relaxed text-parchment-dim/45">
                            {hoveredCreature.description}
                          </p>
                        )}
                      </div>
                      {/* Verified / unverified stamp */}
                      <div className="flex-shrink-0 self-center pr-1">
                        <span
                          className="font-ui text-[7px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-sm border"
                          style={hoveredCreature.verified
                            ? { color: 'rgba(110,210,110,0.5)', borderColor: 'rgba(110,210,110,0.15)' }
                            : { color: 'rgba(210,80,80,0.45)', borderColor: 'rgba(210,80,80,0.12)' }}
                        >
                          {hoveredCreature.verified ? 'verified' : 'unverified'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-[84px] items-center justify-center gap-2.5">
                      <BookMarked className="h-3.5 w-3.5 text-parchment-dim/10" />
                      <span className="font-ui text-[9px] uppercase tracking-[0.55em] text-parchment-dim/12">
                        draw a tome from the shelf to open its record
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Shelves ────────────────────────────────────────────────── */}
              <div className="mx-auto max-w-full px-8 pt-2 pb-20">
                {SHELF_ORDER.map(type => {
                  const books = byType.get(type) ?? []
                  if (books.length === 0) return null
                  const { Icon } = getTypeConfig(type)
                  const palette = SPINE_STYLES[type]
                  return (
                    <div key={type} className="mb-16">

                      {/* Aisle sign */}
                      <div className="mb-3 flex items-center gap-3 px-1">
                        <Icon className="h-3 w-3 flex-shrink-0" style={{ color: palette.text, opacity: 0.35 }} />
                        <span className="font-ui text-[8px] uppercase tracking-[0.6em]" style={{ color: `${palette.text}45` }}>
                          {palette.label}
                        </span>
                        <div className="h-px flex-1" style={{ background: `${palette.text}0d` }} />
                        <span className="font-ui text-[7px]" style={{ color: `${palette.text}28` }}>
                          {books.length} vol.
                        </span>
                      </div>

                      {/* Shelf backing + books */}
                      <div
                        style={{
                          background: `linear-gradient(180deg, #060402 0%, ${palette.bg}cc 100%)`,
                          padding: '32px 20px 0',
                          backgroundImage: `linear-gradient(180deg, #060402 0%, ${palette.bg}cc 100%), repeating-linear-gradient(90deg, rgba(255,220,150,0.005) 0, rgba(255,220,150,0.005) 1px, transparent 1px, transparent 28px)`,
                          boxShadow: 'inset 0 24px 48px rgba(0,0,0,0.8)',
                          overflowX: 'auto',
                          scrollbarWidth: 'none',
                        }}
                      >
                        <div className="flex items-end gap-1" style={{ minWidth: 'max-content' }}>
                          {books.map(creature => {
                            const seed   = creature.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
                            const width  = 50 + (seed % 5) * 8          // 50 | 58 | 66 | 74 | 82 px
                            const danger = Math.min(creature.danger_rating ?? 2, 5)
                            const height = 160 + danger * 18             // 160..250 px
                            const tilt   = ((seed % 9) - 4) * 0.55      // ±2.2°
                            const shade  = (seed % 4) * 6
                            return (
                              <div
                                key={creature.id}
                                style={{ width: `${width}px`, flexShrink: 0, transform: `rotate(${tilt}deg)`, transformOrigin: 'bottom center' }}
                              >
                                <button
                                  type="button"
                                  className="group relative block w-full cursor-pointer select-none outline-none"
                                  style={{ height: `${height}px` }}
                                  onMouseEnter={() => setHoveredCreature(creature)}
                                  onMouseLeave={() => setHoveredCreature(null)}
                                  onClick={() => navigate(`/creatures/${creature.slug}`)}
                                  aria-label={creature.name}
                                >
                                  {/* Spine body */}
                                  <div
                                    className="absolute inset-0 flex flex-col items-center justify-between overflow-hidden py-3 transition-[filter,box-shadow] duration-150"
                                    style={{
                                      background: `linear-gradient(175deg, hsl(${(seed % 30) + 8},28%,${9 + shade}%) 0%, ${palette.hl} 50%, hsl(${(seed % 28)},22%,${6 + shade}%) 100%)`,
                                      borderRadius: '2px 4px 0 0',
                                      boxShadow: hoveredCreature?.id === creature.id
                                        ? `inset -6px 0 14px rgba(0,0,0,0.5), inset 5px 0 3px rgba(255,255,255,0.07), inset 0 2px 0 rgba(255,255,255,0.14), 0 0 0 1px rgba(0,0,0,0.5), 0 -10px 28px ${palette.glow}, 3px 0 10px rgba(0,0,0,0.4)`
                                        : `inset -6px 0 14px rgba(0,0,0,0.7), inset 5px 0 3px rgba(255,255,255,0.04), inset 0 2px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(0,0,0,0.7), 3px 0 10px rgba(0,0,0,0.5)`,
                                      filter: hoveredCreature?.id === creature.id ? 'brightness(1.5)' : 'brightness(1)',
                                    }}
                                  >
                                    {/* Texture overlay — SVG feTurbulence, browser-native, no deps */}
                                    <svg
                                      className="pointer-events-none absolute inset-0"
                                      width="100%"
                                      height="100%"
                                      style={{ mixBlendMode: 'soft-light', opacity: 0.32 }}
                                      aria-hidden="true"
                                    >
                                      <rect width="100%" height="100%" filter={`url(#spine-tex-${type})`} />
                                    </svg>
                                    {/* Sigil dot */}
                                    <div
                                      className="flex-shrink-0 rounded-full transition-all duration-200 group-hover:opacity-100"
                                      style={{ width: '7px', height: '7px', background: palette.text, boxShadow: `0 0 12px ${palette.glow}`, opacity: 0.45 }}
                                    />
                                    {/* Vertical title */}
                                    <span
                                      className="flex-1 min-h-0 overflow-hidden px-1 text-center font-ui leading-snug tracking-[0.06em]"
                                      style={{
                                        writingMode: 'vertical-rl',
                                        textOrientation: 'mixed',
                                        fontSize: `${width > 66 ? 10 : 9}px`,
                                        color: palette.text,
                                        opacity: 0.72,
                                        maxHeight: `${height - 56}px`,
                                      }}
                                    >
                                      {creature.name}
                                    </span>
                                    {/* Danger bar */}
                                    <div
                                      className="flex-shrink-0 rounded-full"
                                      style={{
                                        width: '20px',
                                        height: '3px',
                                        background: danger >= 3 ? palette.text : `${palette.text}15`,
                                        boxShadow: danger >= 4 ? `0 0 10px ${palette.glow}` : 'none',
                                        opacity: danger >= 3 ? 0.6 : 0.22,
                                      }}
                                    />
                                  </div>
                                  {/* Hover glow bleed down onto shelf */}
                                  <div
                                    className="pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                                    style={{
                                      width: `${width + 24}px`,
                                      height: '36px',
                                      background: `radial-gradient(ellipse, ${palette.glow} 0%, transparent 70%)`,
                                      filter: 'blur(8px)',
                                    }}
                                  />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Wooden plank */}
                      <div
                        style={{
                          height: '24px',
                          background: 'linear-gradient(180deg, #7a4e28 0%, #5c3618 45%, #3b2010 78%, #1e0d06 100%)',
                          boxShadow: '0 10px 36px rgba(0,0,0,0.95), 0 3px 8px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,200,100,0.2), inset 0 -1px 0 rgba(0,0,0,0.8)',
                          backgroundImage: 'linear-gradient(180deg, #7a4e28 0%, #5c3618 45%, #3b2010 78%, #1e0d06 100%), repeating-linear-gradient(90deg, transparent 0, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 18px)',
                        }}
                      />
                      {/* Shadow under plank */}
                      <div style={{ height: '18px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)' }} />
                    </div>
                  )
                })}

                <p className="mt-4 pb-4 text-center font-ui text-[9px] uppercase tracking-[0.55em] text-parchment-dim/15">
                  {filtered.length} {filtered.length === 1 ? 'entity' : 'entities'} held in the stacks
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default LibraryPage

