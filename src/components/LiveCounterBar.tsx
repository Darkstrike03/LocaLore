import { useState, useEffect, useRef } from 'react'
import { Skull, FileText, Users } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

interface Counts {
  creatures: number
  sightings: number
  witnesses: number
}

// ─── Animated number (eases to new value when it changes) ─────────────────────
function AnimatedCount({ value }: { value: number }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)

  useEffect(() => {
    if (value === prev.current) return
    const start = prev.current
    const end = value
    const FRAMES = 40
    let f = 0
    const tick = () => {
      f++
      const ease = 1 - Math.pow(1 - f / FRAMES, 3)
      setDisplay(Math.round(start + (end - start) * ease))
      if (f < FRAMES) requestAnimationFrame(tick)
      else prev.current = end
    }
    requestAnimationFrame(tick)
  }, [value])

  return <>{display.toLocaleString()}</>
}

const ITEMS = [
  { icon: Skull,    key: 'creatures' as const, label: 'entities catalogued' },
  { icon: FileText, key: 'sightings' as const, label: 'sightings filed'     },
  { icon: Users,    key: 'witnesses' as const, label: 'witnesses registered' },
]

export default function LiveCounterBar() {
  const [counts, setCounts] = useState<Counts>({ creatures: 0, sightings: 0, witnesses: 0 })
  const [pulse, setPulse] = useState(false)

  async function fetchCounts() {
    const [c, s, u] = await Promise.all([
      supabase.from('creatures').select('id', { count: 'exact', head: true }),
      supabase.from('sighting_reports').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }),
    ])
    setCounts({
      creatures: c.count ?? 0,
      sightings: s.count ?? 0,
      witnesses: u.count ?? 0,
    })
    setPulse(true)
    setTimeout(() => setPulse(false), 600)
  }

  useEffect(() => {
    fetchCounts()
    const id = setInterval(fetchCounts, 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative z-40 border-b border-app-border/60 bg-void/80 backdrop-blur-md overflow-hidden">

      {/* Subtle top shimmer line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

      <div className="mx-auto flex max-w-7xl items-center justify-center gap-0 px-4 sm:px-6">

        {ITEMS.map(({ icon: Icon, key, label }, i) => (
          <div key={key} className="flex items-center">

            {/* Separator */}
            {i > 0 && (
              <span className="mx-3 sm:mx-5 h-3 w-px bg-app-border/60 shrink-0" />
            )}

            {/* Stat pill */}
            <div className="flex items-center gap-1.5 py-1.5">
              <Icon className="h-2.5 w-2.5 text-gold/50 shrink-0" />
              <span
                className={`font-heading text-[11px] text-gold tabular-nums transition-all duration-300 ${
                  pulse ? 'opacity-80' : 'opacity-100'
                }`}
              >
                <AnimatedCount value={counts[key]} />
              </span>
              <span className="hidden sm:inline font-ui text-[8px] uppercase tracking-[0.25em] text-parchment-dim/50">
                {label}
              </span>
            </div>
          </div>
        ))}

        {/* Live dot */}
        <span className="ml-4 flex items-center gap-1 shrink-0">
          <span
            className={`block h-1.5 w-1.5 rounded-full bg-gold/60 transition-opacity duration-300 ${
              pulse ? 'opacity-100' : 'opacity-40'
            }`}
            style={{ boxShadow: '0 0 4px rgba(200,168,75,0.6)' }}
          />
          <span className="hidden sm:inline font-ui text-[7px] uppercase tracking-[0.4em] text-parchment-dim/30">
            Live
          </span>
        </span>

      </div>
    </div>
  )
}
