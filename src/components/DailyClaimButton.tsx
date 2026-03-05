/**
 * DailyClaimButton — compact widget that lets authenticated users claim
 * their daily login reward. Calls the `claim_daily_reward` Supabase RPC.
 *
 * Streak milestone rewards (defined in daily_streak.sql):
 *   day 1-2:  1 anima
 *   day 3-6:  5 anima
 *   day 7-13: 15 anima
 *   day 14+:  40 anima
 */
import { useState, useEffect } from 'react'
import { Flame, CheckCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

interface ClaimResult {
  claimed: boolean
  streak: number
  anima_awarded: number
}

interface Props {
  /** Called after a successful claim so parent can refresh anima balance */
  onClaimed?: (result: ClaimResult) => void
}

export default function DailyClaimButton({ onClaimed }: Props) {
  const { user } = useAuth()
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState<ClaimResult | null>(null)
  const [alreadyClaimed, setAlreadyClaimed] = useState(false)
  const [streak, setStreak]           = useState<number | null>(null)

  // Load current streak + last_daily_claim to know if already claimed today
  useEffect(() => {
    if (!user) return
    supabase
      .from('users')
      .select('login_streak, last_daily_claim')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setStreak(data.login_streak ?? 0)
        if (data.last_daily_claim) {
          const lastDate = new Date(data.last_daily_claim)
          const today    = new Date()
          const alreadyToday =
            lastDate.getUTCFullYear() === today.getUTCFullYear() &&
            lastDate.getUTCMonth()    === today.getUTCMonth() &&
            lastDate.getUTCDate()     === today.getUTCDate()
          setAlreadyClaimed(alreadyToday)
        }
      })
  }, [user])

  async function handleClaim() {
    if (!user || loading || alreadyClaimed) return
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('claim_daily_reward')
      if (error) throw error
      const res = data as ClaimResult
      setResult(res)
      if (res.claimed) {
        setAlreadyClaimed(true)
        setStreak(res.streak)
        onClaimed?.(res)
      }
    } catch (err) {
      console.error('[DailyClaimButton]', err)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  // Streak flame colour
  const flameColor =
    (streak ?? 0) >= 14 ? 'text-purple-400' :
    (streak ?? 0) >= 7  ? 'text-amber-400'  :
    (streak ?? 0) >= 3  ? 'text-orange-400' :
    'text-parchment-muted/60'

  const rewardLabel =
    (streak ?? 0) >= 14 ? '+40 ⬡' :
    (streak ?? 0) >= 7  ? '+15 ⬡' :
    (streak ?? 0) >= 3  ? '+5 ⬡'  :
    '+1 ⬡'

  return (
    <div className="rounded-xl border border-app-border bg-app-surface p-4 flex items-center gap-4">
      {/* Streak icon + count */}
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <Flame className={`h-6 w-6 ${alreadyClaimed ? 'text-amber-400' : flameColor}`} />
        {streak !== null && (
          <span className="font-ui text-[10px] text-parchment-muted tabular-nums">{streak}d</span>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="font-ui text-xs text-parchment leading-tight">
          {alreadyClaimed ? 'Daily offering collected' : 'Daily Archive Offering'}
        </p>
        <p className="font-ui text-[10px] text-parchment-muted/60 mt-0.5">
          {alreadyClaimed
            ? `Streak: ${streak} day${streak === 1 ? '' : 's'} — return tomorrow`
            : `Claim ${rewardLabel} · Streak bonus at day 3, 7, 14`}
        </p>
        {result?.claimed && (
          <p className="mt-1 font-ui text-[10px] text-emerald-400">
            +{result.anima_awarded} ⬡ awarded · {result.streak}-day streak!
          </p>
        )}
      </div>

      {/* Button */}
      <button
        type="button"
        disabled={loading || alreadyClaimed}
        onClick={() => void handleClaim()}
        className={`shrink-0 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-ui text-[11px] uppercase tracking-[0.15em] transition-all ${ 
          alreadyClaimed
            ? 'border-emerald-500/30 bg-emerald-900/10 text-emerald-400 cursor-default'
            : 'border-amber-500/40 bg-amber-900/20 text-amber-400 hover:bg-amber-900/40 disabled:opacity-50'
        }`}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : alreadyClaimed ? (
          <CheckCircle className="h-3 w-3" />
        ) : (
          <Flame className="h-3 w-3" />
        )}
        {alreadyClaimed ? 'Done' : 'Claim'}
      </button>
    </div>
  )
}
