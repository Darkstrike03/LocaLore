import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Scan, Eye, Download, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { UserCard, CardRarity } from '../types/cards'
import { RARITY_META } from '../types/cards'
import CardDisplay from '../components/cards/CardDisplay'
import MagicCircleQR from '../components/MagicCircleQR'
import { exportCardAsPNG } from '../lib/cardExport'

// Map rarity -> accent colour for MagicCircleQR scan seal
const RARITY_ACCENT: Record<CardRarity, string> = {
  whisper:       '#D4CDB8',
  remnant:       '#D4CDB8',
  manifestation: '#C8A84B',
  awakened:      '#B8C6D0',
  ephemeral:     '#A78BFA',
  void_touched:  '#A855F7',
}

type FullCard = UserCard & { definition: NonNullable<UserCard['definition']> }

export default function PresentCardPage() {
  const { cardId }  = useParams<{ cardId: string }>()
  const navigate    = useNavigate()
  const { user }    = useAuth()

  const [card, setCard]       = useState<FullCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)

  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'done' | 'cors'>('idle')

  useEffect(() => {
    if (!cardId) return
    async function load() {
      const { data } = await supabase
        .from('user_cards')
        .select('*, definition:card_definitions(*, creature:creatures(*))')
        .eq('id', cardId)
        .maybeSingle()
      if (data) {
        setCard(data as FullCard)
        setIsOwner(user?.id === (data as FullCard).user_id)
      }
      setLoading(false)
    }
    void load()
  }, [cardId, user])

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <Eye className="h-5 w-5 text-amber-400/50 animate-pulse" />
    </div>
  )

  if (!card) return (
    <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
      <p className="font-ui text-sm text-parchment-muted">Manifest not found.</p>
      <button type="button" onClick={() => navigate(-1)} className="font-ui text-xs text-amber-400 underline">Go back</button>
    </div>
  )

  const creature  = card.definition?.creature
  const rarity    = RARITY_META[card.definition.rarity]
  const accent    = RARITY_ACCENT[card.definition.rarity]
  const tradeUrl  = `${window.location.origin}/trade/present/${card.id}`

  async function handleExport() {
    if (!card) return
    setExportState('exporting')
    try {
      await exportCardAsPNG(card)
      setExportState('done')
      setTimeout(() => setExportState('idle'), 3000)
    } catch (err) {
      // cors_taint means the image was still downloaded but without stego
      if (err instanceof Error && err.message === 'cors_taint') {
        setExportState('cors')
        setTimeout(() => setExportState('idle'), 4000)
      } else {
        setExportState('idle')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-void via-app-background to-app-surface flex flex-col items-center justify-center px-4 py-12 gap-10">

      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="absolute top-20 left-4 flex items-center gap-1.5 font-ui text-[11px] uppercase tracking-[0.2em] text-parchment-muted hover:text-parchment transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      {/* Header */}
      <div className="text-center">
        <p className="font-ui text-[10px] uppercase tracking-[0.6em] text-parchment-muted/60 mb-1">
          {isOwner ? 'Binding Circuits Active' : 'Incoming Manifest'}
        </p>
        <h1 className={`font-heading text-3xl tracking-[0.08em] ${rarity.color}`}>
          {creature?.name ?? 'Unknown Entity'}
        </h1>
        {creature?.region && (
          <p className="mt-1 font-ui text-[10px] tracking-[0.35em] uppercase text-parchment-muted/50">
            {creature.region}{creature.country ? `  ${creature.country}` : ''}
          </p>
        )}
      </div>

      {/* Living card - circuits glow */}
      <CardDisplay card={card} size="lg" interactive showQR />

      {/* Compact scan seal + instructions */}
      <div className="flex flex-col sm:flex-row items-center gap-6 w-full max-w-md">
        <div
          className="shrink-0 rounded-xl border p-2"
          style={{ borderColor: `${accent}33`, background: '#06060988', boxShadow: `0 0 20px ${accent}11` }}
        >
          <MagicCircleQR url={tradeUrl} size={148} color={accent} />
        </div>
        <div className="flex flex-col gap-3 text-left">
          {isOwner ? (
            <>
              <p className={`font-ui text-[10px] uppercase tracking-[0.35em] ${rarity.color}`}>
                Show this seal to your counterpart
              </p>
              <p className="font-body text-xs text-parchment-muted leading-relaxed">
                Your card's binding circuits are active. Have them scan the seal with their LocaLore camera — or share the PNG below for a fully digital trade.
              </p>

              {/* Share card as stego PNG */}
              <button
                type="button"
                onClick={() => void handleExport()}
                disabled={exportState === 'exporting'}
                className="flex items-center gap-2 self-start rounded-lg border px-4 py-2 font-ui text-[11px] uppercase tracking-[0.2em] transition-colors disabled:opacity-50"
                style={{ borderColor: `${accent}66`, color: accent, background: `${accent}14` }}
                onMouseEnter={e => (e.currentTarget.style.background = `${accent}26`)}
                onMouseLeave={e => (e.currentTarget.style.background = `${accent}14`)}
              >
                {exportState === 'exporting' ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
                ) : exportState === 'done' ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {exportState === 'exporting' ? 'Encoding…'
                  : exportState === 'done' ? 'Saved!'
                  : exportState === 'cors' ? 'Saved (no hidden data)'
                  : 'Save Card PNG'}
              </button>

              {exportState === 'cors' && (
                <p className="font-ui text-[9px] text-amber-400/60 max-w-[220px] leading-relaxed">
                  Image saved but the hidden circuit data couldn't be embedded (CORS restriction). The QR seal still works for in-person trades.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="font-ui text-[10px] uppercase tracking-[0.35em] text-parchment-muted">
                Scan to propose a trade
              </p>
              <p className="font-body text-xs text-parchment-muted leading-relaxed">
                Point your scanner at the seal to make an offer or send anima directly.
              </p>
              <button
                type="button"
                onClick={() => navigate('/trade/scan')}
                className="flex items-center gap-2 self-start rounded-lg border px-4 py-2 font-ui text-[11px] uppercase tracking-[0.2em] transition-colors"
                style={{ borderColor: `${accent}66`, color: accent, background: `${accent}14` }}
                onMouseEnter={e => (e.currentTarget.style.background = `${accent}26`)}
                onMouseLeave={e => (e.currentTarget.style.background = `${accent}14`)}
              >
                <Scan className="h-4 w-4" />
                Open Scanner
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}