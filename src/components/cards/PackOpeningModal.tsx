import { useState, useEffect } from 'react'
import { X, Eye } from 'lucide-react'
import type { UserCard } from '../../types/cards'
import { RARITY_META } from '../../types/cards'
import CardDisplay from './CardDisplay'

interface PackOpeningModalProps {
  /** Cards to reveal (already minted server-side) */
  cards: (UserCard & { definition: NonNullable<UserCard['definition']> })[]
  packName: string
  onClose: () => void
}

export default function PackOpeningModal({ cards, packName, onClose }: PackOpeningModalProps) {
  // phases: 'shake' → 'burst' → 'reveal' → 'done'
  const [phase, setPhase]         = useState<'shake' | 'burst' | 'reveal' | 'done'>('shake')
  const [revealed, setRevealed]   = useState<number>(0)
  const [flipped, setFlipped]     = useState<boolean[]>(() => cards.map(() => false))

  useEffect(() => {
    // Auto-advance shake → burst
    const t1 = setTimeout(() => setPhase('burst'), 800)
    const t2 = setTimeout(() => setPhase('reveal'), 1600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  useEffect(() => {
    if (phase !== 'reveal') return
    // Stagger card flips
    cards.forEach((_, i) => {
      const t = setTimeout(() => {
        setFlipped(prev => { const n = [...prev]; n[i] = true; return n })
        setRevealed(i + 1)
      }, i * 450 + 200)
      return () => clearTimeout(t)
    })
  }, [phase, cards])

  useEffect(() => {
    if (revealed === cards.length && cards.length > 0) {
      const t = setTimeout(() => setPhase('done'), 600)
      return () => clearTimeout(t)
    }
  }, [revealed, cards.length])

  const highestRarity = cards.reduce((best, c) => {
    return RARITY_META[c.definition.rarity].order > RARITY_META[best.definition.rarity].order ? c : best
  }, cards[0])

  const bgGlow = highestRarity
    ? RARITY_META[highestRarity.definition.rarity].shadow
    : 'none'

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
      {/* Close (only after reveal done) */}
      {phase === 'done' && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-app-border text-parchment-muted hover:text-parchment transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Pack name header */}
      <div className="mb-8 text-center">
        <p className="font-ui text-[10px] uppercase tracking-[0.35em] text-parchment-muted">Opening</p>
        <h2 className="font-heading text-2xl tracking-[0.15em] text-gold mt-1">{packName}</h2>
      </div>

      {/* ── Shake phase ─────────────────────────────────────── */}
      {(phase === 'shake' || phase === 'burst') && (
        <div
          className={`flex h-40 w-28 items-center justify-center rounded-xl border border-gold/30 bg-app-surface ${
            phase === 'shake' ? 'animate-pack-shake' : ''
          }`}
          style={{ boxShadow: phase === 'burst' ? '0 0 60px rgba(200,168,75,0.5)' : undefined, transition: 'box-shadow 0.4s' }}
        >
          <Eye className={`h-10 w-10 text-gold ${phase === 'shake' ? 'animate-flicker' : 'animate-glow-pulse'}`} />
        </div>
      )}

      {/* ── Reveal phase ────────────────────────────────────── */}
      {(phase === 'reveal' || phase === 'done') && (
        <div
          className="flex flex-wrap items-center justify-center gap-4 px-4"
          style={{ maxWidth: 960 }}
        >
          {cards.map((card, i) => (
            <div
              key={card.id}
              className="relative"
              style={{ perspective: 800 }}
            >
              {/* Flip container */}
              <div
                style={{
                  transition: 'transform 0.6s cubic-bezier(0.16,1,0.3,1)',
                  transformStyle: 'preserve-3d',
                  transform: flipped[i] ? 'rotateY(0deg)' : 'rotateY(180deg)',
                }}
              >
                {/* Card face */}
                <div style={{ backfaceVisibility: 'hidden' }}>
                  <CardDisplay card={card} size="lg" interactive={false} animDelay={0} />
                </div>
                {/* Card back */}
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-lg border border-gold/20 bg-app-surface"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <Eye className="h-8 w-8 text-gold/40 animate-flicker" />
                </div>
              </div>

              {/* Rarity burst on reveal */}
              {flipped[i] && RARITY_META[card.definition.rarity].shadow !== 'none' && (
                <div
                  className="pointer-events-none absolute inset-0 rounded-lg animate-[fade-in_300ms_ease-out]"
                  style={{ boxShadow: RARITY_META[card.definition.rarity].shadow, opacity: 0.7 }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Glow backdrop that matches highest rarity */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ boxShadow: `inset 0 0 120px ${bgGlow}`, transition: 'box-shadow 1s ease' }}
      />

      {/* Done CTA */}
      {phase === 'done' && (
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gold/40 bg-gold/10 px-5 py-2 font-ui text-[11px] uppercase tracking-[0.2em] text-gold hover:bg-gold/20 transition-colors"
          >
            Add to Collection
          </button>
        </div>
      )}
    </div>
  )
}
