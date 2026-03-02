import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Link2, X, Plus, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { Creature } from '../types/creature'
import CreatureTypeIcon from './CreatureTypeIcon'

interface Props {
  creature: Creature
}

interface Relation { id: string; related: Creature }

export default function RelatedCreatures({ creature }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [relations, setRelations] = useState<Relation[]>([])
  const [allCreatures, setAllCreatures] = useState<Creature[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      // fetch relations in both directions
      const [{ data: a }, { data: b }] = await Promise.all([
        supabase
          .from('creature_relations')
          .select('id, related_id')
          .eq('creature_id', creature.id),
        supabase
          .from('creature_relations')
          .select('id, creature_id')
          .eq('related_id', creature.id),
      ])

      const ids = [
        ...(a || []).map(r => ({ relId: r.id, otherId: r.related_id })),
        ...(b || []).map(r => ({ relId: r.id, otherId: r.creature_id })),
      ]

      if (!ids.length || !mounted) { setRelations([]); return }

      const { data: creatureData } = await supabase
        .from('creatures')
        .select('*')
        .in('id', ids.map(i => i.otherId))

      if (!mounted) return
      const map = new Map((creatureData as Creature[]).map(c => [c.id, c]))
      setRelations(ids.map(i => ({ id: i.relId, related: map.get(i.otherId)! })).filter(r => !!r.related))
    })()
    return () => { mounted = false }
  }, [creature.id, user])

  async function unlink(relId: string) {
    await supabase.from('creature_relations').delete().eq('id', relId)
    setRelations(prev => prev.filter(r => r.id !== relId))
  }

  async function link(other: Creature) {
    const { data, error } = await supabase
      .from('creature_relations')
      .insert({ creature_id: creature.id, related_id: other.id, created_by: user?.id })
      .select()
      .maybeSingle()
    if (!error && data) {
      setRelations(prev => [...prev, { id: (data as any).id, related: other }])
    }
    setShowPicker(false)
    setPickerSearch('')
  }

  async function openPicker() {
    const { data } = await supabase.from('creatures').select('*').neq('id', creature.id)
    setAllCreatures((data as Creature[]) || [])
    setShowPicker(true)
  }

  const filtered = allCreatures.filter(c =>
    !relations.some(r => r.related.id === c.id) &&
    c.name.toLowerCase().includes(pickerSearch.toLowerCase()),
  )

  // show section if user is logged in (can add) or if there are existing relations
  if (!user && relations.length === 0) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-ui text-[11px] font-medium uppercase tracking-[0.3em] text-parchment-muted">
          <Link2 className="h-3.5 w-3.5 text-gold/60" />
          Cross-References
        </h2>
        {user && (
          <button
            type="button"
            onClick={openPicker}
            className="flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/5 px-2.5 py-1 font-ui text-[10px] text-gold hover:bg-gold/10 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Link creature
          </button>
        )}
      </div>

      {user && relations.length === 0 && (
        <div className="rounded-xl border border-dashed border-app-border px-4 py-5 text-center">
          <Link2 className="mx-auto h-5 w-5 text-parchment-dim/30 mb-2" />
          <p className="font-ui text-[11px] text-parchment-dim">No cross-references yet.</p>
          <p className="font-ui text-[10px] text-parchment-dim/60 mt-0.5">
            e.g. Popobawa → Vampire (both blood-drinking entities)
          </p>
          <button
            type="button"
            onClick={openPicker}
            className="mt-3 btn-ghost text-[10px]"
          >
            + Add first cross-reference
          </button>
        </div>
      )}

      {relations.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {relations.map(({ id, related }) => (
            <div key={id} className="relative group">
              <Link
                to={`/creatures/${related.slug}`}
                className="flex flex-col gap-1.5 rounded-xl border border-app-border bg-app-surface p-3 hover:border-gold/30 transition-colors"
              >
                <div className="h-14 w-full overflow-hidden rounded-lg">
                  {related.image_url ? (
                    <img src={related.image_url} alt={related.name} className="h-full w-full object-cover opacity-80" />
                  ) : (
                    <CreatureTypeIcon type={related.creature_type} size="h-6 w-6" />
                  )}
                </div>
                <span className="font-ui text-[11px] text-parchment leading-tight">{related.name}</span>
                <span className="font-ui text-[9px] uppercase tracking-[0.2em] text-parchment-dim">{related.creature_type.replace('_', ' ')}</span>
              </Link>
              {user && (
                <button
                  type="button"
                  onClick={() => unlink(id)}
                  title="Remove cross-reference"
                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 flex h-5 w-5 items-center justify-center rounded-full bg-crimson-dark border border-crimson/50 text-crimson transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-void/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-app-border bg-void p-5 shadow-void-deep space-y-3 animate-rise">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-base text-gold">Cross-reference a creature</h3>
                <p className="font-ui text-[10px] text-parchment-dim mt-0.5">Link creatures that share traits, origin, or lore</p>
              </div>
              <button type="button" onClick={() => setShowPicker(false)} className="text-parchment-muted hover:text-crimson"><X className="h-4 w-4" /></button>
            </div>
            <input
              type="search"
              placeholder="Search by name..."
              value={pickerSearch}
              onChange={e => setPickerSearch(e.target.value)}
              className="input-forge text-sm"
              autoFocus
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filtered.map(c => (
                <div
                  key={c.id}
                  className="flex w-full items-center gap-3 rounded-lg border border-app-border px-3 py-2 hover:border-gold/30 hover:bg-app-surface transition-colors"
                >
                  <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg">
                    {c.image_url ? (
                      <img src={c.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <CreatureTypeIcon type={c.creature_type} size="h-4 w-4" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => link(c)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="font-ui text-xs text-parchment truncate">{c.name}</p>
                    <p className="font-ui text-[10px] text-parchment-dim">{c.region} · {c.creature_type.replace('_', ' ')}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowPicker(false); navigate(`/creatures/${c.slug}`) }}
                    title="View creature profile"
                    className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded text-parchment-dim/50 hover:text-gold transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-center font-body text-sm text-parchment-dim py-4">Nothing found.</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
