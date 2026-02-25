import { useState, useEffect } from 'react'
import { MapContainer as RLMapContainer, Marker as RLMarker, Popup, TileLayer as RLTileLayer } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import { Eye, MapPin, Skull, ShieldAlert, Sword, BookMarked, ChevronRight } from 'lucide-react'
import type { Creature } from '../types/creature'
import { supabase } from '../lib/supabaseClient'

const WORLD_CENTER: [number, number] = [25, 20]

/** Build a custom leaflet DivIcon — glowing eye rune */
function makeCreatureIcon(verified: boolean) {
  const color = verified ? '#C8A84B' : '#8B1111'
  const glow = verified ? 'rgba(200,168,75,0.6)' : 'rgba(139,17,17,0.6)'
  const html = `
    <div style="
      width:28px; height:28px;
      position:relative;
      display:flex; align-items:center; justify-content:center;
    ">
      <!-- outer pulse ring -->
      <span style="
        position:absolute; inset:-4px;
        border-radius:50%;
        border:1px solid ${color};
        opacity:0.4;
        animation:pin-pulse 2.2s ease-in-out infinite;
      "></span>
      <!-- main circle -->
      <span style="
        width:20px; height:20px;
        border-radius:50%;
        background:#0C0C12;
        border: 1.5px solid ${color};
        box-shadow: 0 0 10px ${glow}, inset 0 0 6px rgba(0,0,0,0.8);
        display:flex; align-items:center; justify-content:center;
        position:relative;
      ">
        <!-- SVG Eye -->
        <svg viewBox="0 0 16 16" width="10" height="10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="8" cy="8" rx="6" ry="4" stroke="${color}" stroke-width="1.2"/>
          <circle cx="8" cy="8" r="2.5" fill="${color}" opacity="0.9"/>
          <circle cx="8" cy="8" r="1.2" fill="#0C0C12"/>
        </svg>
      </span>
      <!-- drop pin tail -->
      <span style="
        position:absolute; bottom:-6px; left:50%;
        transform:translateX(-50%);
        width:2px; height:6px;
        background: linear-gradient(to bottom, ${color}, transparent);
      "></span>
    </div>
  `
  return L.divIcon({
    html,
    className: '',
    iconSize: [28, 34],
    iconAnchor: [14, 34],
    popupAnchor: [0, -36],
  })
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  description: <Eye className="h-3 w-3" />,
  origin: <BookMarked className="h-3 w-3" />,
  abilities: <Sword className="h-3 w-3" />,
  survival: <ShieldAlert className="h-3 w-3" />,
}

