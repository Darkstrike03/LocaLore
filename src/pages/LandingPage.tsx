import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Eye, MapPin, Scroll, Skull, Users, FileText,
  ChevronDown, ChevronRight, ShieldAlert, BookMarked, Camera,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { Creature } from '../types/creature'

// â”€â”€â”€ IntersectionObserver hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function useVisible(threshold = 0.35) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

// â”€â”€â”€ Count-up (fires when triggered) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Counter({ target, trigger }: { target: number; trigger: boolean }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!trigger || target === 0) return
    let f = 0
    const FRAMES = 60
    const tick = () => {
      f++
      const ease = 1 - Math.pow(1 - f / FRAMES, 3)
      setN(Math.round(ease * target))
      if (f < FRAMES) requestAnimationFrame(tick)
    }
    const id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [trigger, target])
  return <>{n.toLocaleString()}</>
}

// â”€â”€â”€ Redacted text â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Redacted({ children }: { children: React.ReactNode }) {
  return (
    <span
      title="[REDACTED]"
      className="cursor-default select-none rounded-sm bg-parchment/25 px-0.5 text-transparent"
    >
      {children}
    </span>
  )
}

// â”€â”€â”€ Section wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Scene({ id, children, className = '' }: {
  id: string; children: React.ReactNode; className?: string
}) {
  return (
    <section
      id={id}
      className={`relative flex h-[calc(100dvh-3.5rem)] snap-start snap-always flex-col overflow-hidden ${className}`}
    >
      {children}
    </section>
  )
}

