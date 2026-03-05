import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookmarkCheck, Eye, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useSEO } from '../hooks/useSEO'

interface BookmarkedCreature {
  bookmark_id: string
  creature_id: string
  name: string
  slug: string
  image_url: string | null
  region: string | null
  country: string | null
  creature_type: string
  bookmarked_at: string
}

export default function BookmarksPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems]       = useState<BookmarkedCreature[]>([])
  const [loading, setLoading]   = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  useSEO({
    title: 'Saved Creatures — LocaLore',
    description: 'Your bookmarked folklore creatures from the LocaLore archive.',
    url: '/bookmarks',
  })

  useEffect(() => {
    if (!user) { setLoading(false); return }
    supabase
      .from('creature_bookmarks')
      .select(`
        id,
        creature_id,
        created_at,
        creature:creatures ( name, slug, image_url, region, country, creature_type )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const mapped = (data ?? []).map((row: any) => ({
          bookmark_id:   row.id,
          creature_id:   row.creature_id,
          bookmarked_at: row.created_at,
          name:           row.creature?.name        ?? 'Unknown',
          slug:           row.creature?.slug        ?? '',
          image_url:      row.creature?.image_url   ?? null,
          region:         row.creature?.region      ?? null,
          country:        row.creature?.country     ?? null,
          creature_type:  row.creature?.creature_type ?? 'other',
        }))
        setItems(mapped)
        setLoading(false)
      })
  }, [user])

  async function removeBookmark(bookmarkId: string) {
    setRemoving(bookmarkId)
    await supabase.from('creature_bookmarks').delete().eq('id', bookmarkId)
    setItems(prev => prev.filter(b => b.bookmark_id !== bookmarkId))
    setRemoving(null)
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <BookmarkCheck className="h-8 w-8 text-parchment-muted/40" />
        <p className="font-ui text-sm text-parchment-muted">Sign in to view your saved creatures.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-app-background px-4 py-8">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="font-ui text-[10px] uppercase tracking-[0.5em] text-parchment-muted/60 mb-1">Archive</p>
            <h1 className="font-heading text-2xl text-gold tracking-wide">Saved Creatures</h1>
          </div>
          {items.length > 0 && (
            <span className="font-ui text-xs text-parchment-muted">{items.length} saved</span>
          )}
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-gold/40" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-app-border bg-app-surface p-12 text-center">
            <BookmarkCheck className="h-10 w-10 text-parchment-dim/30 mx-auto mb-4" />
            <p className="font-heading text-base text-parchment-muted">Nothing saved yet.</p>
            <p className="mt-2 font-body text-sm text-parchment-dim leading-relaxed">
              Open any creature entry and hit the bookmark icon to save it here.
            </p>
            <button
              type="button"
              onClick={() => navigate('/library')}
              className="mt-6 font-ui text-[11px] uppercase tracking-[0.3em] text-gold/70 hover:text-gold transition-colors"
            >
              Browse the Library →
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map(item => (
              <div
                key={item.bookmark_id}
                className="group flex items-center gap-4 rounded-xl border border-app-border bg-app-surface p-3 hover:border-gold/30 transition-colors"
              >
                {/* Thumbnail */}
                <Link to={`/creatures/${item.slug}`} className="shrink-0">
                  <div className="h-14 w-14 rounded-lg overflow-hidden border border-app-border bg-void/40">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <Eye className="h-5 w-5 text-parchment-dim/40 m-4" />}
                  </div>
                </Link>

                {/* Info */}
                <Link to={`/creatures/${item.slug}`} className="flex-1 min-w-0">
                  <p className="font-heading text-sm text-gold truncate group-hover:text-gold/80 transition-colors">{item.name}</p>
                  <p className="font-ui text-[10px] text-parchment-muted/60 truncate">
                    {item.creature_type.replace(/_/g, ' ')}
                    {item.region ? ` · ${item.region}` : ''}
                    {item.country ? `, ${item.country}` : ''}
                  </p>
                </Link>

                {/* Remove */}
                <button
                  type="button"
                  aria-label="Remove bookmark"
                  disabled={removing === item.bookmark_id}
                  onClick={() => void removeBookmark(item.bookmark_id)}
                  className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg border border-transparent text-parchment-muted/40 hover:border-red-500/30 hover:bg-red-900/10 hover:text-red-400 transition-all disabled:opacity-40"
                >
                  {removing === item.bookmark_id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
