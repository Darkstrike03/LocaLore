import { useState, useEffect } from 'react'
import { X, Eye } from 'lucide-react'
import type { UserCard } from '../../types/cards'
import { RARITY_META } from '../../types/cards'
import CardDisplay from './CardDisplay'

// ── Fan layout constants — tweak freely ──────────────────────────────────────
const STACK_CARD_W = 150   // px — card width inside the fan
const STACK_CARD_H = 210   // px — card height inside the fan
const OFFSET_X     = 22    // px — horizontal gap between fanned cards
const MAX_ROT_DEG  = 8     // total rotation spread across the whole fan (±half each side)
// ─────────────────────────────────────────────────────────────────────────────

interface PackOpeningModalProps {
  /** Cards to reveal (already minted server-side) */
  cards: (UserCard & { definition: NonNullable<UserCard['definition']> })[]
  packName: string
  loading?: boolean   // true while server is minting cards — shows animated loading screen
  onClose: () => void
}

export default function PackOpeningModal({ cards, packName, loading = false, onClose }: PackOpeningModalProps) {
  const [phase, setPhase]           = useState<'summoning' | 'shake' | 'burst' | 'dealing' | 'done'>(
    loading ? 'summoning' : 'shake'
  )
  const [dealtCount, setDealtCount] = useState(0)
  const [selected, setSelected]     = useState<number | null>(null)   // card index in preview

  // When loading finishes (cards arrive), transition summoning → shake
  useEffect(() => {
    if (!loading && phase === 'summoning' && cards.length > 0) {
      setPhase('shake')
    }
  }, [loading, cards.length, phase])

  // shake → burst → dealing  (each phase advances independently)
  useEffect(() => {
    if (phase !== 'shake') return
    const t = setTimeout(() => setPhase('burst'), 700)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'burst') return
    const t = setTimeout(() => setPhase('dealing'), 600)
    return () => clearTimeout(t)
  }, [phase])

  // deal cards one-by-one
  useEffect(() => {
    if (phase !== 'dealing') return
    if (dealtCount >= cards.length) { setPhase('done'); return }
    const t = setTimeout(() => setDealtCount(n => n + 1), 380)
    return () => clearTimeout(t)
  }, [phase, dealtCount, cards.length])

  // glow from highest rarity card dealt so far
  const dealtCards = cards.slice(0, dealtCount)
  const highestDealt = dealtCards.length > 0
    ? dealtCards.reduce((best, c) =>
        RARITY_META[c.definition.rarity].order > RARITY_META[best.definition.rarity].order ? c : best
      , dealtCards[0])
    : null
  const bgGlow = highestDealt ? RARITY_META[highestDealt.definition.rarity].shadow : 'none'

  // fan geometry helpers
  const n = cards.length
  const fanWidth = STACK_CARD_W + (n - 1) * OFFSET_X

  function cardRot(i: number) {
    if (n <= 1) return 0
    return -MAX_ROT_DEG / 2 + (i / (n - 1)) * MAX_ROT_DEG
  }

  // cards bow slightly — edges lower than center
  function cardYOffset(i: number) {
    if (n <= 1) return 0
    const mid = (n - 1) / 2
    return Math.abs(i - mid) * 5
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md overflow-hidden">

      {/* Close button — top right, only when done and nothing previewed */}
      {phase === 'done' && selected === null && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-app-border text-parchment-muted hover:text-parchment transition-colors z-10"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Header */}
      <div className={`mb-10 text-center transition-opacity duration-500 ${phase === 'dealing' || phase === 'done' ? 'opacity-100' : 'opacity-0'}`}>
        <p className="font-ui text-[10px] uppercase tracking-[0.35em] text-parchment-muted">Opening</p>
        <h2 className="font-heading text-2xl tracking-[0.15em] text-gold mt-1">{packName}</h2>
        {phase === 'dealing' && (
          <p className="mt-1 font-ui text-[10px] text-parchment-muted tabular-nums">
            {dealtCount} / {cards.length}
          </p>
        )}
        {phase === 'done' && (
          <p className="mt-1 font-ui text-[10px] text-parchment-muted">
            Tap a card to inspect it
          </p>
        )}
      </div>

      {/* ── Summoning / loading phase ───────────────────────────── */}
      {phase === 'summoning' && (
        <div className="flex flex-col items-center gap-8">
          {/* Animated logo stack */}
          <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>

            {/* Outer ring — clockwise, slow */}
            <svg
              className="absolute animate-spin"
              style={{ animationDuration: '6s', width: 180, height: 180 }}
              viewBox="0 0 180 180"
            >
              <circle cx="90" cy="90" r="84"
                fill="none" stroke="rgba(200,168,75,0.18)" strokeWidth="1"
                strokeDasharray="90 438" strokeLinecap="round"
              />
              <circle cx="90" cy="90" r="84"
                fill="none" stroke="rgba(200,168,75,0.08)" strokeWidth="1"
                strokeDasharray="20 508" strokeLinecap="round" strokeDashoffset="200"
              />
            </svg>

            {/* Mid ring — counter-clockwise */}
            <svg
              className="absolute animate-spin"
              style={{ animationDuration: '4s', animationDirection: 'reverse', width: 140, height: 140 }}
              viewBox="0 0 140 140"
            >
              <circle cx="70" cy="70" r="64"
                fill="none" stroke="rgba(200,168,75,0.35)" strokeWidth="1.5"
                strokeDasharray="60 342" strokeLinecap="round"
              />
            </svg>

            {/* Inner ring — clockwise, fast */}
            <svg
              className="absolute animate-spin"
              style={{ animationDuration: '2s', width: 96, height: 96 }}
              viewBox="0 0 96 96"
            >
              <circle cx="48" cy="48" r="42"
                fill="none" stroke="rgba(200,168,75,0.55)" strokeWidth="1.5"
                strokeDasharray="35 229" strokeLinecap="round"
              />
            </svg>

            {/* Two overlapping ☽ logos rotating in opposite directions */}
            <div className="absolute animate-spin select-none" style={{ animationDuration: '8s', fontSize: 52, color: 'rgba(200,168,75,0.65)', textShadow: '0 0 24px rgba(200,168,75,0.5)', lineHeight: 1 }}>
              👁
            </div>
            <div className="absolute animate-spin select-none" style={{ animationDuration: '5s', animationDirection: 'reverse', fontSize: 52, color: 'rgba(200,168,75,0.4)', textShadow: '0 0 16px rgba(200,168,75,0.35)', lineHeight: 1, mixBlendMode: 'screen' }}>
              👁
            </div>
          </div>

          {/* Pack name + status */}
          <div className="text-center space-y-2">
            <p className="font-ui text-[10px] uppercase tracking-[0.4em] text-parchment-muted">Unsealing</p>
            <h2 className="font-heading text-xl tracking-[0.12em] text-gold">{packName}</h2>
            <p className="font-ui text-[10px] uppercase tracking-[0.25em] text-parchment-muted/60 animate-pulse">
              Consulting the archive…
            </p>
          </div>
        </div>
      )}

      {/* ── Pack shake / burst ─────────────────────────────────── */}
      {(phase === 'shake' || phase === 'burst') && (
        <div
          className={`flex h-44 w-32 items-center justify-center rounded-xl border border-gold/30 bg-app-surface transition-all duration-300 ${
            phase === 'shake' ? 'animate-pack-shake' : 'scale-110'
          }`}
          style={{ boxShadow: phase === 'burst' ? '0 0 80px rgba(200,168,75,0.6)' : undefined }}
        >
          <Eye className={`h-12 w-12 text-gold ${phase === 'shake' ? 'animate-flicker' : 'animate-glow-pulse'}`} />
        </div>
      )}

      {/* ── Fan / deck ─────────────────────────────────────────── */}
      {(phase === 'dealing' || phase === 'done') && (
        <div
          className="relative"
          style={{
            width:  fanWidth,
            height: STACK_CARD_H + MAX_ROT_DEG * 5 + 20,
          }}
        >
          {cards.map((card, i) => {
            const dealt = i < dealtCount
            const rot   = cardRot(i)
            const yOff  = cardYOffset(i)
            const isNewest = i === dealtCount - 1

            return (
              <div
                key={card.id}
                onClick={() => dealt && setSelected(i)}
                style={{
                  position:   'absolute',
                  left:        i * OFFSET_X,
                  top:         yOff,
                  width:       STACK_CARD_W,
                  height:      STACK_CARD_H,
                  zIndex:      dealt ? 10 + i : 0,
                  transform:   dealt
                    ? `rotate(${rot}deg) translateY(0px)`
                    : `rotate(${rot}deg) translateY(80px)`,
                  opacity:    dealt ? 1 : 0,
                  transition: 'transform 0.45s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease',
                  cursor:     dealt ? 'pointer' : 'default',
                }}
              >
                {dealt ? (
                  <>
                    <div
                      className="transition-transform duration-200"
                      style={{ transform: phase === 'done' ? undefined : undefined }}
                    >
                      {/* hover lift applied via wrapper — only in done phase */}
                      <div className={phase === 'done' ? 'hover:-translate-y-3 transition-transform duration-200' : ''}>
                        <CardDisplay card={card} size="sm" interactive={false} showGrade={false} />
                      </div>
                    </div>
                    {/* Newest card glow while dealing */}
                    {isNewest && RARITY_META[card.definition.rarity].shadow !== 'none' && (
                      <div
                        className="pointer-events-none absolute inset-0 rounded-lg"
                        style={{ boxShadow: RARITY_META[card.definition.rarity].shadow, opacity: 0.9 }}
                      />
                    )}
                  </>
                ) : (
                  <div className="h-full w-full rounded-lg border border-gold/15 bg-app-surface flex items-center justify-center">
                    <Eye className="h-6 w-6 text-gold/20" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add to Collection CTA */}
      {phase === 'done' && selected === null && (
        <button
          type="button"
          onClick={onClose}
          className="mt-10 rounded-lg border border-gold/40 bg-gold/10 px-6 py-2.5 font-ui text-[11px] uppercase tracking-[0.2em] text-gold hover:bg-gold/20 transition-colors"
        >
          Add to Collection
        </button>
      )}

      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 transition-all duration-1000"
        style={{ boxShadow: `inset 0 0 140px ${bgGlow}` }}
      />

      {/* ── Card preview overlay ────────────────────────────────── */}
      {selected !== null && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative flex flex-col items-center gap-5"
            onClick={e => e.stopPropagation()}
          >
            <CardDisplay card={cards[selected]} size="lg" interactive showGrade />

            <p className={`font-ui text-[11px] uppercase tracking-[0.25em] ${RARITY_META[cards[selected].definition.rarity].color}`}>
              {RARITY_META[cards[selected].definition.rarity].label}
              {cards[selected].definition.edition_size
                ? ` · #${String(cards[selected].serial_number).padStart(3, '0')}/${cards[selected].definition.edition_size}`
                : ` · #${cards[selected].serial_number}`}
            </p>

            {/* Prev / Next arrows */}
            {cards.length > 1 && (
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setSelected(s => (s !== null && s > 0) ? s - 1 : s)}
                  disabled={selected === 0}
                  className="h-9 w-9 flex items-center justify-center rounded-full border border-app-border text-xl text-parchment-muted hover:text-parchment disabled:opacity-20 transition-colors"
                >‹</button>
                <span className="font-ui text-[10px] text-parchment-muted tabular-nums">
                  {selected + 1} / {cards.length}
                </span>
                <button
                  type="button"
                  onClick={() => setSelected(s => (s !== null && s < cards.length - 1) ? s + 1 : s)}
                  disabled={selected === cards.length - 1}
                  className="h-9 w-9 flex items-center justify-center rounded-full border border-app-border text-xl text-parchment-muted hover:text-parchment disabled:opacity-20 transition-colors"
                >›</button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="font-ui text-[10px] uppercase tracking-[0.2em] text-parchment-muted hover:text-parchment transition-colors"
            >
              ← Back to deck
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