// â”€â”€â”€ Creature card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CreatureCard({ creature, delay }: { creature: Creature; delay: number }) {
  const { ref, visible } = useVisible(0.1)
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <Link
        to={`/creatures/${creature.slug}`}
        className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-app-border bg-app-surface p-5 hover:border-gold/50 hover:shadow-gold-glow transition-all duration-300"
      >
        <div className="absolute top-0 right-0 h-8 w-8 overflow-hidden rounded-tr-xl pointer-events-none">
          <div className="absolute -top-4 -right-4 h-8 w-8 rotate-45 bg-gold/6 group-hover:bg-gold/14 transition-colors" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold/20 bg-app-background">
            <Skull className="h-4 w-4 text-gold/70" />
          </div>
          <div>
            <p className="font-heading text-base text-gold leading-tight">{creature.name}</p>
            <p className="font-ui text-[9px] uppercase tracking-[0.25em] text-parchment-muted mt-0.5">
              {creature.region} Â· {creature.country}
            </p>
          </div>
        </div>
        {creature.description && (
          <p className="font-body text-[13px] text-parchment/70 leading-relaxed line-clamp-3">
            {creature.description}
          </p>
        )}
        <div className="mt-auto flex items-center gap-1 font-ui text-[9px] uppercase tracking-[0.2em] text-gold/50 group-hover:text-gold/80 transition-colors">
          Full entry <ChevronRight className="h-2.5 w-2.5" />
        </div>
      </Link>
    </div>
  )
}

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function LandingPage() {
  const [stats, setStats] = useState({ creatures: 0, sightings: 0, witnesses: 0 })
  const [recent, setRecent] = useState<Creature[]>([])

  const scene2 = useVisible(0.3)
  const scene3 = useVisible(0.3)
  const scene4 = useVisible(0.3)
  const scene5 = useVisible(0.4)

  useEffect(() => {
    Promise.all([
      supabase.from('creatures').select('id', { count: 'exact', head: true }),
      supabase.from('sighting_reports').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('creatures').select('*').order('created_at', { ascending: false }).limit(3),
    ]).then(([c, s, u, rc]) => {
      setStats({ creatures: c.count ?? 0, sightings: s.count ?? 0, witnesses: u.count ?? 0 })
      if (rc.data) setRecent(rc.data as Creature[])
    })
  }, [])

  return (
    <>
      {/* â”€â”€ outer scroll-snap container â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className="h-[calc(100dvh-3.5rem)] snap-y snap-mandatory overflow-y-scroll"
        style={{ scrollbarWidth: 'none' }}
      >

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• SCENE 1 â€” THE SUMMONS â•â• */}
        <Scene id="summons" className="items-center justify-center bg-void">

          {/* Ambient radial glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/[0.03] blur-[120px]" />
            <div className="absolute left-1/3 bottom-1/4 h-[300px] w-[300px] rounded-full bg-crimson/[0.04] blur-[80px]" />
          </div>

          {/* Faint rune grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: 'linear-gradient(to right, #C8A84B 1px, transparent 1px), linear-gradient(to bottom, #C8A84B 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />

          {/* Sequential text lines â€” pure CSS delays */}
          <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-0 text-center px-4">

            <div className="overflow-hidden mb-1">
              <p
                className="font-heading text-[11px] uppercase tracking-[0.5em] text-parchment-dim/60"
                style={{ animation: 'land-rise 0.8s ease forwards', animationDelay: '0.1s', opacity: 0 }}
              >
                Archive Â· Entry Â· 0001
              </p>
            </div>

            <div className="overflow-hidden mt-6">
              <h1
                className="font-heading text-4xl sm:text-5xl lg:text-6xl text-gold leading-none tracking-[0.04em]"
                style={{ animation: 'land-rise 1s ease forwards', animationDelay: '0.5s', opacity: 0 }}
              >
                The creatures were here
              </h1>
            </div>
            <div className="overflow-hidden">
              <h1
                className="font-heading text-4xl sm:text-5xl lg:text-6xl text-parchment/40 italic leading-none tracking-[0.04em]"
                style={{ animation: 'land-rise 1s ease forwards', animationDelay: '1.1s', opacity: 0 }}
              >
                before your maps were drawn.
              </h1>
            </div>

            <div
              className="my-8 relative flex h-14 w-14 items-center justify-center"
              style={{ animation: 'land-rise 0.8s ease forwards', animationDelay: '1.9s', opacity: 0 }}
            >
              <span className="absolute h-14 w-14 rounded-full border border-gold/20 animate-glow-pulse" />
              <span className="absolute h-10 w-10 rounded-full bg-app-surface border border-gold/30" />
              <Eye className="relative h-5 w-5 text-gold drop-shadow-gold animate-flicker" />
            </div>

            <div
              style={{ animation: 'land-rise 0.8s ease forwards', animationDelay: '2.4s', opacity: 0 }}
            >
              <p className="font-heading text-sm sm:text-base uppercase tracking-[0.35em] text-gold/80">
                LocaLore
              </p>
              <p className="font-ui text-[10px] uppercase tracking-[0.2em] text-parchment-muted/60 mt-0.5">
                Forbidden Folklore Archive
              </p>
            </div>

            <p
              className="mt-5 font-body text-base sm:text-lg text-parchment-muted/80 max-w-lg leading-relaxed"
              style={{ animation: 'land-rise 0.8s ease forwards', animationDelay: '3.0s', opacity: 0 }}
            >
              A living bestiary stitched from oral tradition, witness accounts, and records that never made it into print.
              {' '}
              <span className="italic text-parchment/50">Some entries arrived on their own.</span>
            </p>

            <div
              className="mt-7 flex flex-wrap justify-center gap-3"
              style={{ animation: 'land-rise 0.8s ease forwards', animationDelay: '3.6s', opacity: 0 }}
            >
              <Link to="/map" className="btn-summon px-7 py-2.5 text-[12px]">
                <MapPin className="h-3.5 w-3.5" />
                Enter the Archive
              </Link>
              <Link to="/submit" className="btn-ghost px-6 py-2.5 text-[12px]">
                <Scroll className="h-3.5 w-3.5" />
                File a Sighting
              </Link>
            </div>

            {stats.creatures > 0 && (
              <div
                className="mt-6 flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-4 py-1.5"
                style={{ animation: 'land-rise 0.8s ease forwards', animationDelay: '4.1s', opacity: 0 }}
              >
                <Eye className="h-2.5 w-2.5 text-gold/70" />
                <span className="font-ui text-[9px] uppercase tracking-[0.3em] text-gold/70">
                  {stats.creatures.toLocaleString()} entities catalogued Â· 0 of them verified safe
                </span>
              </div>
            )}
          </div>

          {/* Scroll nudge */}
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
            style={{ animation: 'land-rise 0.5s ease forwards', animationDelay: '4.8s', opacity: 0 }}
          >
            <span className="font-ui text-[8px] uppercase tracking-[0.4em] text-parchment-dim/40">Scroll</span>
            <ChevronDown className="h-4 w-4 text-gold/30 animate-bounce" />
          </div>
        </Scene>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• SCENE 2 â€” THE RECORD â•â• */}
        <Scene id="record" className="items-center justify-center bg-app-background">

          {/* Coordinate scatter */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.04]">
            {['35.6Â°N 139.7Â°E','51.5Â°N 0.1Â°W','48.8Â°N 2.3Â°E','13.7Â°N 100.5Â°E',
              '35.2Â°N 136.9Â°E','22.3Â°N 114.2Â°E','40.7Â°N 74.0Â°W','55.7Â°N 37.6Â°E'].map((coord, i) => (
              <span key={i} className="absolute font-mono text-[10px] text-gold"
                style={{ left: `${8 + (i * 11) % 84}%`, top: `${10 + (i * 17) % 78}%` }}>
                {coord}
              </span>
            ))}
          </div>

          <div ref={scene2.ref} className="relative z-10 mx-auto max-w-3xl w-full px-6 text-center">
            <div className={`transition-all duration-700 ${scene2.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <p className="section-label mb-2 flex items-center justify-center gap-1.5">
                <Eye className="h-3 w-3" /> The Record
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl text-gold leading-tight mb-3">
                The record is older than the archive.
              </h2>
              <p className="font-body text-parchment-muted/80 text-base max-w-xl mx-auto leading-relaxed mb-8">
                We are simply the ones who started writing it down.
                Some entries are <Redacted>voluntarily withheld</Redacted>.
                {' '}Most creatures don't know they have a file.{' '}
                <span className="italic text-parchment/50">Several left notes.</span>
              </p>
            </div>

            <div className={`grid grid-cols-3 gap-4 sm:gap-8 mb-10 transition-all duration-700 delay-200 ${scene2.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {[
                { icon: Skull, value: stats.creatures, label: 'Entities catalogued', note: '0 of them signed a release form' },
                { icon: FileText, value: stats.sightings, label: 'Sightings filed', note: 'Verified by the archive. Loosely.' },
                { icon: Users, value: stats.witnesses, label: 'Witnesses registered', note: 'The others prefer anonymity' },
              ].map(({ icon: Icon, value, label, note }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 text-gold">
                    <Icon className="h-4 w-4 text-gold/60" />
                    <span className="font-heading text-3xl sm:text-4xl tracking-tight">
                      <Counter target={value} trigger={scene2.visible} />
                    </span>
                  </div>
                  <span className="font-ui text-[10px] uppercase tracking-[0.25em] text-parchment-muted">{label}</span>
                  <span className="font-ui text-[8px] text-parchment-dim/40 italic hidden sm:block">{note}</span>
                </div>
              ))}
            </div>

            <div className={`flex flex-wrap justify-center gap-2 mb-8 transition-all duration-700 delay-400 ${scene2.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              {['Japan','India','Europe','South-East Asia','Americas','Africa','+ more'].map(r => (
                <span key={r} className="rounded-full border border-gold/20 bg-gold/5 px-3 py-1 font-ui text-[9px] uppercase tracking-[0.25em] text-gold/60">{r}</span>
              ))}
            </div>

            <div className={`transition-all duration-700 delay-500 ${scene2.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <Link to="/map" className="btn-summon inline-flex mx-auto px-7 py-2.5 text-[12px]">
                <MapPin className="h-3.5 w-3.5" /> Open the Map
              </Link>
            </div>
          </div>
        </Scene>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• SCENE 3 â€” WITNESSED â•â• */}
        <Scene id="witnessed" className="items-center justify-center bg-void">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-crimson/[0.03] blur-[100px]" />
          </div>

          <div ref={scene3.ref} className="relative z-10 mx-auto max-w-4xl w-full px-4 sm:px-6">
            <div className={`mb-6 text-center transition-all duration-700 ${scene3.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <p className="section-label mb-1.5 flex items-center justify-center gap-1.5">
                <Eye className="h-3 w-3" /> Recently surfaced
              </p>
              <h2 className="font-heading text-2xl sm:text-3xl text-gold">
                The following have been reported.
              </h2>
              <p className="mt-1.5 font-ui text-[10px] uppercase tracking-[0.25em] text-parchment-dim/50">
                The archive does not confirm nor deny their continued activity.
              </p>
            </div>

            {recent.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-3 mb-5">
                {recent.map((c, i) => <CreatureCard key={c.id} creature={c} delay={i * 150} />)}
              </div>
            ) : (
              <div className="mb-5 text-center">
                <p className="font-ui text-[11px] text-parchment-dim/40 uppercase tracking-[0.2em]">Connecting to archiveâ€¦</p>
              </div>
            )}

            <div className={`mx-auto max-w-2xl transition-all duration-700 delay-500 ${scene3.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <div className="rounded-xl border border-app-border/50 bg-app-surface/50 px-5 py-4">
                <p className="font-ui text-[8px] uppercase tracking-[0.3em] text-parchment-muted/40 mb-2">Archive note Â· Witness testimonial</p>
                <p className="font-body text-sm text-parchment/60 leading-relaxed italic">
                  "I bowed, as most accounts suggested. It bowed back. The water in its head stayed perfectly still.
                  I don't know what that means.{' '}
                  <span className="not-italic">â€” Witness <Redacted>â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ</Redacted>, <Redacted>Iwate Prefecture</Redacted>, 2021"</span>
                </p>
              </div>
              <div className="mt-4 flex justify-center gap-4">
                <Link to="/library" className="btn-ghost inline-flex text-[11px] py-1.5 px-4">
                  Browse all entries <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </Scene>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• SCENE 4 â€” THE ORDER â•â• */}
        <Scene id="order" className="items-center justify-center bg-app-background">
          <div ref={scene4.ref} className="relative z-10 mx-auto max-w-4xl w-full px-4 sm:px-6">
            <div className={`mb-6 text-center transition-all duration-700 ${scene4.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <p className="section-label mb-1.5 flex items-center justify-center gap-1.5">
                <BookMarked className="h-3 w-3" /> What you gain
              </p>
              <h2 className="font-heading text-2xl sm:text-3xl text-gold">
                Those who enter the archive receive:
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              {[
                { icon: MapPin, title: 'A cursed atlas', body: 'Glowing pins. Every one a fragment of a much older map â€” one that predates any country that claims the land.', delay: 0 },
                { icon: FileText, title: 'The right to file', body: "Did you see something? The archive is accepting accounts. It doesn't need you to believe what you saw. It already does.", delay: 120 },
                { icon: ShieldAlert, title: 'Survival notes', body: 'Each entry carries them. Following them is, strictly speaking, not a condition of membership.', delay: 240 },
                { icon: Camera, title: 'AR Conjuring', body: 'Point your phone at reality. Summon the creature on top of it. We accept no liability for what happens next.', delay: 360 },
              ].map(({ icon: Icon, title, body, delay }) => (
                <div
                  key={title}
                  className={`group relative overflow-hidden rounded-xl border border-app-border bg-app-surface p-5 hover:border-gold/30 hover:shadow-gold-glow transition-all duration-700 ${scene4.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{ transitionDelay: scene4.visible ? `${delay}ms` : '0ms' }}
                >
                  <div className="absolute top-0 right-0 h-8 w-8 overflow-hidden rounded-tr-xl pointer-events-none">
                    <div className="absolute -top-4 -right-4 h-8 w-8 rotate-45 bg-gold/5 group-hover:bg-gold/10 transition-colors" />
                  </div>
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg border border-gold/20 bg-app-background">
                    <Icon className="h-4 w-4 text-gold" />
                  </div>
                  <h3 className="font-heading text-[11px] uppercase tracking-[0.2em] text-gold mb-1.5">{title}</h3>
                  <p className="font-body text-[13px] text-parchment-muted leading-relaxed">{body}</p>
                </div>
              ))}
            </div>

            <div className={`text-center transition-all duration-700 delay-500 ${scene4.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <p className="font-ui text-[10px] uppercase tracking-[0.25em] text-parchment-dim/35 italic">
                "This is not a community. Communities have exits. We have sightings."
              </p>
            </div>
          </div>
        </Scene>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• SCENE 5 â€” THE DOOR â•â• */}
        <Scene id="door" className="items-center justify-center bg-void">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/[0.05] blur-[100px]" />
          </div>

          <div ref={scene5.ref} className="relative z-10 mx-auto flex max-w-md flex-col items-center gap-6 px-4 text-center">
            <div className={`relative flex h-24 w-24 items-center justify-center transition-all duration-1000 ${scene5.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
              <span className="absolute h-24 w-24 rounded-full border border-gold/15 animate-glow-pulse" />
              <span className="absolute h-16 w-16 rounded-full border border-gold/25" />
              <span className="absolute h-10 w-10 rounded-full bg-app-surface border border-gold/30" />
              <Eye className="relative h-7 w-7 text-gold drop-shadow-gold animate-flicker" />
            </div>

            <div className={`transition-all duration-700 delay-300 ${scene5.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h2 className="font-heading text-3xl sm:text-4xl text-gold mb-3">
                The door has been open
                <br />
                <span className="text-parchment/40 italic">for some time.</span>
              </h2>
              <p className="font-body text-parchment-muted/80 leading-relaxed">
                You've been reading long enough to know what to do.
                <br />
                <span className="text-parchment/50 text-sm italic">No prior knowledge of the occult required. It helps, apparently.</span>
              </p>
            </div>

            <div className={`transition-all duration-700 delay-500 ${scene5.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <Link to="/map" className="btn-summon px-10 py-3 text-sm">
                <Eye className="h-4 w-4" /> Begin
              </Link>
            </div>

            <div className={`flex gap-4 transition-all duration-700 delay-700 ${scene5.visible ? 'opacity-100' : 'opacity-0'}`}>
              {[{to:'/about',l:'About'},{to:'/submit',l:'Submit'},{to:'/library',l:'Library'},{to:'/privacy',l:'Privacy'}].map(({to,l}) => (
                <Link key={to} to={to} className="font-ui text-[9px] uppercase tracking-[0.25em] text-parchment-dim/40 hover:text-gold/70 transition-colors">{l}</Link>
              ))}
            </div>

            <p className={`font-heading text-[9px] tracking-[0.4em] text-parchment-dim/20 uppercase transition-all duration-700 delay-900 ${scene5.visible ? 'opacity-100' : 'opacity-0'}`}>
              LocaLore Â· Forbidden Folklore Archive
            </p>
          </div>
        </Scene>

      </div>

      <style>{`
        @keyframes land-rise {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
