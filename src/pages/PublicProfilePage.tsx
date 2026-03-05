import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Eye, BookOpen, Layers, Footprints } from 'lucide-react'
import { useSEO } from '../hooks/useSEO'
import XPBadge from '../components/XPBadge'

function PublicProfilePage() {
  const { username } = useParams<{ username: string }>()
  const [profile, setProfile]         = useState<any | null>(null)
  const [creatures, setCreatures]     = useState<any[]>([])
  const [cardCount, setCardCount]     = useState(0)
  const [sightingCount, setSightingCount] = useState(0)
  const [loading, setLoading]         = useState(true)

  useSEO({
    title: profile ? `${profile.display_name || profile.username}'s Profile` : username ? `@${username}` : 'Witness Profile',
    description: profile
      ? `View ${profile.display_name || profile.username}'s LocaLore profile — their collected creatures, sightings, and folklore archive contributions.`
      : 'Explore a witness profile on LocaLore.',
    url: username ? `/profile/${username}` : undefined,
  })

  useEffect(() => {
    if (!username) { setLoading(false); return }
    const load = async () => {
      // Load profile
      const { data: prof } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .maybeSingle()
      if (!prof) { setLoading(false); return }
      setProfile(prof)

      // Parallel: published creatures, card count, sighting count
      const [{ data: cdata }, { count: cards }, { count: sightings }] = await Promise.all([
        supabase
          .from('creatures')
          .select('id, name, slug, image_url, region, country, creature_type, verified')
          .eq('submitted_by', prof.id)
          .eq('verified', true)
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('user_cards')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', prof.id),
        supabase
          .from('sighting_reports')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', prof.id),
      ])
      setCreatures((cdata ?? []) as any[])
      setCardCount(cards ?? 0)
      setSightingCount(sightings ?? 0)
      setLoading(false)
    }
    void load()
  }, [username])

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Eye className="h-5 w-5 text-amber-400/40 animate-pulse" /></div>
  if (!profile) return <div className="flex min-h-[60vh] items-center justify-center"><p className="font-ui text-sm text-parchment-muted">Witness not found in the archive.</p></div>

  return (
    <div className="min-h-screen bg-app-background px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* ── Profile header ── */}
        <div className="rounded-2xl border border-app-border bg-app-surface p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          <div className="h-24 w-24 shrink-0 rounded-xl overflow-hidden bg-void/20 flex items-center justify-center border border-app-border">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={profile.display_name || profile.username} className="h-full w-full object-cover" />
              : <Eye className="h-10 w-10 text-parchment-dim" />}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="font-heading text-2xl text-gold">{profile.display_name || profile.username}</h1>
            <p className="font-ui text-sm text-parchment-muted">@{profile.username}</p>
            {profile.bio && <p className="mt-3 font-body text-sm text-parchment-dim leading-relaxed">{profile.bio}</p>}
            <div className="mt-4">
              <XPBadge xp={profile.xp ?? 0} />
            </div>
          </div>
        </div>

        {/* ── Stat row ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: BookOpen,  label: 'Entries',   value: creatures.length },
            { icon: Layers,    label: 'Cards',      value: cardCount },
            { icon: Footprints, label: 'Sightings', value: sightingCount },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-app-border bg-app-surface p-4 flex flex-col items-center gap-1">
              <Icon className="h-4 w-4 text-parchment-muted/60" />
              <span className="font-heading text-xl text-gold">{value}</span>
              <span className="font-ui text-[10px] uppercase tracking-[0.25em] text-parchment-muted">{label}</span>
            </div>
          ))}
        </div>

        {/* ── Published creatures ── */}
        {creatures.length > 0 && (
          <div>
            <h2 className="font-heading text-lg text-gold mb-3">Archive Contributions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {creatures.map(c => (
                <Link
                  key={c.id}
                  to={`/creatures/${c.slug}`}
                  className="group rounded-xl border border-app-border bg-app-surface overflow-hidden hover:border-gold/30 transition-colors"
                >
                  <div className="aspect-video bg-void/40 overflow-hidden">
                    {c.image_url
                      ? <img src={c.image_url} alt={c.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <div className="h-full w-full flex items-center justify-center"><Eye className="h-6 w-6 text-parchment-dim/30" /></div>}
                  </div>
                  <div className="p-3">
                    <p className="font-heading text-sm text-gold truncate">{c.name}</p>
                    {c.region && <p className="font-ui text-[10px] text-parchment-muted/60 truncate">{c.region}{c.country ? ` · ${c.country}` : ''}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {creatures.length === 0 && (
          <div className="rounded-xl border border-app-border bg-app-surface p-8 text-center">
            <Eye className="h-6 w-6 text-parchment-dim/30 mx-auto mb-3" />
            <p className="font-ui text-sm text-parchment-muted">No archive contributions yet.</p>
          </div>
        )}

      </div>
    </div>
  )
}

export default PublicProfilePage

