export default function MapControls({
  mapMode,
  setMapMode,
}: {
  mapMode: 'dark' | 'satellite' | 'vector'
  setMapMode: (m: 'dark' | 'satellite' | 'vector') => void
}) {
  return (
    <div className="absolute right-4 top-4 z-50 flex items-center gap-2 rounded-xl border border-app-border bg-void/90 px-2 py-1 text-[12px] font-ui pointer-events-auto">
      <button
        className={`px-2 py-1 rounded ${mapMode === 'dark' ? 'bg-void/60 text-gold' : 'text-parchment-muted'}`}
        onClick={() => setMapMode('dark')}
        type="button"
        aria-pressed={mapMode === 'dark'}
      >
        Dark
      </button>
      <button
        className={`px-2 py-1 rounded ${mapMode === 'satellite' ? 'bg-void/60 text-gold' : 'text-parchment-muted'}`}
        onClick={() => setMapMode('satellite')}
        type="button"
        aria-pressed={mapMode === 'satellite'}
      >
        Satellite
      </button>
      <button
        className={`px-2 py-1 rounded ${mapMode === 'vector' ? 'bg-void/60 text-gold' : 'text-parchment-muted'}`}
        onClick={() => setMapMode('vector')}
        type="button"
        aria-pressed={mapMode === 'vector'}
      >
        Vector
      </button>
    </div>
  )
}
