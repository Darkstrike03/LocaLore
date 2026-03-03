import { useRef, useCallback, useState } from 'react'
import type { UserCard } from '../../types/cards'
import { RARITY_META, GRADE_META } from '../../types/cards'

// ─── Size presets ──────────────────────────────────────────────────────────────
const SIZE = {
  sm: { w: 'w-[155px]', h: 'h-[217px]', text: 'text-[8.5px]', name: 'text-[11px]', img: 112 },
  md: { w: 'w-[200px]', h: 'h-[280px]', text: 'text-[10px]',  name: 'text-[13px]', img: 148 },
  lg: { w: 'w-[240px]', h: 'h-[336px]', text: 'text-[10px]',  name: 'text-[14px]', img: 175 },
} as const

// Creature type → display glyph for placeholder art
const TYPE_GLYPH: Record<string, string> = {
  spirit:         '👁',
  demon:          '🔥',
  trickster:      '🃏',
  water_creature: '🌊',
  shapeshifter:   '🌑',
  undead:         '💀',
  other:          '☽',
}

// Rarity → raw CSS color for placeholder gradient (matches RARITY_META colors)
const RARITY_GLOW: Record<string, string> = {
  whisper:        'rgba(180,170,150,0.14)',
  remnant:        'rgba(212,205,184,0.18)',
  manifestation:  'rgba(200,168,75,0.24)',
  awakened:       'rgba(184,198,208,0.24)',
  ephemeral:      'rgba(167,139,250,0.28)',
  void_touched:   'rgba(168,85,247,0.34)',
}

interface CardDisplayProps {
  card: UserCard & { definition: NonNullable<UserCard['definition']> }
  size?: keyof typeof SIZE
  interactive?: boolean   // enables 3D tilt
  showGrade?: boolean
  onClick?: () => void
  className?: string
  animDelay?: number       // ms, for staggered reveal
  expandText?: boolean     // removes line-clamp & fixed height (used for card downloads)
}

