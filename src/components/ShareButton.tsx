import { useState } from 'react'
import { Share2, Link, Check } from 'lucide-react'

interface Props {
  title: string
  description: string
  url?: string
}

export default function ShareButton({ title, description, url }: Props) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const shareUrl = url ?? window.location.href

  async function doShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: description, url: shareUrl })
      } catch {
        // user dismissed — no-op
      }
      return
    }
    // fallback: show copy dropdown
    setOpen(o => !o)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => { setCopied(false); setOpen(false) }, 2000)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={doShare}
        className="flex items-center gap-2 rounded-full border border-app-border px-3 py-1.5 font-ui text-[11px] text-parchment-muted hover:border-gold/30 hover:text-parchment transition-all duration-200"
        aria-label="Share this creature"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </button>

      {open && !navigator.share && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[200px] rounded-xl border border-app-border bg-void shadow-void-deep py-1.5 animate-rise">
            <button
              type="button"
              onClick={copyLink}
              className="flex w-full items-center gap-3 px-3 py-2.5 font-ui text-xs text-parchment-muted hover:bg-app-surface hover:text-parchment transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-gold" /> : <Link className="h-3.5 w-3.5" />}
              {copied ? 'Link copied!' : 'Copy link'}
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-3 px-3 py-2.5 font-ui text-xs text-parchment-muted hover:bg-app-surface hover:text-parchment transition-colors"
              onClick={() => setOpen(false)}
            >
              <span className="text-sm">𝕏</span>
              Share on X
            </a>
            <a
              href={`https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-3 px-3 py-2.5 font-ui text-xs text-parchment-muted hover:bg-app-surface hover:text-parchment transition-colors"
              onClick={() => setOpen(false)}
            >
              <span className="text-sm">⬆</span>
              Share on Reddit
            </a>
          </div>
        </>
      )}
    </div>
  )
}
