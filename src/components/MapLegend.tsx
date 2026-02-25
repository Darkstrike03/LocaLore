export default function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-50 flex flex-col gap-1.5 rounded-xl border border-app-border bg-void/90 backdrop-blur-xl px-3 py-2.5 text-[10px] font-ui pointer-events-auto">
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full border border-gold bg-app-surface" />
        <span className="text-parchment-muted uppercase tracking-wider">Verified</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full border border-crimson bg-app-surface" />
        <span className="text-parchment-muted uppercase tracking-wider">Unverified</span>
      </div>
    </div>
  )
}