export default function CardDisplay({
  card,
  size = 'md',
  interactive = true,
  showGrade = true,
  onClick,
  className = '',
  animDelay = 0,
  expandText = false,
}: CardDisplayProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [imgError, setImgError] = useState(false)
  const { definition } = card
  // creature may be null if the join didn't resolve (e.g. orphaned card_def)
  const creature = definition.creature ?? {
    id: '', name: 'Unknown Entity', slug: '', alternate_names: [],
    region: null, country: null, locality: null, latitude: null, longitude: null,
    creature_type: 'other' as const, description: '', origin_story: null, abilities: null,
    survival_tips: null, image_url: null, model_url: null, verified: false,
    danger_rating: null, source: 'ai_collected' as const, submitted_by: null,
    created_at: '', updated_at: '',
  }
  const rarity = RARITY_META[definition.rarity]
  const grade  = GRADE_META[card.grade]
  const sz     = SIZE[size]

 

  // ── 3D tilt on mouse move ──────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width   // 0..1
    const y = (e.clientY - rect.top)  / rect.height  // 0..1
    const rotX = (y - 0.5) * -22   // tilt up/down
    const rotY = (x - 0.5) *  22   // tilt left/right
    cardRef.current.style.setProperty('--rx', `${rotX}deg`)
    cardRef.current.style.setProperty('--ry', `${rotY}deg`)
    cardRef.current.style.setProperty('--shine-x', `${x * 100}%`)
    cardRef.current.style.setProperty('--shine-y', `${y * 100}%`)
    cardRef.current.style.setProperty('--foil-x', `${x * 100}%`)
    cardRef.current.style.setProperty('--foil-y', `${y * 100}%`)
  }, [interactive])

  const handleMouseLeave = useCallback(() => {
    if (!interactive || !cardRef.current) return
    cardRef.current.style.setProperty('--rx', '0deg')
    cardRef.current.style.setProperty('--ry', '0deg')
    cardRef.current.style.setProperty('--shine-x', '50%')
    cardRef.current.style.setProperty('--shine-y', '50%')
  }, [interactive])

  // ── Foil overlay JSX ──────────────────────────────────────────────────────
  function FoilOverlay() {
    const foilType = rarity.foil
    if (foilType === 'none') return null

    if (foilType === 'shimmer') return (
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(212,205,184,0.07) 50%, transparent 70%)', backgroundSize: '200% 200%' }}
      />
    )

    if (foilType === 'gold') return (
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(105deg, transparent 20%, rgba(200,168,75,0.14) 40%, rgba(255,230,120,0.08) 50%, rgba(200,168,75,0.14) 60%, transparent 80%)',
          backgroundSize: '300% 100%',
          animation: 'foil-sweep 2.5s linear infinite',
        }}
      />
    )

    if (foilType === 'silver') return (
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(105deg, transparent 20%, rgba(180,200,220,0.15) 40%, rgba(220,235,245,0.1) 50%, rgba(180,200,220,0.15) 60%, transparent 80%)',
          backgroundSize: '300% 100%',
          animation: 'foil-sweep 2s linear infinite',
        }}
      />
    )

    if (foilType === 'prismatic') return (
      <>
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-30 transition-opacity duration-300 mix-blend-color-dodge"
          style={{
            background: 'conic-gradient(from 0deg at var(--foil-x,50%) var(--foil-y,50%), hsl(0,80%,60%), hsl(60,80%,60%), hsl(120,80%,60%), hsl(180,80%,60%), hsl(240,80%,60%), hsl(300,80%,60%), hsl(360,80%,60%))',
            animation: 'hue-cycle 4s linear infinite',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(200,180,255,0.06) 50%, transparent 70%)', backgroundSize: '300% 100%', animation: 'foil-sweep 3s linear infinite' }}
        />
      </>
    )

    if (foilType === 'holographic') return (
      <>
        {/* Full holographic rainbow plate */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-25 transition-opacity duration-500 mix-blend-color-dodge"
          style={{
            background: 'conic-gradient(from 0deg at var(--foil-x,50%) var(--foil-y,50%), #ff0080, #ff8000, #ffff00, #00ff00, #00ffff, #0080ff, #8000ff, #ff0080)',
            filter: 'saturate(2)',
            animation: 'hue-cycle 3s linear infinite',
          }}
        />
        {/* Glitch layer */}
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] animate-void-glitch opacity-80" style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(168,85,247,0.06) 50%, transparent 55%)' }} />
      </>
    )

    return null
  }

  const isEphemeral    = definition.rarity === 'ephemeral'
  const isVoidTouched  = definition.rarity === 'void_touched'

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative select-none ${sz.w} ${expandText ? 'h-auto' : sz.h} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        animationDelay: `${animDelay}ms`,
        '--rx': '0deg',
        '--ry': '0deg',
        '--shine-x': '50%',
        '--shine-y': '50%',
        '--foil-x': '50%',
        '--foil-y': '50%',
        transform: interactive ? 'perspective(800px) rotateX(var(--rx)) rotateY(var(--ry))' : undefined,
        transition: 'transform 0.1s ease-out',
      } as React.CSSProperties}
      role={onClick ? 'button' : 'article'}
      aria-label={`${creature.name} — ${rarity.label}`}
    >
      {/* ── Card body ────────────────────────────────────────────────────── */}
      <div
        className={`
          relative ${expandText ? 'h-auto' : 'h-full'} w-full overflow-hidden rounded-lg border bg-[#080810]
          ${rarity.border}
          ${isEphemeral   ? 'animate-ephemeral-border' : ''}
          ${isVoidTouched ? 'animate-void-glitch' : ''}
        `}
        style={{ boxShadow: rarity.shadow }}
      >

        {/* ── Creature image ─────────────────────────────────────────── */}
        <div className="relative w-full overflow-hidden" style={{ height: sz.img }}>
          {creature.image_url && !imgError ? (
            <img
              src={creature.image_url}
              alt={creature.name}
              className="h-full w-full object-cover"
              draggable={false}
              onError={() => setImgError(true)}
            />
          ) : (
            /* ── Placeholder art plate ── */
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-1 relative overflow-hidden"
              style={{
                background: `radial-gradient(ellipse at 50% 60%, ${RARITY_GLOW[definition.rarity] ?? 'rgba(200,168,75,0.15)'}, #080810 80%)`,
              }}
            >
              {/* Subtle grid texture overlay */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 4px), repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 4px)',
                }}
              />
              {/* Type glyph */}
              <span
                className="select-none leading-none"
                style={{ fontSize: sz.img * 0.32, filter: 'drop-shadow(0 0 8px currentColor)', opacity: 0.55 }}
              >
                {TYPE_GLYPH[creature.creature_type] ?? '☽'}
              </span>
              {/* Faint creature name watermark */}
              <span
                className={`font-heading text-center px-1 leading-tight opacity-20 select-none ${rarity.color}`}
                style={{ fontSize: sz.img * 0.065, maxWidth: '90%' }}
              >
                {creature.name.toUpperCase()}
              </span>
            </div>
          )}
          {/* Image top overlay: serial + rarity glyph */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-1">
            <span className={`font-ui ${sz.text} rounded bg-black/60 px-1 py-0.5 ${rarity.color} leading-none`}>
              {definition.edition_size
                ? `#${String(card.serial_number).padStart(3, '0')}/${definition.edition_size}`
                : `#${card.serial_number}`}
            </span>
            <span className={`font-heading text-base leading-none drop-shadow-[0_0_4px_rgba(0,0,0,1)] ${rarity.color}`}>
              {rarity.glyph}
            </span>
          </div>
          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#080810] to-transparent" />
        </div>

        {/* ── Card info ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-0.5 px-2 py-1.5">
          {/* Name */}
          <h3 className={`font-heading ${sz.name} leading-tight text-parchment line-clamp-1`}>
            {creature.name}
          </h3>

          {/* Region + type row */}
          <div className={`flex items-center gap-1.5 font-ui ${sz.text} text-parchment-muted`}>
            <span className="truncate">{creature.region ?? creature.country ?? 'Unknown'}</span>
            <span className="opacity-30">·</span>
            <span className="capitalize shrink-0">{creature.creature_type.replace('_', ' ')}</span>
          </div>

          {/* Danger pips */}
          {creature.danger_rating != null && (
            <div className="flex gap-0.5 mt-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`rounded-sm ${i < creature.danger_rating! ? 'bg-crimson' : 'bg-app-border'}`}
                  style={{ width: 6, height: 4 }}
                />
              ))}
            </div>
          )}

          {/* Flavor text */}
          {definition.flavor_text && (
            <p className={`mt-0.5 font-body ${sz.text} text-parchment-muted italic leading-snug opacity-70 ${expandText ? '' : 'line-clamp-2'}`}>
              {definition.flavor_text}
            </p>
          )}

          {/* Bottom row: rarity label + grade */}
          <div className={`mt-auto flex items-center justify-between font-ui ${sz.text} pt-0.5`}>
            <span className={rarity.color}>{rarity.label}</span>
            {showGrade && (
              <span className={`${grade.color} opacity-70`}>{grade.label}</span>
            )}
          </div>

          {/* Event badge */}
          {definition.is_event_exclusive && (
            <div className={`absolute bottom-1.5 right-1.5 font-ui ${sz.text} rounded bg-violet-900/60 px-1 py-0.5 text-violet-300 leading-none`}>
              Event
            </div>
          )}
        </div>

        {/* ── Foil / shine overlays (on top of everything) ──────────── */}
        <FoilOverlay />

        {/* Shine sweep following cursor */}
        {interactive && (
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              background: 'radial-gradient(circle at var(--shine-x) var(--shine-y), rgba(255,255,255,0.06) 0%, transparent 60%)',
            }}
          />
        )}
      </div>
    </div>
  )
}
