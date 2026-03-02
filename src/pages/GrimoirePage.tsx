import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookMarked, Skull, Eye, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { Creature } from '../types/creature'
import { CreatureCard } from '../components/CreatureCard'

function GrimoirePage() {
  const { user, openAuthModal } = useAuth()
  const [creatures, setCreatures] = useState<Creature[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let mounted = true
    ;(async () => {
      const { data } = await supabase
        .from('creature_bookmarks')
        .select('creature_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!mounted || !data?.length) { setLoading(false); return }

      const ids = data.map(r => r.creature_id)
      const { data: cdata } = await supabase
        .from('creatures')
        .select('*')
        .in('id', ids)

      if (!mounted) return
      // preserve bookmark order
      const map = new Map((cdata as Creature[]).map(c => [c.id, c]))
      setCreatures(ids.map(id => map.get(id)!).filter(Boolean))
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [user])

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <BookMarked className="h-10 w-10 text-parchment-dim" />
        <h1 className="font-heading text-2xl text-gold">Your Grimoire</h1>
        <p className="font-body text-sm text-parchment-muted max-w-sm">
          A personal archive of creatures that have caught your eye. Sign in to begin collecting.
        </p>
        <button type="button" onClick={openAuthModal} className="btn-summon mt-2">
          Sign in to open your Grimoire
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 animate-rise">
      {/* Header */}
      <header className="mb-8">
        <p className="section-label mb-2 flex items-center gap-1.5">
          <BookMarked className="h-3 w-3" />
          Personal Collection
        </p>
        <h1 className="font-heading text-3xl sm:text-4xl text-gold leading-none tracking-wide">
          Your Grimoire
        </h1>
        <p className="mt-2 font-body text-base text-parchment-muted max-w-lg leading-relaxed">
          Creatures you've saved for closer study. Your private archive of the uncanny.
        </p>
        {!loading && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 w-fit">
            <Skull className="h-3.5 w-3.5 text-gold" />
            <span className="font-ui text-xs text-parchment">{creatures.length} {creatures.length === 1 ? 'entry' : 'entries'} saved</span>
          </div>
        )}
      </header>

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl border border-app-border bg-app-surface" />
          ))}
        </div>
      ) : creatures.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <Eye className="h-8 w-8 text-parchment-dim" />
          <p className="font-heading text-base text-gold/70">Your Grimoire is empty.</p>
          <p className="font-body text-sm text-parchment-muted">
            Browse the library and save creatures using the bookmark button.
          </p>
          <Link to="/library" className="btn-summon mt-2">
            <MapPin className="h-3.5 w-3.5" />
            Open the Library
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {creatures.map(c => (
            <CreatureCard key={c.id} creature={c} />
          ))}
        </div>
      )}
    </div>
  )
}

export default GrimoirePage
