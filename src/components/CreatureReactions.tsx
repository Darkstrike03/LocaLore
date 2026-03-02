import { useEffect, useState } from 'react'
import { Eye, Snowflake, HelpCircle, AlertTriangle, Sword, Flame, Sparkles, Ghost, Crosshair } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { ReactionType } from '../types/creature'

interface ReactionDef {
  key: ReactionType
  Icon: LucideIcon
  label: string
  color: string        // tailwind text + border + bg classes when active
}

const REACTIONS: ReactionDef[] = [
  { key: 'seen',      Icon: Eye,           label: "I've seen this", color: 'border-gold/50 bg-gold/10 text-gold'           },
  { key: 'chilling',  Icon: Snowflake,     label: 'Chilling',       color: 'border-sky-400/50 bg-sky-400/10 text-sky-300'  },
  { key: 'disbelief', Icon: HelpCircle,    label: 'Disbelief',      color: 'border-zinc-400/40 bg-zinc-400/10 text-zinc-300'},
  { key: 'terrified', Icon: AlertTriangle, label: 'Terrified',      color: 'border-orange-400/50 bg-orange-400/10 text-orange-300'},
  { key: 'survived',  Icon: Sword,         label: 'I survived',     color: 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300'},
  { key: 'cursed',    Icon: Flame,         label: 'Cursed',         color: 'border-red-400/50 bg-red-400/10 text-red-400'  },
  { key: 'revered',   Icon: Sparkles,      label: 'Revered',        color: 'border-violet-400/50 bg-violet-400/10 text-violet-300'},
  { key: 'haunted',   Icon: Ghost,         label: 'Haunted me',     color: 'border-purple-400/50 bg-purple-400/10 text-purple-300'},
  { key: 'hunting',   Icon: Crosshair,     label: 'Hunting one',    color: 'border-crimson/50 bg-crimson/10 text-crimson'  },
]

export default function CreatureReactions({ creatureId }: { creatureId: string }) {
  const { user } = useAuth()
  const [counts, setCounts]   = useState<Record<ReactionType, number>>({
    seen: 0, chilling: 0, disbelief: 0,
    terrified: 0, survived: 0, cursed: 0, revered: 0, haunted: 0, hunting: 0,
  })
  const [myReactions, setMine] = useState<Set<ReactionType>>(new Set())
  const [loading, setLoading]  = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase
        .from('creature_reactions')
        .select('reaction, user_id')
        .eq('creature_id', creatureId)

      if (!mounted || !data) return
      const c: Record<ReactionType, number> = {
        seen: 0, chilling: 0, disbelief: 0,
        terrified: 0, survived: 0, cursed: 0, revered: 0, haunted: 0, hunting: 0,
      }
      const mine = new Set<ReactionType>()
      for (const row of data) {
        c[row.reaction as ReactionType] = (c[row.reaction as ReactionType] || 0) + 1
        if (user && row.user_id === user.id) mine.add(row.reaction as ReactionType)
      }
      setCounts(c)
      setMine(mine)
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [creatureId, user])

  async function toggle(reaction: ReactionType) {
    if (!user) return
    if (myReactions.has(reaction)) {
      // remove
      await supabase
        .from('creature_reactions')
        .delete()
        .eq('creature_id', creatureId)
        .eq('user_id', user.id)
        .eq('reaction', reaction)
      setCounts(c => ({ ...c, [reaction]: Math.max(0, c[reaction] - 1) }))
      setMine(m => { const n = new Set(m); n.delete(reaction); return n })
    } else {
      // add
      await supabase.from('creature_reactions').insert({ creature_id: creatureId, user_id: user.id, reaction })
      setCounts(c => ({ ...c, [reaction]: c[reaction] + 1 }))
      setMine(m => new Set([...m, reaction]))
    }
  }

  if (loading) return null

  return (
    <div className="rounded-xl border border-app-border bg-app-surface px-4 py-4">
      <h3 className="font-ui text-[10px] uppercase tracking-[0.3em] text-parchment-muted mb-3">
        Witness reactions
      </h3>
      <div className="flex flex-wrap gap-2">
        {REACTIONS.map(({ key, Icon, label, color }) => {
          const active = myReactions.has(key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              title={user ? undefined : 'Sign in to react'}
              disabled={!user}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-ui text-[11px] transition-all duration-200 ${
                active
                  ? color
                  : 'border-app-border text-parchment-muted hover:border-gold/30 hover:text-parchment disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
              {counts[key] > 0 && (
                <span className={`ml-0.5 rounded-full px-1.5 py-0 text-[10px] font-mono ${active ? 'bg-white/15 text-inherit' : 'bg-app-border text-parchment-dim'}`}>
                  {counts[key]}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {!user && <p className="mt-2 font-ui text-[10px] text-parchment-dim italic">Sign in to leave a reaction.</p>}
    </div>
  )
}
