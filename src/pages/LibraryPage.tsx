import { useMemo, useState } from 'react'
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
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="flex flex-col gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-gothic text-2xl font-semibold text-amber-400">
            Monster Library
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Browse a growing bestiary of folklore creatures, spirits, and local legends.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <input
            type="text"
            placeholder="Search by name or alias..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={creatureType}
            onChange={(e) => setCreatureType(e.target.value as CreatureType | 'all')}
            className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            {creatureTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <section className="mt-5">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400">
            Nothing stirs here yet. Try clearing filters or searching more broadly.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <CreatureCard key={c.id} creature={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default LibraryPage

