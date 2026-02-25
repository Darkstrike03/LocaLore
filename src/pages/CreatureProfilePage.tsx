import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { mockCreatures } from '../data/mockCreatures'

function CreatureProfilePage() {
  const { id } = useParams<{ id: string }>()

  const creature = useMemo(
    () => mockCreatures.find((c) => c.id === id),
    [id],
  )

  if (!creature) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-slate-300">
        This creature has not surfaced in our records yet.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="flex flex-col gap-4 border-b border-slate-800 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-gothic text-3xl font-semibold text-amber-400">
            {creature.name}
          </h1>
          {creature.alternate_names.length > 0 && (
            <p className="mt-1 text-xs text-slate-400">
              Also known as:{' '}
              <span className="italic">
                {creature.alternate_names.join(', ')}
              </span>
            </p>
          )}
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">
            {creature.region} · {creature.country}
          </p>
          <p className="mt-1 text-xs text-slate-400">{creature.locality}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1 uppercase tracking-wide">
            {creature.creature_type.replace('_', ' ')}
          </span>
          {!creature.verified && (
            <span className="rounded-full border border-amber-500/60 bg-black/70 px-3 py-1 text-amber-300">
              Unverified
            </span>
          )}
          <span className="rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1">
            Source: {creature.source === 'user_submitted' ? 'Witness account' : 'Lore scan'}
          </span>
        </div>
      </header>

      <main className="mt-6 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        <section className="space-y-4 text-sm leading-relaxed text-slate-200">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Description
            </h2>
            <p className="mt-1">{creature.description}</p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Origin Story
            </h2>
            <p className="mt-1 whitespace-pre-line">{creature.origin_story}</p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Abilities & Powers
            </h2>
            <p className="mt-1 whitespace-pre-line">{creature.abilities}</p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              How to Survive an Encounter
            </h2>
            <p className="mt-1 whitespace-pre-line">{creature.survival_tips}</p>
          </div>
        </section>

        <aside className="space-y-4 text-xs text-slate-300">
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-black/90 shadow-lg shadow-black/60">
            <div className="h-40 bg-gradient-to-br from-slate-900 via-slate-950 to-black">
              {creature.image_url ? (
                <img
                  src={creature.image_url}
                  alt={creature.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] tracking-[0.3em] text-slate-500">
                  NO TRACE CAPTURED
                </div>
              )}
            </div>
            <div className="border-t border-slate-800 px-3 py-2">
              <p className="text-[10px] text-slate-500">
                Logged at{' '}
                {new Date(creature.created_at).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              Field Notes
            </h3>
            <p className="mt-1">
              This profile will eventually be stitched from crowdsourced sightings and
              AI-collected folklore documents. Treat unverified details as rumor, not law.
            </p>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default CreatureProfilePage

