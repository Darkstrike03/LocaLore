import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Eye, BookMarked, Sword, ShieldAlert, Skull, Calendar, Tag, AlertTriangle } from 'lucide-react'
import { mockCreatures } from '../data/mockCreatures'

function CreatureProfilePage() {
  const { id } = useParams<{ id: string }>()

  const creature = useMemo(
    () => mockCreatures.find((c) => c.id === id),
    [id],
  )

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
          {/* Image card */}
          <div className="overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-void-deep">
            <div className="relative h-52 bg-gradient-to-br from-app-surfaceElevated via-app-surface to-void">
              {creature.image_url ? (
                <img
                  src={creature.image_url}
                  alt={creature.name}
                  className="h-full w-full object-cover opacity-80"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                  <Eye className="h-8 w-8 text-parchment-dim/30" />
                  <span className="font-ui text-[10px] uppercase tracking-[0.4em] text-parchment-dim/30">
                    No trace captured
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-app-surface/80 to-transparent" />
            </div>
            <div className="border-t border-app-border px-4 py-3">
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
        </aside>
      </div>
    </article>
  )
}

export default CreatureProfilePage

