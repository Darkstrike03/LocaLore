/**
 * DailyMissions — shows & manages the 3 rotating daily missions.
 *
 * Missions refresh at UTC midnight. Completing all 3 earns a +50⬡ bonus.
 * Progress on react / bookmark / sighting missions is ticked from the
 * corresponding components; this panel just shows state and lets users claim.
 */
import { useState, useEffect, useCallback } from 'react'
import { Target, CheckCircle2, Loader2, Gift, Lock, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { gainLabel, formatFull } from '../lib/currency'

interface MissionRow {
  id: string
  slot: number
  progress: number
  completed: boolean
  claimed: boolean
  key: string
  label: string
  description: string
  reward: number
  target: number
}

interface Props {
  /** Called after any reward claim so the parent can refresh balance */
  onRewardClaimed?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function missionIconColor(m: MissionRow): string {
  if (m.claimed)    return 'text-emerald-400'
  if (m.completed)  return 'text-gold'
  return 'text-parchment-muted/40'
}

function progressBarWidth(m: MissionRow): number {
  if (m.target <= 1) return m.completed ? 100 : 0
  return Math.min(100, (m.progress / m.target) * 100)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DailyMissions({ onRewardClaimed }: Props) {
  const { user } = useAuth()
  const [missions, setMissions]     = useState<MissionRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [claiming, setClaiming]     = useState<string | null>(null)
  const [claimResult, setClaimResult] = useState<Record<string, { reward: number; bonus: number }>>({})

  const loadMissions = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_or_create_daily_missions')
      if (error) throw error
      setMissions((data as MissionRow[]) ?? [])
    } catch (err) {
      console.error('[DailyMissions]', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { void loadMissions() }, [loadMissions])

  async function handleClaim(mission: MissionRow) {
    if (!user || claiming || mission.claimed || !mission.completed) return
    setClaiming(mission.id)
    try {
      const { data, error } = await supabase.rpc('claim_mission_reward', {
        p_mission_id: mission.id,
      })
      if (error) throw error
      const res = data as { success: boolean; reward: number; bonus: number }
      if (res.success) {
        setClaimResult(prev => ({ ...prev, [mission.id]: { reward: res.reward, bonus: res.bonus } }))
        setMissions(prev => prev.map(m =>
          m.id === mission.id ? { ...m, claimed: true } : m
        ))
        onRewardClaimed?.()
      }
    } catch (err) {
      console.error('[DailyMissions] claim:', err)
    } finally {
      setClaiming(null)
    }
  }

  if (!user) return null

  const allClaimed   = missions.length > 0 && missions.every(m => m.claimed)
  const completedCount = missions.filter(m => m.completed).length
  const claimedCount   = missions.filter(m => m.claimed).length

  // Time until UTC midnight
  const now      = new Date()
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  const diffMs   = midnight.getTime() - now.getTime()
  const hh       = Math.floor(diffMs / 3600000)
  const mm       = Math.floor((diffMs % 3600000) / 60000)
  const resetIn  = `${hh}h ${mm}m`

  return (
    <div className="rounded-xl border border-app-border bg-app-surface overflow-hidden">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-app-border">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-gold" />
          <span className="font-ui text-xs font-semibold text-parchment tracking-wide uppercase">
            Daily Missions
          </span>
          <span className={`font-ui text-[9px] rounded px-1.5 py-0.5 border ${
            allClaimed
              ? 'border-emerald-500/30 bg-emerald-900/10 text-emerald-400'
              : 'border-app-border text-parchment-muted/50'
          }`}>
            {claimedCount}/3 done
          </span>
        </div>

        <div className="flex items-center gap-2">
          {allClaimed && (
            <span className="font-ui text-[9px] text-emerald-400">
              ✦ +50⬡ all-complete bonus!
            </span>
          )}
          <div className="flex items-center gap-1 text-parchment-muted/40">
            <RefreshCw className="h-2.5 w-2.5" />
            <span className="font-mono text-[9px]">{resetIn}</span>
          </div>
        </div>
      </div>

      {/* ── All-complete bonus bar ─────────────────────────────────────────── */}
      <div className="px-4 pt-2.5 pb-1">
        <div className="flex items-center justify-between mb-1">
          <span className="font-ui text-[9px] text-parchment-muted/50">All-complete bonus</span>
          <span className="font-ui text-[9px] text-gold/70">+50⬡</span>
        </div>
        <div className="h-1 rounded-full bg-app-background overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold/40 to-gold/80 transition-all duration-500"
            style={{ width: `${(completedCount / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Mission rows ──────────────────────────────────────────────────── */}
      <div className="divide-y divide-app-border/50">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-parchment-muted/40" />
          </div>
        ) : missions.map(m => {
          const cr = claimResult[m.id]
          return (
            <div key={m.id} className={`flex items-start gap-3 px-4 py-3 transition-colors ${m.claimed ? 'opacity-60' : ''}`}>

              {/* Status icon */}
              <div className="shrink-0 mt-0.5">
                {m.claimed
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  : m.completed
                    ? <Gift className={`h-4 w-4 text-gold ${claiming === m.id ? 'animate-pulse' : ''}`} />
                    : <Lock className="h-4 w-4 text-parchment-muted/25" />
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-ui text-xs font-medium ${missionIconColor(m)}`}>
                    {m.label}
                  </span>
                  <span className="font-ui text-[9px] text-gold/70 shrink-0">
                    {gainLabel(m.reward)}
                  </span>
                </div>
                <p className="font-ui text-[10px] text-parchment-muted/50 mt-0.5 leading-relaxed">
                  {m.description}
                </p>

                {/* Progress */}
                {m.target > 1 && !m.claimed && (
                  <div className="mt-1.5">
                    <div className="h-1 rounded-full bg-app-background overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          m.completed
                            ? 'bg-gold'
                            : 'bg-parchment-muted/30'
                        }`}
                        style={{ width: `${progressBarWidth(m)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[8px] text-parchment-muted/40 mt-0.5 block text-right">
                      {m.progress}/{m.target}
                    </span>
                  </div>
                )}

                {/* Claim result flash */}
                {cr && (
                  <p className="mt-1 font-ui text-[10px] text-emerald-400">
                    +{formatFull(cr.reward)} ⬡ claimed
                    {cr.bonus > 0 && (
                      <span className="ml-1 text-gold"> · +{formatFull(cr.bonus)} all-complete!</span>
                    )}
                  </p>
                )}
              </div>

              {/* Claim button */}
              {m.completed && !m.claimed && (
                <button
                  type="button"
                  disabled={!!claiming}
                  onClick={() => void handleClaim(m)}
                  className="shrink-0 flex items-center gap-1 rounded-lg border border-gold/40 bg-gold/10 px-2.5 py-1.5 font-ui text-[10px] text-gold hover:bg-gold/20 transition-all disabled:opacity-50 uppercase tracking-[0.1em]"
                >
                  {claiming === m.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Gift className="h-3 w-3" />
                  }
                  Claim
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Footer hint ───────────────────────────────────────────────────── */}
      {!allClaimed && !loading && (
        <div className="px-4 py-2.5 border-t border-app-border/50">
          <p className="font-ui text-[9px] text-parchment-muted/35 leading-relaxed">
            React to creatures, file sightings, open packs, and more to complete missions.
            Resets at UTC midnight.
          </p>
        </div>
      )}
    </div>
  )
}
