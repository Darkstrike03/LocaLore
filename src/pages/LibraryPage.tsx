import { useMemo, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Search, SlidersHorizontal, Skull, Dices, Eye } from 'lucide-react'
import type { Creature, CreatureType } from '../types/creature'
import { supabase } from '../lib/supabaseClient'
import { CreatureCard } from '../components/CreatureCard'
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

          <button
            type="button"
            onClick={handleRandom}
            disabled={loading || creatures.length === 0}
            title="Conjure a random entry from the archive"
            className="ml-auto flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 px-4 py-2 font-ui text-[11px] uppercase tracking-[0.25em] text-gold/80 transition-all hover:border-gold/60 hover:bg-gold/10 hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
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

      {/* Grid */}
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
        ) : (
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
        )}
      </section>
    </div>
  )
}

export default LibraryPage

