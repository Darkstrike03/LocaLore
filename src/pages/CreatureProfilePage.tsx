import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Eye, BookMarked, Sword, ShieldAlert, Skull, Calendar, Tag, AlertTriangle } from 'lucide-react'
import type { Creature } from '../types/creature'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useSEO } from '../hooks/useSEO'
import DangerGauge from '../components/DangerGauge'
import CreatureReactions from '../components/CreatureReactions'
import WitnessAccounts from '../components/WitnessAccounts'
import BookmarkButton from '../components/BookmarkButton'
import CreatureGallery from '../components/CreatureGallery'
import RelatedCreatures from '../components/RelatedCreatures'
import SightingReportModal from '../components/SightingReportModal'
import ARSummonPreview from '../components/ARSummonPreview'
import ShareButton from '../components/ShareButton'

function CreatureProfilePage() {
  const { slug } = useParams<{ slug: string }>()
  const [creature, setCreature] = useState<Creature | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const [isModerator, setIsModerator] = useState(false)
  const [savingDanger, setSavingDanger] = useState(false)

  // Dynamic SEO
  useSEO({
    title: creature?.name,
    description: creature
      ? `${creature.name} — ${creature.creature_type.replace('_', ' ')} from ${creature.region ?? creature.country ?? 'the world'}. ${creature.description?.slice(0, 120)}…`
      : undefined,
    image: creature?.image_url,
    url: creature ? `/creatures/${creature.slug}` : undefined,
    type: 'article',
  })

  useEffect(() => {
    if (!slug) { setLoading(false); return }
    supabase
      .from('creatures')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setCreature(data as Creature)
        setLoading(false)
      })
  }, [slug])

  // check moderator status
  useEffect(() => {
    if (!user) return
    let mounted = true
    ;(async () => {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (!error && data && mounted) {
        setIsModerator(data.role?.toLowerCase() === 'moderator')
      }
    })()
    return () => { mounted = false }
  }, [user])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="relative flex h-10 w-10 items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-gold/30 animate-glow-pulse" />
            <Eye className="h-5 w-5 text-gold animate-flicker" />
          </span>
          <p className="font-heading text-xs uppercase tracking-[0.3em] text-parchment-muted">
            Summoning the record...
          </p>
        </div>
      </div>
    )
  }

  if (!creature) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <Skull className="h-10 w-10 text-parchment-dim" />
        <h1 className="font-heading text-xl text-gold">Entity not found.</h1>
        <p className="font-body text-sm text-parchment-muted">
          This creature has not surfaced in our records. It may have never existed — or it simply does not want to be found.
        </p>
        <Link to="/library" className="btn-ghost mt-2">
          <ArrowLeft className="h-3.5 w-3.5" />
          Return to the library
        </Link>
      </div>
    )
  }

  return (
    <article className="mx-auto max-w-5xl px-4 py-8 sm:px-6 animate-rise">

      {/* Back link */}
      <Link
        to="/library"
        className="mb-6 inline-flex items-center gap-1.5 font-ui text-[11px] uppercase tracking-[0.2em] text-parchment-muted hover:text-gold transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to library
      </Link>

      {/* Header */}
      <header className="mb-6 border-b border-app-border pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="section-label mb-2 flex items-center gap-1.5">
              <Eye className="h-3 w-3" />
              Archive Entry
            </p>
            <h1 className="font-heading text-3xl sm:text-4xl text-gold leading-tight break-words">
              {creature.name}
            </h1>
            {creature.alternate_names.length > 0 && (
              <p className="mt-1.5 font-body text-sm italic text-parchment-muted">
                Also known as: {creature.alternate_names.join(', ')}
              </p>
            )}
            <p className="mt-1 font-ui text-[11px] uppercase tracking-[0.28em] text-parchment-muted">
              {creature.region} · {creature.country}
            </p>
            {creature.locality && (
              <p className="mt-0.5 font-ui text-xs text-parchment-dim">{creature.locality}</p>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="badge-rune">
            <Skull className="h-2.5 w-2.5" />
            {creature.creature_type.replace('_', ' ')}
          </span>
          {!creature.verified && (
            <span className="flex items-center gap-1 rounded-full border border-crimson/50 bg-crimson-dark/30 px-2.5 py-0.5 font-ui text-[10px] uppercase tracking-widest text-crimson-DEFAULT/90">
              <AlertTriangle className="h-2.5 w-2.5" />
              Unverified
            </span>
          )}
          <span className="badge-rune">
            <Tag className="h-2.5 w-2.5" />
            {creature.source === 'user_submitted' ? 'Witness account' : 'Lore scan'}
          </span>
          <span className="badge-rune">
            <Calendar className="h-2.5 w-2.5" />
            Logged {new Date(creature.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
          </span>
        </div>

        {/* Danger gauge */}
        <div className="mt-4 flex items-center gap-4">
          <DangerGauge
            level={creature.danger_rating}
            editable={isModerator && !savingDanger}
            onChange={async (n) => {
              setSavingDanger(true)
              const { error } = await supabase
                .from('creatures')
                .update({ danger_rating: n })
                .eq('id', creature.id)
              if (!error) setCreature({ ...creature, danger_rating: n })
              setSavingDanger(false)
            }}
          />
          {isModerator && <span className="font-ui text-[10px] text-parchment-dim">(click skull to set danger)</span>}
        </div>

        {/* Actions row */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <BookmarkButton creatureId={creature.id} />
          <SightingReportModal creatureId={creature.id} creatureName={creature.name} />
          <ShareButton
            title={`${creature.name} — LocaLore`}
            description={creature.description?.slice(0, 120) + '…'}
            url={window.location.href}
          />
          <ARSummonPreview imageUrl={creature.image_url} creatureName={creature.name} creatureType={creature.creature_type} />
        </div>
      </header>

      {/* Body */}
      <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">

        {/* Main lore */}
        <div className="space-y-6">
          {[
            { key: 'description', icon: Eye, label: 'Description', text: creature.description },
            { key: 'origin', icon: BookMarked, label: 'Origin Story', text: creature.origin_story },
            { key: 'abilities', icon: Sword, label: 'Abilities & Powers', text: creature.abilities },
            { key: 'survival', icon: ShieldAlert, label: 'How to Survive an Encounter', text: creature.survival_tips },
          ].filter(s => s.text).map(({ key, icon: Icon, label, text }) => (
            <section key={key}>
              <h2 className="flex items-center gap-2 font-ui text-[11px] font-medium uppercase tracking-[0.3em] text-parchment-muted mb-2.5">
                <Icon className="h-3.5 w-3.5 text-gold/60" />
                {label}
              </h2>
              <div className="relative pl-4 border-l border-app-border">
                <p className="font-body text-[16px] leading-[1.75] text-parchment/85 whitespace-pre-line">
                  {text}
                </p>
              </div>
            </section>
          ))}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
        {/* Image gallery */}
          <CreatureGallery
            creatureId={creature.id}
            primaryImage={creature.image_url}
            creatureName={creature.name}
          />

          {/* Archive datestamp card */}
          <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3">
            <p className="font-ui text-[10px] uppercase tracking-[0.2em] text-parchment-muted">
              Archive record
            </p>
            <p className="mt-0.5 font-ui text-[11px] text-parchment-dim">
              Filed {new Date(creature.created_at).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </div>

          {/* Field notes */}
          <div className="rounded-xl border border-app-border bg-app-surface px-4 py-4">
            <h3 className="flex items-center gap-1.5 font-ui text-[10px] uppercase tracking-[0.3em] text-parchment-muted mb-2">
              <BookMarked className="h-3 w-3" />
              Field Notes
            </h3>
            <p className="font-body text-[14px] leading-relaxed text-parchment-muted">
              This profile is assembled from crowdsourced sightings and AI-collected folklore.
              Treat unverified details as rumor, not law. The archive grows — so does the truth.
            </p>
          </div>

          {/* Reactions */}
          <CreatureReactions creatureId={creature.id} />

          {/* Warning band for unverified */}
          {!creature.verified && (
            <div className="rounded-xl border border-crimson/30 bg-crimson-dark/20 px-4 py-4">
              <h3 className="flex items-center gap-1.5 font-ui text-[10px] uppercase tracking-[0.3em] text-crimson-DEFAULT/80 mb-1">
                <AlertTriangle className="h-3 w-3" />
                Unverified Entry
              </h3>
              <p className="font-body text-[13px] leading-relaxed text-parchment-muted">
                This entity has not been cross-referenced against primary sources. Proceed with caution.
              </p>
            </div>
          )}

          {/* Related creatures — removed from sidebar, now full-width below */}
        </aside>
      </div>

      {/* Cross-references — full width, always visible for mods */}
      <div className="mt-8 border-t border-app-border pt-8">
        <RelatedCreatures creature={creature} />
      </div>

      {/* Witness accounts — full width */}
      <div className="mt-10 border-t border-app-border pt-8">
        <WitnessAccounts creatureId={creature.id} />
      </div>

    </article>
  )
}

export default CreatureProfilePage

