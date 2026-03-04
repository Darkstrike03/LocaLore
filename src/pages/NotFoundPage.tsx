import { Link } from 'react-router-dom'
import { Eye, ArrowLeft } from 'lucide-react'
import { useSEO } from '../hooks/useSEO'

export default function NotFoundPage() {
  useSEO({
    title: '404 — Page Not Found',
    description: 'This page does not exist in the LocaLore archive. It may have never existed — or it simply does not want to be found.',
    url: '/404',
  })

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center animate-rise">
      {/* Glyph */}
      <div className="relative">
        <span className="absolute inset-0 rounded-full border border-gold/20 animate-glow-pulse" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-app-border bg-app-surface">
          <Eye className="h-8 w-8 text-gold/50" />
        </div>
      </div>

      {/* Copy */}
      <div className="space-y-2">
        <p className="section-label">Error 404</p>
        <h1 className="font-heading text-3xl sm:text-4xl text-gold">
          Nothing stirs here.
        </h1>
        <p className="mx-auto max-w-md font-body text-base text-parchment-muted leading-relaxed">
          This page does not exist in the archive. It either never did — or it simply does not wish to be found.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <Link to="/" className="btn-summon">
          <ArrowLeft className="h-3.5 w-3.5" />
          Return home
        </Link>
        <Link to="/library" className="btn-ghost">
          Browse the library
        </Link>
      </div>
    </div>
  )
}
