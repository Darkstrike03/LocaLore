import '@google/model-viewer'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, X, Download, MapPin, Box } from 'lucide-react'
import { getTypeConfig } from './CreatureTypeIcon'
import type { CreatureType } from '../types/creature'

interface Props {
  imageUrl: string | null
  secondaryImageUrl?: string | null  // ← first gallery image; used for AR if present
  modelUrl?: string | null      // ← optional GLB/GLTF URL
  creatureName: string
  creatureType?: CreatureType
}

// 'active-model'  = full-screen model-viewer (3D + built-in AR button)
// 'active-xr'    = WebXR immersive-ar session running (hardware AR, 2D image)
// 'active-camera'= Fallback: software camera overlay
type Phase = 'idle' | 'requesting' | 'active-model' | 'active-xr' | 'active-camera' | 'denied'

// ─── 4×4 column-major matrix multiply (WebXR uses Float32Array col-major) ───
function matMulVec4(m: Float32Array, x: number, y: number, z: number, w: number) {
  return {
    x: m[0]*x + m[4]*y + m[8]*z  + m[12]*w,
    y: m[1]*x + m[5]*y + m[9]*z  + m[13]*w,
    z: m[2]*x + m[6]*y + m[10]*z + m[14]*w,
    w: m[3]*x + m[7]*y + m[11]*z + m[15]*w,
  }
}

// Project a world-space point into NDC via a WebXR view
function worldToNDC(
  pos: { x: number; y: number; z: number },
  viewMatrix: Float32Array,
  projMatrix: Float32Array,
) {
  const v = matMulVec4(viewMatrix, pos.x, pos.y, pos.z, 1)
  const c = matMulVec4(projMatrix, v.x, v.y, v.z, v.w)
  if (Math.abs(c.w) < 1e-6) return null
  return { x: c.x / c.w, y: c.y / c.w }
}

