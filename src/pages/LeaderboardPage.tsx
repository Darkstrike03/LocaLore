import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Zap, Crown, Trophy, User } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { getRank } from '../components/XPBadge'
import { useAuth } from '../context/AuthContext'

interface Leader {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  xp: number
}

// ─── Medal for top 3 ──────────────────────────────────────────────────────────
function Medal({ pos }: { pos: number }) {
  if (pos === 1) return <Crown className="h-4 w-4 text-gold drop-shadow-gold" />
  if (pos === 2) return <Trophy className="h-4 w-4 text-parchment/60" />
  if (pos === 3) return <Trophy className="h-4 w-4 text-amber-700/80" />
  return (
    <span className="font-mono text-[11px] text-parchment-dim/50 w-4 text-center">
      {pos}
    </span>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-9 w-9 rounded-lg object-cover border border-gold/20"
      />
    )
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-app-border bg-app-background">
      <User className="h-4 w-4 text-parchment-dim/50" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const { user } = useAuth()
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [selfRank, setSelfRank] = useState<{ pos: number; xp: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, xp')
        .order('xp', { ascending: false })
        .limit(10)

      if (data) setLeaders(data as Leader[])

      // find current user's rank if they're not already in top 10
      if (user) {
        const { data: me } = await supabase
          .from('users')
          .select('xp')
          .eq('id', user.id)
          .maybeSingle()

        if (me) {
          const { count: above } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .gt('xp', (me as any).xp)

          setSelfRank({ pos: (above ?? 0) + 1, xp: (me as any).xp })
        }
      }
      setLoading(false)
    }
    load()
  }, [user])

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 animate-rise">

      {/* ── Header ── */}
      <header className="mb-8 text-center">
        <p className="section-label mb-2 flex items-center justify-center gap-1.5">
          <Eye className="h-3 w-3" />
          The Order of Witnesses
        </p>
        <h1 className="font-heading text-3xl sm:text-4xl text-gold tracking-wide leading-none">
          Leaderboard
        </h1>
        <p className="mt-2.5 font-body text-sm text-parchment-muted/80 max-w-sm mx-auto leading-relaxed">
          Those who have contributed most to the archive.
          <span className="block mt-0.5 text-parchment-dim/50 italic text-xs">
            The archive does not guarantee their continued wellbeing.
          </span>
        </p>
      </header>

      {/* ── Gold top bar ── */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent mb-1" />

      {/* ── Board ── */}
      <div className="rounded-xl border border-app-border bg-app-surface overflow-hidden">

        {loading ? (
          <div className="flex flex-col divide-y divide-app-border/40">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                <div className="h-3 w-4 rounded bg-parchment/10 shrink-0" />
                <div className="h-9 w-9 rounded-lg bg-parchment/10 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-28 rounded bg-parchment/10" />
                  <div className="h-2 w-16 rounded bg-parchment/10" />
                </div>
                <div className="h-4 w-14 rounded bg-parchment/10" />
              </div>
            ))}
          </div>
        ) : leaders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Eye className="h-6 w-6 text-parchment-dim/30" />
            <p className="font-heading text-base text-gold/50">No witnesses have earned XP yet.</p>
            <p className="font-body text-sm text-parchment-dim/40 italic">Be the first entry in the record.</p>
          </div>
        ) : (
          <div className="divide-y divide-app-border/40">
            {leaders.map((leader, i) => {
              const pos = i + 1
              const rank = getRank(leader.xp)
              const isMe = user?.id === leader.id
              const name = leader.display_name || leader.username || 'Unnamed Witness'

              return (
                <div
                  key={leader.id}
                  className={`group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-app-background/60 ${
                    isMe ? 'bg-gold/5 border-l-2 border-gold/40' : 'border-l-2 border-transparent'
                  } ${pos === 1 ? 'bg-gold/[0.04]' : ''}`}
                >
                  {/* Position */}
                  <div className="flex h-5 w-5 items-center justify-center shrink-0">
                    <Medal pos={pos} />
                  </div>

                  {/* Avatar */}
                  <Link to={`/profile/${leader.username ?? leader.id}`} className="shrink-0">
                    <Avatar url={leader.avatar_url} name={name} />
                  </Link>

                  {/* Identity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/profile/${leader.username ?? leader.id}`}
                        className="font-heading text-sm text-parchment hover:text-gold transition-colors truncate"
                      >
                        {name}
                      </Link>
                      {isMe && (
                        <span className="shrink-0 rounded-full border border-gold/30 bg-gold/8 px-2 py-0.5 font-ui text-[8px] uppercase tracking-[0.2em] text-gold/70">
                          you
                        </span>
                      )}
                    </div>
                    <p className={`font-ui text-[10px] uppercase tracking-[0.2em] mt-0.5 ${rank.color}`}>
                      {rank.label}
                    </p>
                  </div>

                  {/* XP */}
                  <div className="flex items-center gap-1 shrink-0 text-right">
                    <Zap className="h-3 w-3 text-gold/50" />
                    <span className="font-mono text-sm text-parchment/80">
                      {leader.xp.toLocaleString()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Gold bottom bar ── */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/20 to-transparent mt-1" />

      {/* ── Your rank (if outside top 10) ── */}
      {selfRank && !leaders.some(l => l.id === user?.id) && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-gold/20 bg-gold/5 px-5 py-3.5">
          <div className="flex h-5 w-5 items-center justify-center shrink-0">
            <span className="font-mono text-[11px] text-parchment-dim/50">#{selfRank.pos}</span>
          </div>
          <div className="flex-1">
            <p className="font-ui text-[10px] uppercase tracking-[0.3em] text-gold/60">Your rank</p>
            <p className={`font-ui text-[10px] mt-0.5 ${getRank(selfRank.xp).color}`}>
              {getRank(selfRank.xp).label}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-gold/50" />
            <span className="font-mono text-sm text-parchment/80">{selfRank.xp.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* ── How to earn XP ── */}
      <div className="mt-8 rounded-xl border border-app-border/50 bg-app-surface/50 px-5 py-4">
        <p className="font-ui text-[9px] uppercase tracking-[0.35em] text-parchment-muted/50 mb-3">
          How to ascend the ranks
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: 'Submit a creature',   xp: '+50 XP'  },
            { label: 'Creature verified',   xp: '+100 XP' },
            { label: 'File a sighting',     xp: '+5 XP'   },
            { label: 'Leave a reaction',    xp: '+10 XP'  },
          ].map(({ label, xp }) => (
            <div key={label} className="flex items-center justify-between rounded-lg bg-void px-3 py-2">
              <span className="font-ui text-[10px] text-parchment-dim">{label}</span>
              <span className="font-mono text-[10px] text-gold/70">{xp}</span>
            </div>
          ))}
        </div>
        {!user && (
          <p className="mt-3 text-center font-ui text-[9px] text-parchment-dim/40 italic">
            Sign in to begin accumulating a record.
          </p>
        )}
      </div>

    </div>
  )
}
