// ─── LocaLore Currency System ─────────────────────────────────────────────────
// Base unit: Anima (⬡)
// 10 anima  = 1 obol  (◈)
// 100 obol  = 1 grim  (☽)   →  1000 anima = 1 grim

export const ANIMA_PER_OBOL = 10
export const OBOL_PER_GRIM  = 100
export const ANIMA_PER_GRIM = ANIMA_PER_OBOL * OBOL_PER_GRIM   // 1000

export const GLYPHS = { anima: '⬡', obol: '◈', grim: '☽' } as const

// ─── Earnings schedule (anima) ───────────────────────────────────────────────
export const ANIMA_REWARDS = {
  react:              1,    // per emoji reaction on a creature profile
  bookmark:           2,    // saving a creature to the Grimoire
  sighting_filed:     3,
  submit_creature:    10,
  creature_verified:  25,   // bonus on top of submit
  daily_streak_3:     5,
  daily_streak_7:     15,
  daily_streak_14:    40,
} as const

// ─── Formatting ───────────────────────────────────────────────────────────────
export interface CurrencyBreakdown {
  grim:   number
  obol:   number
  anima:  number
  total_anima: number
}

export function breakdown(totalAnima: number): CurrencyBreakdown {
  const grim  = Math.floor(totalAnima / ANIMA_PER_GRIM)
  const obol  = Math.floor((totalAnima % ANIMA_PER_GRIM) / ANIMA_PER_OBOL)
  const anima = totalAnima % ANIMA_PER_OBOL
  return { grim, obol, anima, total_anima: totalAnima }
}

/** Full display: "2☽ 35◈ 4⬡" — omits zero tiers in the middle */
export function formatFull(totalAnima: number): string {
  const { grim, obol, anima } = breakdown(totalAnima)
  const parts: string[] = []
  if (grim  > 0) parts.push(`${grim}${GLYPHS.grim}`)
  if (obol  > 0) parts.push(`${obol}${GLYPHS.obol}`)
  if (anima > 0 || parts.length === 0) parts.push(`${anima}${GLYPHS.anima}`)
  return parts.join(' ')
}

/** Compact display: show only the highest non-zero denomination */
export function formatCompact(totalAnima: number): string {
  const { grim, obol, anima } = breakdown(totalAnima)
  if (grim  > 0) return `${grim}${GLYPHS.grim}`
  if (obol  > 0) return `${obol}${GLYPHS.obol}`
  return `${anima}${GLYPHS.anima}`
}

/** Price display for listings: "2☽ 3◈" — shows top two denominations */
export function formatPrice(totalAnima: number): string {
  const { grim, obol, anima } = breakdown(totalAnima)
  if (grim > 0) {
    const remaining = obol > 0 ? ` ${obol}${GLYPHS.obol}` : ''
    return `${grim}${GLYPHS.grim}${remaining}`
  }
  if (obol > 0) {
    const remaining = anima > 0 ? ` ${anima}${GLYPHS.anima}` : ''
    return `${obol}${GLYPHS.obol}${remaining}`
  }
  return `${anima}${GLYPHS.anima}`
}

/** Tooltip string: "2 grim, 35 obol, 4 anima  (2354 anima total)" */
export function formatTooltip(totalAnima: number): string {
  const { grim, obol, anima } = breakdown(totalAnima)
  const parts: string[] = []
  if (grim  > 0) parts.push(`${grim} grim`)
  if (obol  > 0) parts.push(`${obol} obol`)
  if (anima > 0) parts.push(`${anima} anima`)
  return `${parts.join(', ')}  (${totalAnima} anima total)`
}

/** Parse a raw anima number into a human label for small gains */
export function gainLabel(anima: number): string {
  if (anima <= 0) return '0⬡'
  return `+${formatFull(anima)}`
}

/** Currency colour class based on value */
export function currencyColorClass(totalAnima: number): string {
  if (totalAnima >= ANIMA_PER_GRIM * 10) return 'text-purple-300' // 10+ grim
  if (totalAnima >= ANIMA_PER_GRIM)       return 'text-gold'
  if (totalAnima >= ANIMA_PER_OBOL * 10)  return 'text-parchment'
  return 'text-parchment-muted'
}

// ─── Streak system ────────────────────────────────────────────────────────────

/** Anima cost to purchase one streak freeze */
export const STREAK_FREEZE_COST = 50

/** One-time bonus awarded ON TOP of the base daily reward on milestone days */
export const STREAK_MILESTONE_BONUSES: Record<number, number> = {
  7:    100,
  14:   250,
  28:   500,
  30:   750,
  50:   1500,
  100:  4000,
  200:  10000,
  300:  25000,
  500:  60000,
}

/** Named milestone days — shown on the progress bar */
export const MILESTONE_DAYS: readonly number[] = [7, 14, 28, 30, 50, 100, 200, 300, 500]

/** Base daily anima per streak tier (before any milestone bonus) */
export function streakBaseReward(streak: number): number {
  if (streak >= 28) return 80
  if (streak >= 14) return 50
  if (streak >= 7)  return 20
  if (streak >= 3)  return 8
  return 2
}

/** Next named milestone day above the current streak */
export function nextStreakMilestone(streak: number): number {
  for (const m of MILESTONE_DAYS) {
    if (streak < m) return m
  }
  // Beyond 500: every 100 days
  return Math.ceil((streak + 1) / 100) * 100
}

/** Last named milestone day that has already been passed (0 if none) */
export function prevStreakMilestone(streak: number): number {
  for (let i = MILESTONE_DAYS.length - 1; i >= 0; i--) {
    if (streak >= MILESTONE_DAYS[i]) return MILESTONE_DAYS[i]
  }
  return 0
}
