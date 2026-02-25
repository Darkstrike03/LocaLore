import { Link } from 'react-router-dom'
import type { Creature } from '../types/creature'

interface Props {
  creature: Creature
}

export function CreatureCard({ creature }: Props) {
  return (
    <Link
      to={`/creatures/${encodeURIComponent(creature.id)}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-black/90 shadow-lg shadow-black/60 ring-1 ring-black/60 transition hover:-translate-y-1 hover:border-accent hover:shadow-amber-glow"
    >
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black">
        {creature.image_url ? (
          <img
            src={creature.image_url}
            alt={creature.name}
            className="h-full w-full object-cover opacity-90 transition duration-300 group-hover:scale-105 group-hover:opacity-100"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs tracking-[0.3em] text-slate-500">
            FOLKLORE TRACE
          </div>
        )}
        {!creature.verified && (
          <span className="absolute right-2 top-2 rounded-full border border-amber-500/40 bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
            Unverified
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-3 py-3">
        <div>
          <h3 className="font-gothic text-lg font-semibold text-amber-400 group-hover:text-amber-300">
            {creature.name}
          </h3>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            {creature.region} · {creature.country}
          </p>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-300">
          <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-2 py-0.5 uppercase tracking-wide text-[10px]">
            {creature.creature_type.replace('_', ' ')}
          </span>
        </div>
        <p className="mt-1 line-clamp-3 text-xs text-slate-300">
          {creature.description}
        </p>
      </div>
    </Link>
  )
}

