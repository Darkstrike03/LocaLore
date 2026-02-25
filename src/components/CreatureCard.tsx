import { Link } from 'react-router-dom'
import { Eye } from 'lucide-react'
import type { Creature } from '../types/creature'

interface Props {
  creature: Creature
}

export function CreatureCard({ creature }: Props) {
  return (
    <Link
      to={`/creatures/${creature.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-app-border bg-card-surface shadow-void-deep
                 transition-all duration-300
                 hover:-translate-y-1.5 hover:border-gold/40 hover:shadow-gold-glow"
      aria-label={`View ${creature.name} archive entry`}
    >
      {/* Image / placeholder */}
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-app-surfaceElevated via-app-surface to-void">
        {creature.image_url ? (
          <img
            src={creature.image_url}
            alt={creature.name}
            loading="lazy"
            className="h-full w-full object-cover opacity-70 transition-all duration-500 group-hover:opacity-90 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <Eye className="h-6 w-6 text-parchment-dim/40" />
            <span className="font-ui text-[9px] uppercase tracking-[0.4em] text-parchment-dim/30">
              No trace captured
            </span>
          </div>
        )}

        {/* Type badge */}
        <span className="absolute bottom-2 left-2 badge-rune">
          {creature.creature_type.replace('_', ' ')}
        </span>

        {/* Unverified badge */}
        {!creature.verified && (
          <span className="absolute right-2 top-2 rounded-full border border-crimson/50 bg-crimson-dark/60 px-2 py-0.5 font-ui text-[9px] uppercase tracking-widest text-crimson-DEFAULT/90 backdrop-blur-sm">
            Unverified
          </span>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent opacity-90 group-hover:opacity-70 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 px-4 py-3.5">
        <div>
          <h3 className="font-heading text-base text-gold group-hover:text-gold/90 transition-colors leading-tight">
            {creature.name}
          </h3>
          {creature.alternate_names.length > 0 && (
            <p className="mt-0.5 font-ui text-[10px] italic text-parchment-dim truncate">
              {creature.alternate_names.join(' · ')}
            </p>
          )}
          <p className="mt-1 font-ui text-[10px] uppercase tracking-[0.25em] text-parchment-muted">
            {creature.region} · {creature.country}
          </p>
        </div>
        <p className="mt-1 font-body text-[13px] leading-relaxed text-parchment/70 line-clamp-3">
          {creature.description}
        </p>

        {/* Read more hint */}
        <div className="mt-auto flex items-center gap-1 pt-2 font-ui text-[10px] uppercase tracking-[0.2em] text-parchment-dim group-hover:text-gold/60 transition-colors">
          <span>Open entry</span>
          <span className="translate-x-0 transition-transform duration-200 group-hover:translate-x-0.5">→</span>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Link>
  )
}

