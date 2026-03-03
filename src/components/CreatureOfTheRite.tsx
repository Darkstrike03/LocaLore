import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Eye, ChevronRight, Flame, Skull, ShieldAlert } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { Creature } from '../types/creature'

// ─── Deterministic daily seed (UTC day since epoch) ───────────────────────────
function getDaySeed() {
  return Math.floor(Date.now() / 86_400_000)
}

// ─── Danger pips ──────────────────────────────────────────────────────────────
function DangerPips({ rating }: { rating: number | null }) {
  if (!rating) return null
  const level = Math.min(5, Math.round(rating / 2))
  return (
    <div className="flex items-center gap-1">
      <ShieldAlert className="h-2.5 w-2.5 text-crimson/60" />
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`block h-1.5 w-1.5 rounded-full ${
              i < level ? 'bg-crimson/80' : 'bg-parchment/10'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Format today's date as "DD Mon YYYY" ─────────────────────────────────────
function todayLabel() {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).toUpperCase()
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CreatureOfTheRite() {
  const [creature, setCreature] = useState<Creature | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { count } = await supabase
        .from('creatures')
        .select('id', { count: 'exact', head: true })
      if (!count) { setLoading(false); return }

      const offset = getDaySeed() % count
      const { data } = await supabase
        .from('creatures')
        .select('*')
        .range(offset, offset)

      if (data?.[0]) setCreature(data[0] as Creature)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-app-border bg-app-surface p-4 animate-pulse">
        <div className="h-3 w-24 rounded bg-parchment/10" />
        <div className="h-6 w-40 rounded bg-parchment/10" />
        <div className="h-3 w-full rounded bg-parchment/10" />
        <div className="h-3 w-3/4 rounded bg-parchment/10" />
      </div>
    )
  }

  if (!creature) return null

  return (
    <div className="relative overflow-hidden rounded-xl border border-gold/20 bg-app-surface">

      {/* Gold top accent bar */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

      {/* Corner rune marks */}
      <span className="pointer-events-none absolute left-2 top-2 font-heading text-[7px] text-gold/20 select-none">✦</span>
      <span className="pointer-events-none absolute right-2 top-2 font-heading text-[7px] text-gold/20 select-none">✦</span>

      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gold/[0.015]" />

      <div className="relative px-4 py-4">

        {/* ── Header label ─────────────────────────────────────────────── */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Flame className="h-3 w-3 text-gold/70 animate-flicker" />
            <span className="font-ui text-[9px] uppercase tracking-[0.4em] text-gold/70">
              Creature of the Rite
            </span>
            <Flame className="h-3 w-3 text-gold/70 animate-flicker" style={{ animationDelay: '0.4s' }} />
          </div>
          <span className="font-mono text-[8px] text-parchment-dim/40">{todayLabel()}</span>
        </div>

        {/* ── Divider ──────────────────────────────────────────────────── */}
        <div className="rune-divider mb-3">
          <Eye className="h-2.5 w-2.5 text-gold/30 flex-shrink-0" />
        </div>

        {/* ── Creature image + identity ─────────────────────────────────── */}
        <div className="flex gap-3 mb-3">
          {/* Thumbnail */}
          <div className="flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-lg border border-gold/20 bg-app-background overflow-hidden">
            {creature.image_url ? (
              <img
                src={creature.image_url}
                alt={creature.name}
                className="h-full w-full object-cover opacity-80"
              />
            ) : (
              <Skull className="h-6 w-6 text-gold/40" />
            )}
          </div>

          {/* Name + meta */}
          <div className="flex flex-col justify-center min-w-0">
            <h3 className="font-heading text-lg text-gold leading-tight truncate">
              {creature.name}
            </h3>
            <p className="font-ui text-[9px] uppercase tracking-[0.2em] text-parchment-muted mt-0.5 truncate">
              {[creature.region, creature.country].filter(Boolean).join(' · ')}
            </p>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span className="badge-rune text-[8px]">
                <Skull className="h-2 w-2" />
                {creature.creature_type.replace('_', ' ')}
              </span>
              <DangerPips rating={creature.danger_rating} />
            </div>
          </div>
        </div>

        {/* ── Description excerpt ───────────────────────────────────────── */}
        {creature.description && (
          <p className="font-body text-[13px] text-parchment/65 leading-relaxed line-clamp-3 mb-3">
            {creature.description}
          </p>
        )}

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <Link
          to={`/creatures/${creature.slug}`}
          className="btn-summon w-full justify-center text-[11px] py-2"
        >
          Open the File
          <ChevronRight className="h-3 w-3" />
        </Link>

        {/* ── Footer note ──────────────────────────────────────────────── */}
        <p className="mt-2.5 text-center font-ui text-[8px] uppercase tracking-[0.3em] text-parchment-dim/30">
          Refreshes at midnight · UTC
        </p>
      </div>

      {/* Gold bottom accent bar */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
    </div>
  )
}
