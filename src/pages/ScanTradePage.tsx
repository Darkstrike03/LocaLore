import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scan, X, Camera, AlertTriangle, CheckCircle } from 'lucide-react'
import jsQR from 'jsqr'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { UserCard } from '../types/cards'
import CardDisplay from '../components/cards/CardDisplay'
import CurrencyBadge from '../components/cards/CurrencyBadge'
import { formatPrice } from '../lib/currency'

type FullCard = UserCard & { definition: NonNullable<UserCard['definition']> }
type Step = 'scanning' | 'confirm' | 'sending' | 'done' | 'error'

export default function ScanTradePage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const streamRef     = useRef<MediaStream | null>(null)
  const rafRef        = useRef<number>(0)
  const scanLockedRef = useRef(false)

  const [step, setStep]             = useState<Step>('scanning')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scannedCard, setScannedCard] = useState<FullCard | null>(null)
  const [myCards, setMyCards]         = useState<FullCard[]>([])
  const [offeredCardId, setOfferedCardId] = useState<string | null>(null)
  const [animaAmount, setAnimaAmount] = useState('')
  const [myBalance, setMyBalance]     = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ── Start camera ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          tick()
        }
      } catch {
        setCameraError('Camera access denied. Please allow camera permission and reload.')
      }
    }
    void startCamera()
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      cancelAnimationFrame(rafRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(() => {
      const video  = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || scanLockedRef.current) { tick(); return }
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) { tick(); return }
      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
      if (code?.data) {
        void handleQRResult(code.data)
      } else {
        tick()
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleQRResult(raw: string) {
    // Only accept URLs from this origin pointing to /trade/present/{uuid}
    try {
      const url  = new URL(raw)
      const match = url.pathname.match(/^\/trade\/present\/([0-9a-f-]{36})$/i)
      if (!match) { tick(); return }
      const cardId = match[1]
      scanLockedRef.current = true

      const { data } = await supabase
        .from('user_cards')
        .select('*, definition:card_definitions(*, creature:creatures(*))')
        .eq('id', cardId)
        .maybeSingle()

      if (!data) { scanLockedRef.current = false; tick(); return }
      const card = data as FullCard

      // Can't scan your own card
      if (card.user_id === user?.id) {
        scanLockedRef.current = false
        tick()
        return
      }

      // Stop camera
      streamRef.current?.getTracks().forEach(t => t.stop())
      cancelAnimationFrame(rafRef.current)

      setScannedCard(card)

      // Load my cards + balance for the trade offer panel
      if (user) {
        const [{ data: mine }, { data: u }] = await Promise.all([
          supabase.from('user_cards')
            .select('*, definition:card_definitions(*, creature:creatures(*))')
            .eq('user_id', user.id)
            .eq('is_locked', false)
            .eq('is_listed_market', false)
            .eq('is_listed_auction', false),
          supabase.from('users').select('anima_balance').eq('id', user.id).maybeSingle(),
        ])
        setMyCards((mine ?? []) as FullCard[])
        setMyBalance(u?.anima_balance ?? 0)
      }
      setStep('confirm')
    } catch {
      scanLockedRef.current = false
      tick()
    }
  }

  async function sendTradeOffer() {
    if (!user || !scannedCard) return
    if (!offeredCardId && (!animaAmount || parseInt(animaAmount) <= 0)) {
      setSubmitError('Offer a card or an anima amount.')
      return
    }
    setStep('sending')
    setSubmitError(null)

    // If offering anima only (no card), use anima transfer via RPC or direct update
    if (!offeredCardId && animaAmount) {
      const amount = parseInt(animaAmount)
      if (amount > myBalance) { setSubmitError('Insufficient anima.'); setStep('confirm'); return }
      // Debit sender, credit receiver
      const { error } = await supabase.rpc('transfer_anima', {
        p_from_user_id: user.id,
        p_to_user_id:   scannedCard.user_id,
        p_amount:       amount,
        p_reason:       'face_to_face_payment',
      })
      if (error) { setSubmitError(error.message); setStep('confirm'); return }
      setStep('done')
      return
    }

    // Card trade offer
    const { error } = await supabase.from('trade_offers').insert({
      from_user_id:       user.id,
      to_user_id:         scannedCard.user_id,
      offered_card_ids:   offeredCardId ? [offeredCardId] : [],
      requested_card_ids: [scannedCard.id],
      message:            'Face-to-face trade via QR scan.',
    })
    if (error) { setSubmitError(error.message); setStep('confirm'); return }
    setStep('done')
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center px-4 py-10">

      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="absolute top-20 left-4 flex items-center gap-1.5 font-ui text-[11px] uppercase tracking-[0.2em] text-parchment-muted hover:text-parchment transition-colors"
      >
        <X className="h-3.5 w-3.5" />
        Close
      </button>

      {/* ── Scanning step ──────────────────────────────────────────────────── */}
      {step === 'scanning' && (
        <div className="w-full max-w-sm flex flex-col items-center gap-5">
          <div className="text-center">
            <p className="font-ui text-[10px] uppercase tracking-[0.5em] text-parchment-muted mb-1">Face-to-Face</p>
            <h1 className="font-heading text-2xl tracking-[0.1em] text-amber-400">Scan to Trade</h1>
          </div>

          {cameraError ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-red-500/30 bg-red-900/10 p-6 text-center">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              <p className="font-ui text-xs text-red-400">{cameraError}</p>
            </div>
          ) : (
            <div className="relative w-full rounded-xl overflow-hidden border border-amber-400/30"
              style={{ boxShadow: '0 0 40px rgba(200,168,75,0.08)' }}>
              <video ref={videoRef} className="w-full" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scan frame overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-48 h-48">
                  {/* Corner brackets */}
                  {[
                    'top-0 left-0 border-t-2 border-l-2',
                    'top-0 right-0 border-t-2 border-r-2',
                    'bottom-0 left-0 border-b-2 border-l-2',
                    'bottom-0 right-0 border-b-2 border-r-2',
                  ].map((cls, i) => (
                    <span key={i} className={`absolute w-6 h-6 ${cls} border-amber-400`} />
                  ))}
                  {/* Scanning line */}
                  <div className="absolute inset-x-0 h-px bg-amber-400/60 animate-scan-line" />
                </div>
              </div>

              {/* Dim overlay outside scan area */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(circle 96px at 50% 50%, transparent 50%, rgba(0,0,0,0.5) 100%)' }} />
            </div>
          )}

          <div className="flex items-center gap-2 font-ui text-[10px] text-parchment-muted/50 uppercase tracking-[0.3em]">
            <Camera className="h-3 w-3" />
            <span>Point at a LocaLore QR code</span>
          </div>
        </div>
      )}

      {/* ── Confirm step ───────────────────────────────────────────────────── */}
      {(step === 'confirm' || step === 'sending') && scannedCard && (
        <div className="w-full max-w-md flex flex-col items-center gap-6">
          <div className="text-center">
            <p className="font-ui text-[10px] uppercase tracking-[0.5em] text-parchment-muted mb-1">Scanned</p>
            <h1 className="font-heading text-2xl tracking-[0.1em] text-amber-400">
              {scannedCard.definition?.creature?.name}
            </h1>
          </div>

          <CardDisplay card={scannedCard} size="md" interactive={false} showQR={false} />

          <div className="w-full rounded-xl border border-app-border bg-app-surface p-5 space-y-4">
            <p className="font-ui text-[10px] uppercase tracking-[0.3em] text-parchment-muted">Your offer</p>

            {/* Offer a card */}
            <div>
              <p className="font-ui text-[9px] uppercase tracking-[0.2em] text-parchment-muted/60 mb-2">
                Offer a card (optional)
              </p>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {myCards.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setOfferedCardId(prev => prev === c.id ? null : c.id)}
                    className={`rounded-lg border p-1 transition-all ${
                      offeredCardId === c.id
                        ? 'border-amber-400/60 bg-amber-900/20'
                        : 'border-app-border hover:border-amber-400/30'
                    }`}
                  >
                    <CardDisplay card={c} size="sm" interactive={false} showQR={false} />
                  </button>
                ))}
                {myCards.length === 0 && (
                  <p className="col-span-3 text-center font-ui text-[10px] text-parchment-muted/50 py-4">
                    No unlisted cards available
                  </p>
                )}
              </div>
            </div>

            {/* Or send anima */}
            <div>
              <p className="font-ui text-[9px] uppercase tracking-[0.2em] text-parchment-muted/60 mb-1.5">
                Or send anima
              </p>
              <input
                type="number"
                min="1"
                placeholder="Amount…"
                value={animaAmount}
                onChange={e => setAnimaAmount(e.target.value)}
                className="w-full rounded border border-app-border bg-void px-3 py-2 font-ui text-sm text-parchment focus:border-amber-400/40 focus:outline-none"
              />
              {animaAmount && parseInt(animaAmount) > 0 && (
                <p className="mt-1 font-ui text-[10px] text-parchment-muted">
                  ≈ <CurrencyBadge anima={parseInt(animaAmount)} size="xs" />
                  <span className="ml-2 text-parchment-muted/50">Balance: {formatPrice(myBalance)}</span>
                </p>
              )}
            </div>

            {submitError && <p className="text-xs text-red-400">{submitError}</p>}

            <button
              type="button"
              onClick={() => void sendTradeOffer()}
              disabled={step === 'sending'}
              className="w-full rounded-lg border border-amber-500/40 bg-amber-900/20 py-2.5 font-ui text-[11px] uppercase tracking-[0.2em] text-amber-400 hover:bg-amber-900/40 disabled:opacity-50 transition-colors"
            >
              {step === 'sending' ? 'Sending…' : 'Send Offer'}
            </button>
          </div>
        </div>
      )}

      {/* ── Done ───────────────────────────────────────────────────────────── */}
      {step === 'done' && (
        <div className="flex flex-col items-center gap-6 text-center">
          <CheckCircle className="h-12 w-12 text-emerald-400" />
          <div>
            <h2 className="font-heading text-2xl tracking-[0.1em] text-parchment">Offer Sent</h2>
            <p className="mt-2 font-body text-sm text-parchment-muted">
              The other party will see it in their Trade inbox.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/trade')}
            className="font-ui text-[11px] uppercase tracking-[0.2em] text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Scan className="inline h-3.5 w-3.5 mr-1.5" />
            View Trades
          </button>
        </div>
      )}
    </div>
  )
}