export default function ARSummonPreview({ imageUrl, secondaryImageUrl, modelUrl, creatureName, creatureType = 'other' }: Props) {
  // Prefer the secondary (gallery) image for AR; fall back to primary image_url
  const arImageUrl = secondaryImageUrl ?? imageUrl
  const [phase, setPhase] = useState<Phase>('idle')

  // ── Camera-overlay (fallback) refs ────────────────────────────────────────
  const videoRef    = useRef<HTMLVideoElement | null>(null)
  const overlayImgRef = useRef<HTMLImageElement | null>(null)
  const streamRef   = useRef<MediaStream | null>(null)

  // ── WebXR refs ────────────────────────────────────────────────────────────
  // domOverlayRef is always mounted (hidden when not in XR) so it exists
  // at the time requestSession() is called.
  const domOverlayRef   = useRef<HTMLDivElement | null>(null)
  const xrSessionRef    = useRef<any>(null)
  const hitSourceRef    = useRef<any>(null)

  // reticule: where the hit-test is pointing right now (% of screen)
  const [reticule, setReticule]       = useState<{ x: number; y: number } | null>(null)
  const [surfaceFound, setSurfaceFound] = useState(false)
  // placed: locked anchor position after the user taps
  const [placed, setPlaced]           = useState<{ x: number; y: number } | null>(null)
  // keep a ref so the XR frame closure can read `placed` without stale value
  const placedRef = useRef<{ x: number; y: number } | null>(null)

  // ── Shared state ──────────────────────────────────────────────────────────
  const [opacity, setOpacity]         = useState(0.85)
  const [scale, setScale]             = useState(1)
  const [tilt, setTilt]               = useState({ x: 0, y: 0 })
  const [flashVisible, setFlashVisible] = useState(false)

  const typeConfig = getTypeConfig(creatureType)
  const hasImage   = !!arImageUrl


  // ── Device orientation parallax (camera-overlay mode only) ────────────────
  useEffect(() => {
    if (phase !== 'active-camera') return
    function handler(e: DeviceOrientationEvent) {
      setTilt({ x: ((e.gamma ?? 0) / 45) * 20, y: ((e.beta ?? 0) / 45) * 12 })
    }
    window.addEventListener('deviceorientation', handler)
    return () => window.removeEventListener('deviceorientation', handler)
  }, [phase])

  // Cleanup on unmount
  useEffect(() => { return () => stopAll() }, [])

  // ── Entry point ────────────────────────────────────────────────────────────
  async function start() {
    // Priority 1: 3D GLB model → model-viewer (handles WebXR + iOS ARKit natively)
    if (modelUrl) {
      setPhase('active-model')
      return
    }
    setPhase('requesting')
    // Priority 2: WebXR immersive-ar (Android ARCore, 2D image on real surface)
    try {
      const xrApi = (navigator as any).xr
      if (xrApi && await xrApi.isSessionSupported('immersive-ar')) {
        await startWebXR(xrApi)
        return
      }
    } catch { /* WebXR not available, fall through */ }
    // Priority 3: plain camera overlay
    await startCamera()
  }

  // ── WebXR path ─────────────────────────────────────────────────────────────
  async function startWebXR(xrApi: any) {
    // We need a WebGL context for the XR compositor even if we render via DOM overlay
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl', { xrCompatible: true, alpha: true }) as WebGLRenderingContext
    await (gl as any).makeXRCompatible()

    const session = await xrApi.requestSession('immersive-ar', {
      requiredFeatures: ['hit-testing'],
      optionalFeatures: ['dom-overlay'],
      ...(domOverlayRef.current ? { domOverlay: { root: domOverlayRef.current } } : {}),
    }) as any
    xrSessionRef.current = session

    const XRWebGLLayer = (window as any).XRWebGLLayer
    const layer = new XRWebGLLayer(session, gl, { alpha: true, framebufferScaleFactor: 0.5 })
    session.updateRenderState({ baseLayer: layer })

    const refSpace    = await session.requestReferenceSpace('local')
    const viewerSpace = await session.requestReferenceSpace('viewer')
    hitSourceRef.current = await session.requestHitTestSource({ space: viewerSpace })

    // Clean up when the XR session ends (user presses the device back button etc.)
    session.addEventListener('end', () => {
      hitSourceRef.current = null
      xrSessionRef.current = null
      setPhase('idle')
      setReticule(null)
      setSurfaceFound(false)
      setPlaced(null)
      placedRef.current = null
    })

    setPhase('active-xr')

    // ── XR render loop ───────────────────────────────────────────────────
    function onXRFrame(_t: number, frame: any) {
      session.requestAnimationFrame(onXRFrame)

      // Transparent clear — the real world shows through
      gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      const pose = frame.getViewerPose(refSpace)
      const hits  = frame.getHitTestResults(hitSourceRef.current)

      if (hits.length && pose) {
        const hitPose = hits[0].getPose(refSpace)
        if (hitPose) {
          const view = pose.views[0]
          const ndc  = worldToNDC(
            hitPose.transform.position,
            view.transform.inverse.matrix as Float32Array,
            view.projectionMatrix as Float32Array,
          )
          if (ndc) {
            // Convert NDC (−1…1) to screen percentage (0…100)
            const pctX = (ndc.x + 1) * 50
            const pctY = (1 - ndc.y) * 50   // flip Y
            setSurfaceFound(true)
            // Only move reticule while not yet placed
            if (!placedRef.current) {
              setReticule({ x: pctX, y: pctY })
            }
          }
        }
      } else {
        setSurfaceFound(false)
      }
    }
    session.requestAnimationFrame(onXRFrame)
  }

  // ── Camera-overlay path (fallback) ─────────────────────────────────────────
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      setPhase('active-camera')
      requestAnimationFrame(() => {
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}) }
      })
    } catch { setPhase('denied') }
  }

  // ── Shared stop ────────────────────────────────────────────────────────────
  function stopAll() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    try { xrSessionRef.current?.end() } catch {}
    xrSessionRef.current = null
    hitSourceRef.current = null
    setPhase('idle')
    setTilt({ x: 0, y: 0 })
    setReticule(null)
    setSurfaceFound(false)
    setPlaced(null)
    placedRef.current = null
  }

  // ── Tap-to-place (WebXR) ───────────────────────────────────────────────────
  function placeCreature() {
    if (reticule && !placed) {
      setPlaced(reticule)
      placedRef.current = reticule
    }
  }
  function reposition() {
    setPlaced(null)
    placedRef.current = null
  }

  // ── Screenshot (camera-overlay only) ──────────────────────────────────────
  const captureScreenshot = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const cvs = document.createElement('canvas')
    cvs.width  = video.videoWidth  || 1280
    cvs.height = video.videoHeight || 720
    const ctx = cvs.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, cvs.width, cvs.height)
    ctx.globalAlpha = opacity
    if (hasImage && overlayImgRef.current) {
      const img   = overlayImgRef.current
      const ratio = Math.min((cvs.width * 0.65 * scale) / img.naturalWidth, (cvs.height * 0.65 * scale) / img.naturalHeight)
      const dw = img.naturalWidth * ratio, dh = img.naturalHeight * ratio
      ctx.drawImage(img, (cvs.width - dw) / 2, (cvs.height - dh) / 2, dw, dh)
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

  // The creature shown in the WebXR mode sits at the placed point, or tracks
  // the reticule while scanning.
  const xrAnchor = placed ?? reticule

  const sliders = [
    { label: 'Opacity', value: opacity, min: 0.1, max: 1,   step: 0.05, set: setOpacity, fmt: (v: number) => `${Math.round(v * 100)}%` },
    { label: 'Size',    value: scale,   min: 0.3, max: 2.2, step: 0.05, set: setScale,   fmt: (v: number) => `${Math.round(v * 100)}%` },
  ]

  return (
    <>
      {/* ── Trigger button ─────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={start}
        disabled={phase === 'requesting'}
        className="flex items-center gap-2 rounded-full border border-gold/50 px-3 py-1.5 font-ui text-[11px] text-gold hover:bg-gold/10 transition-all duration-200 disabled:opacity-50"
        title={modelUrl ? 'View 3D model & place in AR' : 'Summon creature in AR'}
      >
        {modelUrl ? <Box className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
        {phase === 'requesting' ? 'Requesting…' : modelUrl ? '3D / AR' : 'AR Summon'}
      </button>

      {phase === 'denied' && (
        <p className="font-ui text-[10px] text-crimson mt-1">Camera access denied — check browser settings.</p>
      )}

      {/* ── 3D model-viewer overlay (shown when a GLB is available) ────── */}
      {phase === 'active-model' && modelUrl && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col select-none">
          {/* HUD top */}
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black to-transparent shrink-0">
            <div>
              <p className="font-ui text-[9px] uppercase tracking-[0.35em] text-gold/80">3D Model · LocaLore</p>
              <p className="font-heading text-lg text-gold leading-tight">{creatureName}</p>
              <p className="font-ui text-[9px] text-parchment-dim/60 mt-0.5">
                Drag to rotate · Pinch to zoom · Tap
                {' '}
                <span className="text-gold/70">⬛ AR</span>
                {' '}
                to place in your world
              </p>
            </div>
            <button
              type="button"
              onClick={stopAll}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* model-viewer fills remaining space */}
          <div className="flex-1 relative">
            <model-viewer
              src={modelUrl}
              alt={creatureName}
              ar
              ar-modes="webxr scene-viewer quick-look"
              ar-scale="auto"
              camera-controls
              auto-rotate
              auto-rotate-delay={2000}
              shadow-intensity={1}
              exposure={0.8}
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'transparent',
              }}
            />
          </div>

          {/* size slider — affects the AR placement scale */}
          <div className="shrink-0 pb-8 pt-3 flex flex-col items-center gap-2 px-8 bg-gradient-to-t from-black to-transparent">
            <div className="flex w-full max-w-xs items-center gap-3">
              <span className="w-12 shrink-0 text-right font-ui text-[9px] uppercase tracking-widest text-white/50">Size</span>
              <input type="range" min={0.3} max={2.2} step={0.05} value={scale}
                onChange={e => setScale(parseFloat(e.target.value))} className="flex-1 accent-yellow-400 h-1" />
              <span className="w-8 shrink-0 font-mono text-[9px] text-white/50">{Math.round(scale * 100)}%</span>
            </div>
            <p className="font-ui text-[9px] text-white/25">Tap the AR icon (cube) in the bottom-right to enter AR</p>
          </div>
        </div>
      )}

      {/* ── WebXR DOM-overlay root (always mounted so it exists at session start) */}
      <div
        ref={domOverlayRef}
        className="fixed inset-0 z-[300] select-none"
        style={{ display: phase === 'active-xr' ? 'block' : 'none' }}
      >
        {/* Creature anchored to detected surface */}
        {xrAnchor && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${xrAnchor.x}%`,
              top:  `${xrAnchor.y}%`,
              transform: 'translate(-50%, -100%)',
              opacity,
              // While scanning (not placed), smoothly track the surface point
              transition: placed ? 'none' : 'left 0.08s linear, top 0.08s linear',
            }}
          >
            {hasImage ? (
              <img
                src={arImageUrl!}
                alt={creatureName}
                className="object-contain"
                style={{
                  maxHeight: `${50 * scale}vh`,
                  maxWidth:  `${60 * scale}vw`,
                  filter: `drop-shadow(0 0 30px ${typeConfig.glowColor}) drop-shadow(0 0 8px ${typeConfig.glowColor})`,
                  animation: 'ar-float 4s ease-in-out infinite',
                }}
              />
            ) : (
              <typeConfig.Icon style={{
                width:  `${25 * scale}vmin`,
                height: `${25 * scale}vmin`,
                color:  typeConfig.glowColor,
                filter: `drop-shadow(0 0 30px ${typeConfig.glowColor})`,
                animation: 'ar-float 4s ease-in-out infinite',
              }} />
            )}
            {/* Grounding shadow — makes it look like it's standing on the surface */}
            <div
              className="mx-auto rounded-full bg-black/40 blur-md"
              style={{ width: `${18 * scale}vmin`, height: `${2.5 * scale}vmin`, marginTop: '-0.5rem' }}
            />
          </div>
        )}

        {/* Reticule ring — tracks the surface while not yet placed */}
        {!placed && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: reticule ? `${reticule.x}%` : '50%',
              top:  reticule ? `${reticule.y}%` : '65%',
              transform: 'translate(-50%, -50%)',
              transition: 'left 0.08s linear, top 0.08s linear',
            }}
          >
            <div className={`h-16 w-16 rounded-full border-2 transition-colors ${surfaceFound ? 'border-gold' : 'border-white/30'}`}
              style={{ animation: surfaceFound ? 'reticule-pulse 1.2s ease-in-out infinite' : 'none' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`h-2 w-2 rounded-full ${surfaceFound ? 'bg-gold' : 'bg-white/30'}`} />
            </div>
            <MapPin className={`absolute -bottom-5 left-1/2 -translate-x-1/2 h-3.5 w-3.5 ${surfaceFound ? 'text-gold' : 'text-white/30'}`} />
          </div>
        )}

        {/* HUD top */}
        <div className="pointer-events-auto absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/70 to-transparent">
          <div>
            <p className="font-ui text-[9px] uppercase tracking-[0.35em] text-gold/80">WebXR · LocaLore</p>
            <p className="font-heading text-lg text-gold leading-tight">{creatureName}</p>
            <p className="font-ui text-[9px] text-parchment-dim/70 mt-0.5">
              {placed
                ? '📍 Anchored — move around it'
                : surfaceFound
                  ? 'Surface detected — tap to place'
                  : 'Aim at a floor or table…'}
            </p>
          </div>
          <button
            type="button"
            onClick={stopAll}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tap-to-place invisible overlay */}
        {!placed && surfaceFound && (
          <button
            type="button"
            onClick={placeCreature}
            className="pointer-events-auto absolute inset-0 h-full w-full"
            style={{ background: 'transparent' }}
          />
        )}

        {/* HUD bottom */}
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 pb-8 pt-4 bg-gradient-to-t from-black/70 to-transparent flex flex-col items-center gap-3 px-8">
          {placed && (
            <button type="button" onClick={reposition}
              className="font-ui text-[10px] text-white/60 hover:text-white border border-white/20 rounded-lg px-3 py-1 transition-colors"
            >
              Reposition
            </button>
          )}
          {sliders.map(s => (
            <div key={s.label} className="flex w-full max-w-xs items-center gap-3">
              <span className="w-12 shrink-0 text-right font-ui text-[9px] uppercase tracking-widest text-white/50">{s.label}</span>
              <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                onChange={e => s.set(parseFloat(e.target.value))} className="flex-1 accent-yellow-400 h-1" />
              <span className="w-8 shrink-0 font-mono text-[9px] text-white/50">{s.fmt(s.value)}</span>
            </div>
          ))}
          <p className="font-ui text-[9px] text-white/25">Use device screenshot button to save</p>
        </div>
      </div>

      {/* ── Camera-overlay mode (fallback for non-WebXR devices) ─────────── */}
      {phase === 'active-camera' && (
        <div className="fixed inset-0 z-[300] bg-black overflow-hidden select-none">
          <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />

          {flashVisible && (
            <div className="absolute inset-0 bg-white pointer-events-none" style={{ animation: 'flash-fade 0.25s ease-out forwards' }} />
          )}

          {/* Creature — tilt parallax */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity, transform: `translate(${tilt.x}px, ${tilt.y}px)`, transition: 'transform 0.15s ease-out' }}
          >
            {hasImage ? (
              <img
                ref={overlayImgRef}
                src={arImageUrl!}
                alt={creatureName}
                crossOrigin="anonymous"
                className="object-contain"
                style={{
                  maxHeight: `${65 * scale}vh`,
                  maxWidth:  `${75 * scale}vw`,
                  filter: `drop-shadow(0 0 40px ${typeConfig.glowColor}) drop-shadow(0 0 10px ${typeConfig.glowColor})`,
                  animation: 'ar-float 4s ease-in-out infinite',
                }}
              />
            ) : (
              <typeConfig.Icon style={{
                width:  `${30 * scale}vmin`,
                height: `${30 * scale}vmin`,
                color:  typeConfig.glowColor,
                filter: `drop-shadow(0 0 40px ${typeConfig.glowColor})`,
                animation: 'ar-float 4s ease-in-out infinite',
              }} />
            )}
          </div>

          {/* HUD top */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/70 to-transparent">
            <div>
              <p className="font-ui text-[9px] uppercase tracking-[0.35em] text-gold/80">AR Overlay · LocaLore</p>
              <p className="font-heading text-lg text-gold leading-tight">{creatureName}</p>
              {!hasImage && <p className="font-ui text-[9px] text-parchment-dim/60 mt-0.5">{typeConfig.label} sigil</p>}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={captureScreenshot}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white hover:bg-black/70 transition-colors"
                title="Save image"
              >
                <Download className="h-4 w-4" />
              </button>
              <button type="button" onClick={stopAll}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Corner brackets */}
          <div className="absolute pointer-events-none" style={{ top: '15vh', left: '10vw', right: '10vw', height: '65vh' }}>
            <div className="relative h-full w-full">
              {(['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2', 'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'] as const).map(cls => (
                <div key={cls} className={`absolute h-8 w-8 border-gold/40 ${cls}`} />
              ))}
            </div>
          </div>

          {/* Bottom sliders */}
          <div className="absolute inset-x-0 bottom-0 pb-8 pt-4 bg-gradient-to-t from-black/70 to-transparent flex flex-col items-center gap-3 px-8">
            {sliders.map(s => (
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
        @keyframes ar-float       { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-14px) scale(1.02)} }
        @keyframes flash-fade     { from{opacity:.9} to{opacity:0} }
        @keyframes reticule-pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.15);opacity:.6} }
      `}</style>
    </>
  )
}

