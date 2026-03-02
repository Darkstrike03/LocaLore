import type { CSSProperties, FC } from 'react'
import { Flame, Waves, Shuffle, Skull, Sparkles, Zap, Eye } from 'lucide-react'
import type { CreatureType } from '../types/creature'

interface Props {
  type: CreatureType
  /** icon size class e.g. "h-8 w-8" */
  size?: string
  /** whether to render just the icon or the full themed container */
  iconOnly?: boolean
}

const TYPE_CONFIG: Record<CreatureType, {
  Icon: FC<{ className?: string; style?: CSSProperties }>
  label: string
  bgFrom: string
  bgTo: string
  iconColor: string
  glowColor: string
}> = {
  spirit:        { Icon: Sparkles, label: 'Spirit',          bgFrom: 'from-sky-950/50',    bgTo: 'to-indigo-950/60',  iconColor: 'text-sky-300/60',    glowColor: 'rgba(125,211,252,0.4)' },
  demon:         { Icon: Flame,    label: 'Demon',            bgFrom: 'from-red-950/60',    bgTo: 'to-rose-950/50',    iconColor: 'text-red-400/60',    glowColor: 'rgba(248,113,113,0.4)' },
  trickster:     { Icon: Zap,      label: 'Trickster',        bgFrom: 'from-yellow-950/50', bgTo: 'to-amber-950/60',   iconColor: 'text-yellow-400/60', glowColor: 'rgba(250,204,21,0.4)'  },
  water_creature:{ Icon: Waves,    label: 'Water Creature',   bgFrom: 'from-cyan-950/60',   bgTo: 'to-teal-950/50',    iconColor: 'text-cyan-400/60',   glowColor: 'rgba(34,211,238,0.4)'  },
  shapeshifter:  { Icon: Shuffle,  label: 'Shapeshifter',     bgFrom: 'from-violet-950/60', bgTo: 'to-purple-950/50',  iconColor: 'text-violet-400/60', glowColor: 'rgba(167,139,250,0.4)' },
  undead:        { Icon: Skull,    label: 'Undead',           bgFrom: 'from-zinc-900/70',   bgTo: 'to-stone-950/60',   iconColor: 'text-zinc-400/60',   glowColor: 'rgba(161,161,170,0.3)' },
  other:         { Icon: Eye,      label: 'Unknown Entity',   bgFrom: 'from-app-surface',   bgTo: 'to-void',           iconColor: 'text-gold/30',       glowColor: 'rgba(200,168,75,0.25)' },
}

export function getTypeConfig(type: CreatureType) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.other
}

export default function CreatureTypeIcon({ type, size = 'h-8 w-8', iconOnly = false }: Props) {
  const config = getTypeConfig(type)
  const { Icon, label, bgFrom, bgTo, iconColor, glowColor } = config

  if (iconOnly) {
    return <Icon className={`${size} ${iconColor}`} />
  }

  return (
    <div className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br ${bgFrom} ${bgTo}`}>
      <div
        className="relative flex items-center justify-center"
        style={{ filter: `drop-shadow(0 0 14px ${glowColor})` }}
      >
        <Icon className={`${size} ${iconColor}`} />
      </div>
      <span className="font-ui text-[9px] uppercase tracking-[0.4em] text-parchment-dim/40">
        {label}
      </span>
    </div>
  )
}
