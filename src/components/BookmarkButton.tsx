import { useEffect, useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

interface Props {
  creatureId: string
  /** compact icon-only mode vs full chip */
  compact?: boolean
}

export default function BookmarkButton({ creatureId, compact = false }: Props) {
  const { user, openAuthModal } = useAuth()
  const [bookmarked, setBookmarked] = useState(false)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase
        .from('creature_bookmarks')
        .select('user_id')
        .eq('creature_id', creatureId)
      if (!mounted || !data) return
      setCount(data.length)
      if (user) setBookmarked(data.some(r => r.user_id === user.id))
    })()
    return () => { mounted = false }
  }, [creatureId, user])

  async function toggle() {
    if (!user) { openAuthModal(); return }
    setLoading(true)
    if (bookmarked) {
      await supabase
        .from('creature_bookmarks')
        .delete()
        .eq('creature_id', creatureId)
        .eq('user_id', user.id)
      setBookmarked(false)
      setCount(c => Math.max(0, c - 1))
    } else {
      await supabase
        .from('creature_bookmarks')
        .insert({ creature_id: creatureId, user_id: user.id })
      setBookmarked(true)
      setCount(c => c + 1)
      // award XP to self for saving (+3)
      await supabase.from('xp_events').insert({
        user_id: user.id,
        event_type: 'bookmark_received',
        xp_amount: 3,
        reference_id: creatureId,
      })
      // Increment XP directly on users table (RPC fallback)
      const { data: xpRow } = await supabase
        .from('users')
        .select('xp')
        .eq('id', user.id)
        .maybeSingle()
      const currentXp = (xpRow as any)?.xp ?? 0
      await supabase.from('users').update({ xp: currentXp + 3 }).eq('id', user.id)
    }
    setLoading(false)
  }

  const Icon = bookmarked ? BookmarkCheck : Bookmark

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        aria-label={bookmarked ? 'Remove from Grimoire' : 'Save to Grimoire'}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200 ${
          bookmarked
            ? 'border-gold/50 bg-gold/10 text-gold'
            : 'border-app-border text-parchment-muted hover:border-gold/40 hover:text-gold'
        } disabled:opacity-50`}
      >
        <Icon className="h-4 w-4" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-ui text-[11px] transition-all duration-200 ${
        bookmarked
          ? 'border-gold/50 bg-gold/10 text-gold'
          : 'border-app-border text-parchment-muted hover:border-gold/30 hover:text-parchment disabled:opacity-50'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {bookmarked ? 'Saved to Grimoire' : 'Save to Grimoire'}
      {count > 0 && (
        <span className={`ml-0.5 rounded-full px-1.5 text-[10px] font-mono ${bookmarked ? 'bg-gold/20 text-gold' : 'bg-app-border text-parchment-dim'}`}>
          {count}
        </span>
      )}
    </button>
  )
}
