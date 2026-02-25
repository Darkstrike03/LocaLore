import { useMemo, useState } from 'react'
import { BookOpen, Search, SlidersHorizontal, Skull } from 'lucide-react'
import type { CreatureType } from '../types/creature'
import { mockCreatures } from '../data/mockCreatures'
import { CreatureCard } from '../components/CreatureCard'

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

function LibraryPage() {
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('')
  const [creatureType, setCreatureType] = useState<CreatureType | 'all'>('all')

  const regions = useMemo(
    () =>
      Array.from(new Set(mockCreatures.map((c) => c.region))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [],
  )

  const filtered = useMemo(
    () =>
      mockCreatures.filter((c) => {
        const matchesSearch =
          !search ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.alternate_names.some((a) =>
            a.toLowerCase().includes(search.toLowerCase()),
          )
        const matchesRegion = !region || c.region === region
        const matchesType = creatureType === 'all' || c.creature_type === creatureType
        return matchesSearch && matchesRegion && matchesType
      }),
    [search, region, creatureType],
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
        <div className="mt-5 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2">
            <Skull className="h-3.5 w-3.5 text-gold" />
            <span className="font-ui text-xs text-parchment">{mockCreatures.length} entries catalogued</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-crimson animate-pin-pulse" />
            <span className="font-ui text-xs text-parchment">{mockCreatures.filter(c => !c.verified).length} unverified sightings</span>
          </div>
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
            <option key={r} value={r}>{r}</option>
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
      </div>

      {/* Grid */}
      <section aria-label="Creature list">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <Skull className="h-8 w-8 text-parchment-dim" />
            <p className="font-heading text-base text-gold/70">
              Nothing stirs in the dark.
            </p>
            <p className="font-body text-sm text-parchment-muted">
              Try clearing your filters or casting a wider search.
            </p>
          </div>
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

