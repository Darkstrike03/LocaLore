import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, X, Download } from 'lucide-react'
import { getTypeConfig } from './CreatureTypeIcon'
import type { CreatureType } from '../types/creature'

interface Props {
  imageUrl: string | null
  creatureName: string
  creatureType?: CreatureType
}

type Phase = 'idle' | 'requesting' | 'active' | 'denied'

export default function ARSummonPreview({ imageUrl, creatureName, creatureType = 'other' }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const overlayImgRef = useRef<HTMLImageElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [opacity, setOpacity] = useState(0.8)
  const [scale, setScale] = useState(1)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [flashVisible, setFlashVisible] = useState(false)

  const typeConfig = getTypeConfig(creatureType)
  const hasImage = !!imageUrl

  // Parallax from device tilt
  useEffect(() => {
    if (phase !== 'active') return
    function onOrientation(e: DeviceOrientationEvent) {
      setTilt({
        x: ((e.gamma ?? 0) / 45) * 20,
        y: ((e.beta ?? 0) / 45) * 12,
      })
    }
    window.addEventListener('deviceorientation', onOrientation)
    return () => window.removeEventListener('deviceorientation', onOrientation)
  }, [phase])

  useEffect(() => { return () => stopCamera() }, [])

  async function start() {
    setPhase('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      setPhase('active')
      requestAnimationFrame(() => {
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}) }
      })
    } catch { setPhase('denied') }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setPhase('idle')
    setTilt({ x: 0, y: 0 })
  }

  const captureScreenshot = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const cvs = document.createElement('canvas')
    cvs.width = video.videoWidth || 1280
    cvs.height = video.videoHeight || 720
    const ctx = cvs.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, cvs.width, cvs.height)
    ctx.globalAlpha = opacity
    if (hasImage && overlayImgRef.current) {
      const img = overlayImgRef.current
      const ratio = Math.min((cvs.width * 0.65 * scale) / img.naturalWidth, (cvs.height * 0.65 * scale) / img.naturalHeight)
      const drawW = img.naturalWidth * ratio
      const drawH = img.naturalHeight * ratio
      ctx.drawImage(img, (cvs.width - drawW) / 2, (cvs.height - drawH) / 2, drawW, drawH)
    }
    ctx.globalAlpha = 1
    setFlashVisible(true)
    setTimeout(() => setFlashVisible(false), 250)
    cvs.toBlob(blob => {
      if (!blob) return
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `localore-${creatureName.toLowerCase().replace(/\s+/g, '-')}.jpg`,
      })
      a.click()
      URL.revokeObjectURL(a.href)
    }, 'image/jpeg', 0.92)
  }, [opacity, scale, hasImage, creatureName])

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={phase === 'requesting'}
        className="flex items-center gap-2 rounded-full border border-gold/50 px-3 py-1.5 font-ui text-[11px] text-gold hover:bg-gold/10 transition-all duration-200 disabled:opacity-50"
        title="Overlay creature on your camera feed"
      >
        <Camera className="h-3.5 w-3.5" />
        {phase === 'requesting' ? 'Requesting camera…' : 'AR Summon'}
      </button>

      {phase === 'denied' && (
        <p className="font-ui text-[10px] text-crimson mt-1">Camera access denied — check browser settings.</p>
      )}

      {phase === 'active' && (
        <div className="fixed inset-0 z-[300] bg-black overflow-hidden select-none">
          <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />

          {/* Flash on capture */}
          {flashVisible && <div className="absolute inset-0 bg-white pointer-events-none" style={{ animation: 'flash-fade 0.25s ease-out forwards' }} />}

          {/* Creature overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              opacity,
              transform: `translate(${tilt.x}px, ${tilt.y}px)`,
              transition: 'transform 0.15s ease-out',
            }}
          >
            {hasImage ? (
              <img
                ref={overlayImgRef}
                src={imageUrl!}
                alt={creatureName}
                crossOrigin="anonymous"
                className="object-contain"
                style={{
                  maxHeight: `${65 * scale}vh`,
                  maxWidth: `${75 * scale}vw`,
                  filter: `drop-shadow(0 0 40px ${typeConfig.glowColor}) drop-shadow(0 0 10px ${typeConfig.glowColor})`,
                  animation: 'ar-float 4s ease-in-out infinite',
                }}
              />
            ) : (
              // Fallback: render the creature-type icon as the AR subject
              <typeConfig.Icon
                style={{
                  width: `${30 * scale}vmin`,
                  height: `${30 * scale}vmin`,
                  color: typeConfig.glowColor,
                  filter: `drop-shadow(0 0 40px ${typeConfig.glowColor})`,
                  animation: 'ar-float 4s ease-in-out infinite',
                }}
              />
            )}
          </div>

          {/* HUD top */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/70 to-transparent">
            <div>
              <p className="font-ui text-[9px] uppercase tracking-[0.35em] text-gold/80">AR Summon · LocaLore</p>
              <p className="font-heading text-lg text-gold leading-tight">{creatureName}</p>
              {!hasImage && (
                <p className="font-ui text-[9px] text-parchment-dim/60 mt-0.5">{typeConfig.label} sigil (no image on record)</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={captureScreenshot} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white hover:bg-black/70 transition-colors" title="Capture screenshot">
                <Download className="h-4 w-4" />
              </button>
              <button type="button" onClick={stopCamera} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white hover:bg-black/70 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Corner reticule brackets */}
          <div className="absolute pointer-events-none" style={{ top: '15vh', left: '10vw', right: '10vw', height: '65vh' }}>
            <div className="relative h-full w-full">
              {(['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2', 'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'] as const).map(cls => (
                <div key={cls} className={`absolute h-8 w-8 border-gold/40 ${cls}`} />
              ))}
            </div>
          </div>

          {/* HUD bottom — sliders */}
          <div className="absolute inset-x-0 bottom-0 pb-8 pt-4 bg-gradient-to-t from-black/70 to-transparent flex flex-col items-center gap-3 px-8">
            {[
              { label: 'Opacity', value: opacity, min: 0.1, max: 1, step: 0.05, set: setOpacity, fmt: (v: number) => `${Math.round(v * 100)}%` },
              { label: 'Size',    value: scale,   min: 0.3, max: 2.2, step: 0.05, set: setScale,   fmt: (v: number) => `${Math.round(v * 100)}%` },
            ].map(s => (
              <div key={s.label} className="flex w-full max-w-xs items-center gap-3">
                <span className="w-12 shrink-0 text-right font-ui text-[9px] uppercase tracking-widest text-white/50">{s.label}</span>
                <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                  onChange={e => s.set(parseFloat(e.target.value))} className="flex-1 accent-yellow-400 h-1" />
                <span className="w-8 shrink-0 font-mono text-[9px] text-white/50">{s.fmt(s.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes ar-float { 0%,100%{transform:translateY(0)scale(1)} 50%{transform:translateY(-14px)scale(1.02)} }
        @keyframes flash-fade { from{opacity:.9} to{opacity:0} }
      `}</style>
    </>
  )
}
