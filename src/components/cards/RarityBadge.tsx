import type { CardRarity } from '../../types/cards'
import { RARITY_META } from '../../types/cards'

interface RarityBadgeProps {
  rarity: CardRarity
  size?: 'xs' | 'sm' | 'md'
  showGlyph?: boolean
  className?: string
}

const SIZE_CLASS = {
  xs: 'text-[9px] px-1.5 py-0.5 gap-1',
  sm: 'text-[10px] px-2 py-0.5 gap-1',
  md: 'text-[12px] px-2.5 py-1 gap-1.5',
} as const

export default function RarityBadge({ rarity, size = 'sm', showGlyph = true, className = '' }: RarityBadgeProps) {
  const meta = RARITY_META[rarity]
  return (
    <span
      className={`inline-flex items-center font-ui font-medium rounded border bg-app-surface/80 uppercase tracking-[0.12em] ${SIZE_CLASS[size]} ${meta.color} ${meta.border} ${className}`}
      style={meta.shadow !== 'none' ? { boxShadow: meta.shadow } : undefined}
    >
      {showGlyph && <span className="opacity-70">{meta.glyph}</span>}
      {meta.label}
    </span>
  )
}
