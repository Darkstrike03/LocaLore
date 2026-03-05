/**
 * DailyClaimButton v2 — streak tracking, milestone bonuses, streak freezes.
 *
 * Streak base daily rewards (defined in supabase/streak_v2.sql):
 *   1-2d:  2⬡  |  3-6d: 8⬡  |  7-13d: 20⬡  |  14-27d: 50⬡  |  28+d: 80⬡
 *
 * One-time named milestone bonuses (on top of base):
 *   7d: +100⬡   14d: +250⬡   28d: +500⬡   30d: +750⬡   50d: +1500⬡
 *   100d: +4000⬡   200d: +10000⬡   300d: +25000⬡   500d: +60000⬡
 *
 * Every multiple-of-10 day: +50⬡ extra (stacks with milestone bonuses)
 *
 * Streak Freeze: 50⬡ each, max 5 held — auto-consumed when you miss 1 day.
 */
import { useState, useEffect, useCallback } from 'react'
import { Flame, CheckCircle, Loader2, Snowflake, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import {
  STREAK_FREEZE_COST,
  STREAK_MILESTONE_BONUSES,
  MILESTONE_DAYS,
  nextStreakMilestone,
  prevStreakMilestone,
  streakBaseReward,
  gainLabel,
  formatFull,
} from '../lib/currency'

interface ClaimResult {
  claimed: boolean
  streak: number
  anima_awarded: number
  freeze_count: number
  used_freeze: boolean
  base_reward: number
  bonus: number
  is_milestone: boolean
}

interface Props {
  /** Called after a successful daily claim so the parent can refresh balance */
  onClaimed?: (result: ClaimResult) => void
}

// ─── Streak tier helpers ──────────────────────────────────────────────────────

function flameColorClass(streak: number): string {
  if (streak >= 200) return 'text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.7)]'
  if (streak >= 100) return 'text-purple-300 drop-shadow-[0_0_6px_rgba(196,181,253,0.6)]'
  if (streak >= 50)  return 'text-violet-400 drop-shadow-[0_0_6px_rgba(167,139,250,0.5)]'
  if (streak >= 28)  return 'text-orange-300 drop-shadow-[0_0_6px_rgba(253,186,116,0.5)]'
  if (streak >= 14)  return 'text-gold drop-shadow-gold'
  if (streak >= 7)   return 'text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.4)]'
  if (streak >= 3)   return 'text-orange-400'
  return 'text-parchment-muted/40'
}

function tierLabel(streak: number): string {
  if (streak >= 500) return 'Eternal Flame'
  if (streak >= 300) return 'Living Legend'
  if (streak >= 200) return 'Living Myth'
  if (streak >= 100) return 'Archivist'
  if (streak >= 50)  return 'Chronicler'
  if (streak >= 28)  return 'Keeper'
  if (streak >= 14)  return 'Witness'
  if (streak >= 7)   return 'Seeker'
  if (streak >= 3)   return 'Initiate'
  return 'Newcomer'
}

function tierBorderClass(streak: number): string {
  if (streak >= 200) return 'border-fuchsia-500/30'
  if (streak >= 100) return 'border-purple-500/30'
  if (streak >= 50)  return 'border-violet-500/30'
  if (streak >= 14)  return 'border-gold/30'
  if (streak >= 7)   return 'border-amber-500/25'
  return 'border-app-border'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DailyClaimButton({ onClaimed }: Props) {
  const { user } = useAuth()
  const [loading, setLoading]           = useState(false)
  const [buyLoading, setBuyLoading]     = useState(false)
  const [result, setResult]             = useState<ClaimResult | null>(null)
  const [buyError, setBuyError]         = useState<string | null>(null)
  const [alreadyClaimed, setAlreadyClaimed] = useState(false)
  const [streak, setStreak]             = useState(0)
  const [freezeCount, setFreezeCount]   = useState(0)

  const loadData = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('users')
      .select('login_streak, last_daily_claim, streak_freeze_count')
      .eq('id', user.id)
      .maybeSingle()
    if (!data) return
    setStreak(data.login_streak ?? 0)
    setFreezeCount(data.streak_freeze_count ?? 0)
    if (data.last_daily_claim) {
      const last  = new Date(data.last_daily_claim)
      const today = new Date()
      setAlreadyClaimed(
        last.getUTCFullYear() === today.getUTCFullYear() &&
        last.getUTCMonth()    === today.getUTCMonth()    &&
        last.getUTCDate()     === today.getUTCDate()
      )
    }
  }, [user])

  useEffect(() => { void loadData() }, [loadData])

  async function handleClaim() {
    if (!user || loading || alreadyClaimed) return
    setLoading(true)
    setResult(null)
    try {
      const { data, error } = await supabase.rpc('claim_daily_reward')
      if (error) throw error
      const res = data as ClaimResult
      setResult(res)
      if (res.claimed) {
        setAlreadyClaimed(true)
        setStreak(res.streak)
        setFreezeCount(res.freeze_count)
        onClaimed?.(res)
      }
    } catch (err) {
      console.error('[DailyClaimButton]', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleBuyFreeze() {
    if (!user || buyLoading || freezeCount >= 5) return
    setBuyLoading(true)
    setBuyError(null)
    try {
      const { data, error } = await supabase.rpc('buy_streak_freeze', { quantity: 1 })
      if (error) throw error
      const res = data as { success: boolean; freeze_count: number; balance_after: number }
      if (res.success) setFreezeCount(res.freeze_count)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Purchase failed'
      setBuyError(msg.includes('Insufficient') ? 'Not enough ⬡' : msg.includes('full') ? 'Storage full' : 'Error')
      setTimeout(() => setBuyError(null), 3000)
    } finally {
      setBuyLoading(false)
    }
  }

  if (!user) return null

  // ── Computed display values ──────────────────────────────────────────────────
  const nextM      = nextStreakMilestone(streak)
  const prevM      = prevStreakMilestone(streak)
  const progressPct = nextM === prevM
    ? 100
    : Math.min(100, ((streak - prevM) / (nextM - prevM)) * 100)

  const nextBonus      = STREAK_MILESTONE_BONUSES[nextM] ?? (nextM % 10 === 0 ? 50 : 0)
  const nextIsSpecial  = nextM in STREAK_MILESTONE_BONUSES
  const daysAway       = nextM - streak

  // What you'll earn next claim (streak+1)
  const nextClaimStreak = alreadyClaimed ? streak : streak + 1
  const nextBase        = streakBaseReward(nextClaimStreak)
  const nextMilBonus    = STREAK_MILESTONE_BONUSES[nextClaimStreak] ?? 0
  const nextTenBonus    = nextClaimStreak % 10 === 0 ? 50 : 0
  const nextTotal       = nextBase + nextMilBonus + nextTenBonus
  const nextIsMilestone = nextMilBonus > 0 || nextTenBonus > 0

  return (
    <div className={`rounded-xl border bg-app-surface overflow-hidden transition-colors ${tierBorderClass(streak)}`}>

      {/* ── Header row ────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 pb-3">

        {/* Flame + streak number */}
        <div className="shrink-0 flex flex-col items-center gap-0.5 pt-0.5">
          <Flame className={`h-7 w-7 transition-all duration-500 ${alreadyClaimed ? 'text-amber-400' : flameColorClass(streak)}`} />
          <span className="font-mono text-[9px] text-parchment-muted tabular-nums leading-none">
            {streak}d
          </span>
        </div>

        {/* Info column */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-ui text-xs font-semibold text-parchment tracking-wide">
              {alreadyClaimed ? 'Offering collected' : 'Daily Archive Offering'}
            </span>
            <span className="font-ui text-[9px] text-parchment-muted/60 bg-app-background rounded px-1.5 py-0.5 border border-app-border shrink-0">
              {tierLabel(streak)}
            </span>
          </div>

          <p className="font-ui text-[10px] text-parchment-muted/60 mt-0.5 leading-relaxed">
            {alreadyClaimed
              ? `come back tomorrow · streak: ${streak} day${streak === 1 ? '' : 's'}`
              : nextIsMilestone
                ? `claim ${gainLabel(nextTotal)} ${nextMilBonus > 0 ? '✦ milestone!' : '(×10 bonus!)'}`
                : `claim ${gainLabel(nextTotal)} today`
            }
          </p>
        </div>

        {/* Freeze slots */}
        <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Snowflake
                key={i}
                className={`h-3 w-3 transition-colors ${i < freezeCount ? 'text-sky-400' : 'text-parchment-muted/15'}`}
              />
            ))}
          </div>
          <span className="font-ui text-[8px] text-parchment-muted/40">{freezeCount}/5 freezes</span>
        </div>
      </div>

      {/* ── Milestone progress bar ────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-ui text-[9px] text-parchment-muted/40">
            day {streak}
          </span>
          <span className={`font-ui text-[9px] ${nextIsSpecial ? 'text-gold/70' : 'text-parchment-muted/50'}`}>
            day {nextM} → {nextIsSpecial ? '✦ ' : ''}{formatFull(nextBonus + (nextM % 10 === 0 ? 50 : 0))} bonus
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-app-background overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600/60 via-gold/70 to-gold transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-1 font-ui text-[9px] text-parchment-muted/35 text-right">
          {daysAway === 0
            ? `milestone today!`
            : `${daysAway} day${daysAway === 1 ? '' : 's'} to next milestone`
          }
        </p>
      </div>

      {/* ── Upcoming milestones peek ──────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-none">
        {(MILESTONE_DAYS as readonly number[])
          .filter(m => m > streak && m <= streak + 100)
          .slice(0, 5)
          .map(m => {
            const bonus = STREAK_MILESTONE_BONUSES[m] ?? 50
            const isPrevNext = m === nextM
            return (
              <div
                key={m}
                className={`shrink-0 rounded border px-2 py-1 text-center transition-colors ${
                  isPrevNext
                    ? 'border-gold/40 bg-gold/5 text-gold'
                    : 'border-app-border text-parchment-muted/50'
                }`}
              >
                <div className="font-mono text-[9px] font-bold leading-none">{m}d</div>
                <div className="font-ui text-[8px] mt-0.5 opacity-75">+{formatFull(bonus)}</div>
              </div>
            )
          })
        }
      </div>

      {/* ── Claim result flash ────────────────────────────────────────────── */}
      {result?.claimed && (
        <div className={`mx-4 mb-3 rounded-lg border px-3 py-2 ${
          result.is_milestone
            ? 'border-gold/50 bg-gold/8'
            : 'border-emerald-500/30 bg-emerald-900/8'
        }`}>
          {result.is_milestone ? (
            <>
              <p className="font-ui text-xs text-gold font-semibold leading-tight">
                ✦ Day {result.streak} milestone reached!
              </p>
              <p className="font-ui text-[10px] text-parchment-muted mt-0.5">
                {formatFull(result.base_reward)} daily · +{formatFull(result.bonus)} bonus
                {' = '}
                <strong className="text-gold">{formatFull(result.anima_awarded)} ⬡</strong>
              </p>
            </>
          ) : (
            <p className="font-ui text-[10px] text-emerald-400 leading-relaxed">
              +{formatFull(result.anima_awarded)} ⬡ awarded · {result.streak}-day streak
              {result.used_freeze && (
                <span className="ml-2 text-sky-400">· ❄ freeze used</span>
              )}
            </p>
          )}
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 pb-4">

        {/* Claim button */}
        <button
          type="button"
          disabled={loading || alreadyClaimed}
          onClick={() => void handleClaim()}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 font-ui text-[11px] uppercase tracking-[0.15em] transition-all ${
            alreadyClaimed
              ? 'border-emerald-500/30 bg-emerald-900/10 text-emerald-400 cursor-default'
              : 'border-amber-500/40 bg-amber-900/20 text-amber-400 hover:bg-amber-900/40 disabled:opacity-50'
          }`}
        >
          {loading        ? <Loader2 className="h-3 w-3 animate-spin" />  :
           alreadyClaimed ? <CheckCircle className="h-3 w-3" />           :
                            <Flame className="h-3 w-3" />}
          {alreadyClaimed ? 'Done' : 'Claim'}
        </button>

        {/* Buy freeze button */}
        {freezeCount < 5 && (
          <button
            type="button"
            disabled={buyLoading}
            onClick={() => void handleBuyFreeze()}
            title={`Buy 1 streak freeze for ${STREAK_FREEZE_COST}⬡ — auto-used if you miss a day (${freezeCount}/5 slots used)`}
            className="flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-900/10 px-3 py-2 font-ui text-[10px] text-sky-400 hover:bg-sky-900/30 transition-all disabled:opacity-50 shrink-0"
          >
            {buyLoading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : buyError
                ? <AlertCircle className="h-3 w-3 text-red-400" />
                : <Snowflake className="h-3 w-3" />
            }
            <span>{buyError ?? `${STREAK_FREEZE_COST}⬡`}</span>
          </button>
        )}
      </div>
    </div>
  )
}

