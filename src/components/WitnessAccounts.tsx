import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Scroll, Trash2 } from 'lucide-react'

interface Comment {
  id: string
  user_id: string
  display_name: string | null
  avatar_url: string | null
  content: string
  created_at: string
}

export default function WitnessAccounts({ creatureId }: { creatureId: string }) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading,  setLoading]  = useState(true)
  const [text,     setText]     = useState('')
  const [posting,  setPosting]  = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase
        .from('creature_comments')
        .select('*')
        .eq('creature_id', creatureId)
        .order('created_at', { ascending: false })
      if (mounted) { setComments((data as Comment[]) || []); setLoading(false) }
    })()
    return () => { mounted = false }
  }, [creatureId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !text.trim() || posting) return
    setPosting(true)

    // fetch display_name + avatar from users table for attribution
    const { data: me } = await supabase
      .from('users')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle()

    const payload = {
      creature_id:  creatureId,
      user_id:      user.id,
      display_name: me?.display_name ?? null,
      avatar_url:   me?.avatar_url ?? null,
      content:      text.trim(),
    }

    const { data: inserted, error } = await supabase
      .from('creature_comments')
      .insert(payload)
      .select()
      .maybeSingle()

    setPosting(false)
    if (!error && inserted) {
      setComments(prev => [inserted as Comment, ...prev])
      setText('')
    }
  }

  async function remove(id: string) {
    await supabase.from('creature_comments').delete().eq('id', id)
    setComments(prev => prev.filter(c => c.id !== id))
  }

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 font-ui text-[11px] font-medium uppercase tracking-[0.3em] text-parchment-muted">
        <Scroll className="h-3.5 w-3.5 text-gold/60" />
        Witness Accounts
      </h2>

      {/* Submit form */}
      {user ? (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Describe your encounter in first person…"
            className="input-forge resize-none text-sm"
          />
          <div className="flex items-center justify-between">
            <span className="font-ui text-[10px] text-parchment-dim">{text.length}/500</span>
            <button
              type="submit"
              disabled={posting || text.trim().length < 5}
              className="btn-summon disabled:opacity-50"
            >
              {posting ? 'Filing…' : 'File account'}
            </button>
          </div>
        </form>
      ) : (
        <p className="font-body text-sm italic text-parchment-dim border-l border-app-border pl-3">
          Sign in to file a witness account.
        </p>
      )}

      {/* Comments list */}
      {loading ? (
        <p className="text-parchment-dim text-sm animate-pulse">Consulting the archive…</p>
      ) : comments.length === 0 ? (
        <p className="font-body text-sm italic text-parchment-dim border-l border-app-border pl-3">
          No accounts on file. Be the first to file one.
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map(c => (
            <div key={c.id} className="relative rounded-xl border border-app-border bg-app-surface px-4 py-3 group">
              <div className="flex items-center gap-2 mb-1.5">
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover border border-app-border" />
                ) : (
                  <span className="h-5 w-5 rounded-full bg-void border border-app-border flex items-center justify-center font-ui text-[9px] text-parchment-dim">
                    {(c.display_name ?? '?')[0].toUpperCase()}
                  </span>
                )}
                <span className="font-ui text-[11px] text-parchment">{c.display_name ?? 'Anonymous'}</span>
                <span className="font-ui text-[10px] text-parchment-dim ml-auto">
                  {new Date(c.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </span>
              </div>
              <p className="font-body text-[14px] leading-relaxed text-parchment/80 whitespace-pre-line pl-7">{c.content}</p>
              {user?.id === c.user_id && (
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-parchment-dim hover:text-crimson"
                  aria-label="Delete account"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
