/** Animated placeholder that matches the proportions of a CardDisplay block. */
export default function SkeletonCard() {
  return (
    <div className="rounded-xl border border-app-border bg-app-surface p-4 animate-pulse">
      {/* Card image area */}
      <div className="mx-auto mb-4 h-40 w-28 rounded-lg bg-void/30" />
      {/* Title line */}
      <div className="h-3 w-3/4 mx-auto rounded bg-void/20 mb-2" />
      {/* Subtitle line */}
      <div className="h-2.5 w-1/2 mx-auto rounded bg-void/15 mb-4" />
      {/* Price / badge row */}
      <div className="flex items-center justify-between px-1">
        <div className="h-2.5 w-12 rounded bg-void/15" />
        <div className="h-2.5 w-8 rounded bg-void/15" />
      </div>
    </div>
  )
}
