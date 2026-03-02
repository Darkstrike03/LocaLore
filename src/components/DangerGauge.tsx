import { Skull } from 'lucide-react'

const LEVELS: Record<number, { label: string; color: string; glow: string }> = {
  1: { label: 'Mostly Harmless',  color: 'text-parchment-muted', glow: 'shadow-none'       },
  2: { label: 'Unsettling',       color: 'text-gold/60',          glow: 'drop-shadow-none'  },
  3: { label: 'Dangerous',        color: 'text-gold',             glow: ''                  },
  4: { label: 'Lethal',           color: 'text-crimson/80',       glow: ''                  },
  5: { label: 'Apex Predator',    color: 'text-crimson',          glow: ''                  },
}

export default function DangerGauge({
  level,
  editable = false,
  onChange,
}: {
  level: number | null
  editable?: boolean
  onChange?: (n: number) => void
}) {
  const active = level ?? 0
  const meta   = LEVELS[active] ?? { label: 'Unknown', color: 'text-parchment-dim', glow: '' }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= active
          const isCrimson = active >= 4
          return (
            <button
              key={n}
              type="button"
              disabled={!editable}
              onClick={() => editable && onChange?.(n)}
              aria-label={`Danger level ${n}`}
              className={`rounded transition-all duration-150 ${editable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
            >
              <Skull
                className={`h-4 w-4 transition-all duration-200 ${
                  filled
                    ? isCrimson
                      ? 'text-crimson drop-shadow-[0_0_6px_rgb(139,17,17)]'
                      : 'text-gold drop-shadow-[0_0_5px_rgba(200,168,75,0.7)]'
                    : 'text-parchment-dim/25'
                }`}
              />
            </button>
          )
        })}
      </div>
      {active > 0 && (
        <span className={`font-ui text-[10px] uppercase tracking-[0.2em] ${meta.color}`}>
          {meta.label}
        </span>
      )}
    </div>
  )
}
