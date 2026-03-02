import { Zap } from 'lucide-react'

const RANKS = [
  { min: 0,    label: 'Murmur',     color: 'text-parchment-dim'  },
  { min: 50,   label: 'Wanderer',   color: 'text-parchment'      },
  { min: 200,  label: 'Chronicler', color: 'text-gold/70'        },
  { min: 600,  label: 'Keeper',     color: 'text-gold'           },
  { min: 1500, label: 'Archivist',  color: 'text-gold'           },
  { min: 3500, label: 'Loremaster', color: 'text-crimson'        },
]

function getRank(xp: number) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].min) return RANKS[i]
  }
  return RANKS[0]
}

function nextRank(xp: number) {
  for (const r of RANKS) {
    if (xp < r.min) return r
  }
  return null
}

interface Props {
  xp: number
  compact?: boolean
}

export default function XPBadge({ xp, compact = false }: Props) {
  const rank = getRank(xp)
  const next = nextRank(xp)
  const progress = next ? Math.min(100, ((xp - getRank(xp).min) / (next.min - getRank(xp).min)) * 100) : 100

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-ui text-[11px] uppercase tracking-[0.2em] ${rank.color}`}>
        <Zap className="h-3 w-3" />
        {rank.label} · {xp} XP
      </span>
    )
  }

  return (
    <div className="rounded-xl border border-app-border bg-app-surface px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-ui text-[10px] uppercase tracking-[0.3em] text-parchment-muted mb-0.5">Rank</p>
          <p className={`font-heading text-lg leading-tight ${rank.color}`}>{rank.label}</p>
        </div>
        <div className="text-right">
          <p className="font-ui text-[10px] uppercase tracking-[0.3em] text-parchment-muted mb-0.5">XP</p>
          <p className="font-mono text-xl text-parchment">{xp.toLocaleString()}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-1.5 w-full rounded-full bg-void overflow-hidden border border-app-border">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {next ? (
          <p className="font-ui text-[10px] text-parchment-dim">
            {next.min - xp} XP to <span className="text-parchment">{next.label}</span>
          </p>
        ) : (
          <p className="font-ui text-[10px] text-gold">Maximum rank achieved.</p>
        )}
      </div>

      {/* XP breakdown hint */}
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        {[
          { label: 'Submit creature',     xp: '+50' },
          { label: 'Creature verified',   xp: '+100' },
          { label: 'Witness account',     xp: '+10' },
          { label: 'File sighting',       xp: '+5' },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between rounded-lg bg-void px-2.5 py-1.5">
            <span className="font-ui text-[9px] text-parchment-dim">{item.label}</span>
            <span className="font-mono text-[9px] text-gold/70">{item.xp}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