function HomePage() {
  const [creatures, setCreatures] = useState<Creature[]>([])
  const [mapLoading, setMapLoading] = useState(true)
  const [selected, setSelected] = useState<Creature | null>(null)
  const [sidebarVisible, setSidebarVisible] = useState(false)

  useEffect(() => {
    supabase
      .from('creatures')
      .select('*')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .then(({ data, error }) => {
        if (!error && data) setCreatures(data as Creature[])
        setMapLoading(false)
      })
  }, [])

  const Map: any = RLMapContainer
  const DarkTile: any = RLTileLayer
  const RMarker: any = RLMarker

  const handleSelect = (c: Creature) => {
    setSelected(c)
    setSidebarVisible(true)
  }

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] flex-col md:flex-row bg-void overflow-hidden">

      {/* ── MAP ── */}
      <div className="relative flex-1 min-h-[55vh] md:min-h-0 z-0">
        <Map
          center={WORLD_CENTER}
          zoom={3}
          minZoom={2}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={false}
        >
          <DarkTile
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {mapLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-void/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <span className="relative flex h-10 w-10 items-center justify-center">
                  <span className="absolute inset-0 rounded-full border border-gold/30 animate-glow-pulse" />
                  <Eye className="h-5 w-5 text-gold animate-flicker" />
                </span>
                <p className="font-heading text-[10px] uppercase tracking-[0.3em] text-parchment-muted">
                  Consulting the archive...
                </p>
              </div>
            </div>
          )}
          {creatures.map((creature) => (
            <RMarker
              key={creature.id}
              position={[creature.latitude, creature.longitude]}
              icon={makeCreatureIcon(creature.verified)}
              eventHandlers={{ click: () => handleSelect(creature) }}
            >
              <Popup>
                <div className="px-3 py-2.5 min-w-[140px]">
                  <div className="font-heading text-sm text-gold leading-tight">
                    {creature.name}
                  </div>
                  <div className="mt-0.5 text-[10px] font-ui uppercase tracking-[0.2em] text-parchment-muted">
                    {creature.region} · {creature.country}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-parchment-muted">
                    {!creature.verified && (
                      <span className="rounded-full border border-crimson/50 bg-crimson-dark/40 px-1.5 py-0.5 uppercase tracking-wide text-crimson-DEFAULT/90">
                        Unverified
                      </span>
                    )}
                  </div>
                </div>
              </Popup>
            </RMarker>
          ))}
        </Map>

        {/* Map UI overlays */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-void/60 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-void/40 to-transparent" />

        {/* Map legend */}
        <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 rounded-xl border border-app-border bg-void/90 backdrop-blur-xl px-3 py-2.5 text-[10px] font-ui">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-gold bg-app-surface" />
            <span className="text-parchment-muted uppercase tracking-wider">Verified</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-crimson bg-app-surface" />
            <span className="text-parchment-muted uppercase tracking-wider">Unverified</span>
          </div>
        </div>

        {/* Mobile: open sidebar button */}
        {selected && !sidebarVisible && (
          <button
            type="button"
            onClick={() => setSidebarVisible(true)}
            className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-xl border border-gold/40 bg-void/95 backdrop-blur-xl px-4 py-2.5 font-heading text-xs tracking-[0.2em] uppercase text-gold shadow-gold-glow md:hidden"
          >
            <Eye className="h-3.5 w-3.5" />
            View lore
          </button>
        )}
      </div>

      {/* ── SIDEBAR ── */}
      <aside
        className={`
          absolute inset-x-0 bottom-0 z-20 flex flex-col
          md:relative md:inset-auto md:z-auto
          md:w-[360px] lg:w-[400px] xl:w-[440px]
          border-t border-app-border md:border-t-0 md:border-l md:border-app-border
          bg-void/98 md:bg-void backdrop-blur-2xl
          transition-all duration-500
          ${sidebarVisible ? 'max-h-[70vh] md:max-h-none' : 'max-h-0 overflow-hidden md:max-h-none md:overflow-auto'}
        `}
        aria-label="Creature detail panel"
      >

        {/* Mobile close handle */}
        <div
          className="flex md:hidden items-center justify-between border-b border-app-border px-4 py-2"
        >
          <span className="font-heading text-[10px] uppercase tracking-[0.3em] text-parchment-muted">
            Lore entry
          </span>
          <button
            type="button"
            aria-label="Close panel"
            onClick={() => setSidebarVisible(false)}
            className="text-parchment-muted hover:text-parchment"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
          {selected ? (
            <div className="flex flex-col gap-4 animate-rise">

              {/* Header */}
              <div>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="font-heading text-xl text-gold leading-tight break-words">
                    {selected.name}
                  </h2>
                  {!selected.verified && (
                    <span className="shrink-0 rounded-full border border-crimson/50 bg-crimson-dark/30 px-2 py-0.5 font-ui text-[9px] uppercase tracking-widest text-crimson-DEFAULT/90">
                      Unverified
                    </span>
                  )}
                </div>
                <p className="mt-1 font-ui text-[10px] uppercase tracking-[0.28em] text-parchment-muted">
                  {selected.region} · {selected.country}
                </p>
                {selected.locality && (
                  <p className="mt-0.5 font-ui text-[10px] text-parchment-dim">
                    {selected.locality}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="badge-rune">
                    <Skull className="h-2.5 w-2.5" />
                    {selected.creature_type.replace('_', ' ')}
                  </span>
                  {selected.source === 'user_submitted' && (
                    <span className="badge-rune">witness account</span>
                  )}
                </div>
              </div>

              {/* Rune divider */}
              <div className="rune-divider">
                <Eye className="h-3 w-3 text-parchment-dim flex-shrink-0" />
              </div>

              {/* Lore sections */}
              {[
                { key: 'description', label: 'Description', icon: SECTION_ICONS.description, text: selected.description },
                { key: 'origin', label: 'Origin', icon: SECTION_ICONS.origin, text: selected.origin_story },
                { key: 'abilities', label: 'Abilities', icon: SECTION_ICONS.abilities, text: selected.abilities },
                { key: 'survival', label: 'Survival', icon: SECTION_ICONS.survival, text: selected.survival_tips },
              ].filter(s => s.text).map((section) => (
                <div key={section.key}>
                  <h3 className="flex items-center gap-1.5 font-ui text-[10px] font-medium uppercase tracking-[0.3em] text-parchment-muted mb-1.5">
                    {section.icon}
                    {section.label}
                  </h3>
                  <p className="font-body text-[15px] leading-relaxed text-parchment/80">
                    {section.text}
                  </p>
                </div>
              ))}

              {/* Link to full profile */}
              <Link
                to={`/creatures/${selected.slug}`}
                className="btn-summon mt-2 w-full justify-center"
              >
                Full Archive Entry
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            /* Empty state */
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-4 text-center px-2">
              <div className="relative">
                <span className="absolute inset-0 rounded-full border border-gold/20 animate-glow-pulse" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-app-surface">
                  <MapPin className="h-6 w-6 text-gold/60" />
                </div>
              </div>
              <div>
                <p className="font-heading text-base text-gold/80">
                  Trace the echoes.
                </p>
                <p className="mt-1.5 font-body text-[13px] text-parchment-muted leading-relaxed">
                  Select any glowing marker on the map to summon a creature from the archive.
                </p>
              </div>
              <Link to="/library" className="btn-ghost text-xs mt-1">
                Browse the bestiary
              </Link>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

export default HomePage

