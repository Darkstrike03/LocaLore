import { formatPrice, formatTooltip, currencyColorClass } from '../../lib/currency'

interface CurrencyBadgeProps {
  anima: number
  size?: 'xs' | 'sm' | 'md'
  showTooltip?: boolean
  className?: string
  /** +/- prefix for gains/costs */
  sign?: 'gain' | 'cost' | 'none'
}

const SIZE_CLASS = {
  xs: 'text-[10px] px-1.5 py-0.5 gap-1',
  sm: 'text-[11px] px-2 py-0.5 gap-1',
  md: 'text-[13px] px-2.5 py-1 gap-1.5',
} as const

export default function CurrencyBadge({ anima, size = 'sm', showTooltip = true, className = '', sign = 'none' }: CurrencyBadgeProps) {
  const colorClass = currencyColorClass(anima)
  const label = formatPrice(anima)
  const prefix = sign === 'gain' ? '+' : sign === 'cost' ? '−' : ''

  return (
    <span
      className={`inline-flex items-center font-ui font-medium rounded border border-app-border bg-app-surface ${SIZE_CLASS[size]} ${colorClass} ${className}`}
      title={showTooltip ? formatTooltip(anima) : undefined}
    >
      <span className="opacity-60">{prefix}</span>
      {label}
    </span>
  )
}
