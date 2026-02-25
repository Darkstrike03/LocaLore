import { useState } from 'react'
import { MapContainer as RLMapContainer, Marker, Popup, TileLayer as RLTileLayer } from 'react-leaflet'
import type { Creature } from '../types/creature'
import { mockCreatures } from '../data/mockCreatures'

const JAPAN_CENTER: [number, number] = [36.2, 138.2]

function HomePage() {
  const [selected, setSelected] = useState<Creature | null>(null)

  const Map: any = RLMapContainer
  const DarkTile: any = RLTileLayer

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-black">
      <div className="relative flex-1">
        <Map
          center={JAPAN_CENTER}
          zoom={5}
          className="h-full w-full"
          zoomControl={true}
        >
          <DarkTile
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {mockCreatures.map((creature) => (
            <Marker
              key={creature.id}
              position={[creature.latitude, creature.longitude]}
              eventHandlers={{
                click: () => setSelected(creature),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-gothic text-base font-semibold text-amber-400">
                    {creature.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {creature.region}, {creature.country}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </Map>
      </div>

      <aside className="hidden w-96 border-l border-slate-900 bg-gradient-to-b from-black/90 to-slate-950/95 p-4 text-sm text-slate-200 md:block">
        {selected ? (
          <div className="flex h-full flex-col gap-3">
            <div>
              <h2 className="font-gothic text-2xl font-semibold text-amber-400">
                {selected.name}
              </h2>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                {selected.region} · {selected.country}
              </p>
              <p className="mt-1 text-xs text-slate-400">{selected.locality}</p>
            </div>
            {!selected.verified && (
              <span className="self-start rounded-full border border-amber-500/50 bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
                Unverified entry
              </span>
            )}
            <div className="mt-2 space-y-2 text-xs leading-relaxed">
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Description
                </h3>
                <p>{selected.description}</p>
              </section>
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Origin Story
                </h3>
                <p>{selected.origin_story}</p>
              </section>
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Abilities
                </h3>
                <p>{selected.abilities}</p>
              </section>
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Survival Tips
                </h3>
                <p>{selected.survival_tips}</p>
              </section>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-start justify-center gap-3 text-xs text-slate-300">
            <p className="font-gothic text-lg text-amber-300">
              Trace the echoes on the map.
            </p>
            <p>
              Tap any glowing point over Japan to reveal local yokai, their legends, and
              how to walk away from an encounter.
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}

export default HomePage

