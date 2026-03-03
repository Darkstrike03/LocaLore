import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Eye, MapPin, Clock } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

interface FeedItem {
  id: string
  creature_id: string
  description: string | null
  latitude: number
  longitude: number
  created_at: string
  creatures: {
    name: string
    slug: string
    region: string | null
    country: string | null
  } | null
}

// ─── Relative time ────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60)  return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

// ─── Anonymous witness label ──────────────────────────────────────────────────
const ALIASES = [
  'Anonymous Witness', 'Unnamed Source', 'Redacted Informant',
  'Field Observer', 'Unnamed Archivist', 'Unidentified Correspondent',
]
function alias(id: string) {
  const sum = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return ALIASES[sum % ALIASES.length]
}

// ─── Single feed row ──────────────────────────────────────────────────────────
function FeedRow({ item }: { item: FeedItem }) {
  const creature = item.creatures
  if (!creature) return null
  return (
    <div className="group flex gap-3 py-2.5 border-b border-app-border/40 last:border-0">
      {/* Pulse dot */}
      <div className="mt-1 flex flex-col items-center gap-1 shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-gold/50 group-first:animate-pin-pulse" />
        <span className="w-px flex-1 bg-app-border/30 min-h-[12px]" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/creatures/${creature.slug}`}
            className="font-heading text-[13px] text-gold/90 hover:text-gold leading-tight truncate transition-colors"
          >
            {creature.name}
          </Link>
          <span className="flex items-center gap-1 shrink-0 font-ui text-[9px] text-parchment-dim/40">
            <Clock className="h-2.5 w-2.5" />
            {timeAgo(item.created_at)}
          </span>
        </div>

        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
          {(creature.region || creature.country) && (
            <span className="flex items-center gap-1 font-ui text-[9px] uppercase tracking-[0.2em] text-parchment-dim/50">
              <MapPin className="h-2 w-2" />
              {[creature.region, creature.country].filter(Boolean).join(' · ')}
            </span>
          )}
          <span className="font-ui text-[8px] italic text-parchment-dim/30">
            — {alias(item.id)}
          </span>
        </div>

        {item.description && (
          <p className="mt-1 font-body text-[12px] text-parchment/50 leading-snug line-clamp-2">
            {item.description}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function RecentlyWitnessed() {
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [pulse, setPulse] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('sighting_reports')
      .select('id, creature_id, description, latitude, longitude, created_at, creatures(name, slug, region, country)')
      .order('created_at', { ascending: false })
      .limit(8)

    if (data) setFeed(data as unknown as FeedItem[])
    setLoading(false)
    setPulse(true)
    setTimeout(() => setPulse(false), 500)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 120_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="rounded-xl border border-app-border/60 bg-app-surface overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-app-border/40">
        <div className="flex items-center gap-1.5">
          <Eye className="h-3 w-3 text-gold/50" />
          <span className="font-ui text-[9px] uppercase tracking-[0.35em] text-parchment-muted/70">
            Recently Witnessed
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`block h-1.5 w-1.5 rounded-full bg-gold/50 transition-opacity duration-300 ${pulse ? 'opacity-100' : 'opacity-30'}`}
            style={{ boxShadow: '0 0 4px rgba(200,168,75,0.5)' }}
          />
          <span className="font-ui text-[7px] uppercase tracking-[0.3em] text-parchment-dim/30">Live</span>
        </div>
      </div>

      {/* Feed */}
      <div className="px-4 py-1">
        {loading ? (
          <div className="flex flex-col gap-2 py-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-parchment/10 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 rounded bg-parchment/10" />
                  <div className="h-2 w-32 rounded bg-parchment/10" />
                </div>
              </div>
            ))}
          </div>
        ) : feed.length === 0 ? (
          <p className="py-4 text-center font-body text-[12px] italic text-parchment-dim/40">
            No sightings on record yet.
          </p>
        ) : (
          feed.map(item => <FeedRow key={item.id} item={item} />)
        )}
      </div>

      {feed.length > 0 && (
        <div className="border-t border-app-border/30 px-4 py-2 text-center">
          <Link
            to="/submit"
            className="font-ui text-[9px] uppercase tracking-[0.3em] text-parchment-dim/40 hover:text-gold/70 transition-colors"
          >
            File your own sighting →
          </Link>
        </div>
      )}
    </div>
  )
}
