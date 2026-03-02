import { useEffect, useRef, useState } from 'react'
import { Camera, X, ChevronLeft, ChevronRight, Upload, Trash2, ZoomIn } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { uploadImage } from '../lib/imgbb'
import type { CreatureImage } from '../types/creature'

interface Props {
  creatureId: string
  primaryImage: string | null
  creatureName: string
  /** Called with the first gallery (non-primary) image URL once loaded */
  onGalleryFirstImage?: (url: string | null) => void
}

export default function CreatureGallery({ creatureId, primaryImage, creatureName, onGalleryFirstImage }: Props) {
  const { user } = useAuth()
  const [images, setImages] = useState<CreatureImage[]>([])
  const [isModerator, setIsModerator] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  // build merged list: primary image first, then gallery images
  const allImages = [
    ...(primaryImage ? [{ id: '__primary', url: primaryImage, caption: 'Primary', creature_id: creatureId, uploaded_by: null, created_at: '' } as CreatureImage] : []),
    ...images,
  ]

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase
        .from('creature_images')
        .select('*')
        .eq('creature_id', creatureId)
        .order('created_at', { ascending: true })
      if (mounted) {
        const imgs = (data as CreatureImage[]) || []
        setImages(imgs)
        onGalleryFirstImage?.(imgs[0]?.url ?? null)
      }

      if (user) {
        const { data: me } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
        if (mounted && me) setIsModerator(me.role?.toLowerCase() === 'moderator')
      }
    })()
    return () => { mounted = false }
  }, [creatureId, user])

  const prev = () => setActiveIdx(i => (i - 1 + allImages.length) % allImages.length)
  const next = () => setActiveIdx(i => (i + 1) % allImages.length)

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f || !user) return
    setUploading(true)
    try {
      const url = await uploadImage(f)
      const { data, error } = await supabase
        .from('creature_images')
        .insert({ creature_id: creatureId, url, uploaded_by: user.id })
        .select()
        .maybeSingle()
      if (!error && data) setImages(prev => [...prev, data as CreatureImage])
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function remove(img: CreatureImage) {
    if (img.id === '__primary') return
    await supabase.from('creature_images').delete().eq('id', img.id)
    setImages(prev => prev.filter(i => i.id !== img.id))
    setActiveIdx(0)
  }

  // Moderators need the upload UI even when no images exist yet
  if (allImages.length === 0) {
    if (!isModerator) return null
    return (
      <div className="space-y-2">
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-app-border bg-app-surface/50 py-10">
          <Camera className="h-8 w-8 text-parchment-dim/30" />
          <p className="font-ui text-[11px] text-parchment-dim">No images yet</p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={upload} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-ghost flex items-center gap-2 text-xs"
          >
            {uploading ? <Camera className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? 'Uploading…' : 'Add first image'}
          </button>
        </div>
      </div>
    )
  }

  const current = allImages[activeIdx]

  return (
    <div className="space-y-2">
      {/* Main viewer */}
      <div className="relative overflow-hidden rounded-xl border border-app-border bg-app-surface group">
        <div className="relative h-56 bg-void">
          <img
            src={current.url}
            alt={current.caption ?? creatureName}
            className="h-full w-full object-cover opacity-85 transition-opacity duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-app-surface/70 to-transparent" />

          {/* Lightbox trigger */}
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-lg border border-app-border bg-void/80 text-parchment-muted opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>

          {/* Nav arrows */}
          {allImages.length > 1 && (
            <>
              <button type="button" onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full border border-app-border bg-void/80 text-parchment-muted hover:text-gold opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full border border-app-border bg-void/80 text-parchment-muted hover:text-gold opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Counter */}
          {allImages.length > 1 && (
            <span className="absolute bottom-2 right-3 font-ui text-[10px] text-parchment-dim">
              {activeIdx + 1} / {allImages.length}
            </span>
          )}
        </div>

        {/* Caption + moderator delete */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="font-ui text-[10px] text-parchment-dim truncate">
            {current.caption ?? creatureName}
          </span>
          {isModerator && current.id !== '__primary' && (
            <button type="button" onClick={() => remove(current)} className="text-parchment-dim hover:text-crimson transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Thumbnail strip */}
      {allImages.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {allImages.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={`h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                i === activeIdx ? 'border-gold' : 'border-app-border opacity-50 hover:opacity-80'
              }`}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Upload button (moderators) */}
      {isModerator && (
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={upload} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-ghost flex items-center gap-2 text-xs"
          >
            {uploading ? <Camera className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? 'Uploading…' : 'Add gallery image'}
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-void/95 backdrop-blur-sm"
          onClick={() => setLightbox(false)}
        >
          <button type="button" className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-app-border text-parchment-muted hover:text-crimson" onClick={() => setLightbox(false)}>
            <X className="h-4 w-4" />
          </button>
          <img
            src={current.url}
            alt={current.caption ?? creatureName}
            className="max-h-[85vh] max-w-[90vw] rounded-xl border border-app-border shadow-void-deep"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
