/**
 * RitualPage — The Rite of Convergence
 *
 * Community ritual where users sacrifice Anima and cards.
 * Every Sunday ~02:00 UTC the Rite finalises and Groq conjures a new creature.
 * Reward tiers by contributor rank:
 *   1-5   → Void-Touched card
 *   6-20  → Ephemeral
 *   21-50 → Awakened
 *   51-100 → Manifestation
 *   101+  → Remnant
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { Link } from 'react-router-dom'
import {
  Flame, Eye, Crown, Trophy, User, Loader2,
  Sparkles, Lock, ChevronDown, ChevronUp, AlertCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { UserCard } from '../types/cards'
import { RARITY_META } from '../types/cards'
import { formatFull, formatPrice } from '../lib/currency'
import { useSEO } from '../hooks/useSEO'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RitualSession {
  id: string
  status: 'active' | 'finalizing' | 'complete' | 'cancelled'
  starts_at: string
  ends_at: string
  title: string
  total_anima_pool: number
  total_cards_pool: number
  creature_id: string | null
  result_summary: {
    creature_name?: string
    region?: string
    country?: string
    total_contributors?: number
    top_ingredient?: string
  } | null
}

interface LeaderEntry {
  user_id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  anima_given: number
  card_score: number
  total_score: number
  rank: number
  rarity_breakdown?: {
    whisper: number
    remnant: number
    manifestation: number
    awakened: number
    ephemeral: number
    void_touched: number
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Exponential scoring — 50 whisper ≈ 1 remnant (quality >> quantity)
const RARITY_SCORE: Record<string, number> = {
  whisper: 10, remnant: 500, manifestation: 2500,
  awakened: 10000, ephemeral: 30000, void_touched: 80000,
}

// Used for leaderboard colour-coding only (not reward tiers)
function rarityForRank(rank: number): string {
  if (rank <= 5)   return 'void_touched'
  if (rank <= 20)  return 'ephemeral'
  if (rank <= 50)  return 'awakened'
  if (rank <= 100) return 'manifestation'
  return 'remnant'
}

// What the user actually receives when the Rite closes
function rewardForRank(rank: number): string {
  if (rank <= 5)   return 'Void card + 500⬡'
  if (rank <= 20)  return 'Ephemeral card + 200⬡'
  if (rank <= 50)  return '300⬡ anima'
  if (rank <= 100) return '150⬡ anima'
  return '50⬡ anima'
}

function rankBorderClass(rank: number): string {
  const r = rarityForRank(rank)
  return RARITY_META[r as keyof typeof RARITY_META]?.border ?? 'border-app-border'
}

function rankColorClass(rank: number): string {
  return RARITY_META[rarityForRank(rank) as keyof typeof RARITY_META]?.color ?? 'text-parchment-muted'
}

function rankLabel(rank: number): string {
  return RARITY_META[rarityForRank(rank) as keyof typeof RARITY_META]?.label ?? 'Remnant'
}

function useCountdown(endsAt: string | null) {
  const [display, setDisplay] = useState('')
  const [urgent, setUrgent]   = useState(false)

  useEffect(() => {
    if (!endsAt) return
    function tick() {
      const diff = new Date(endsAt!).getTime() - Date.now()
      if (diff <= 0) { setDisplay('Finalising…'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setUrgent(diff < 3600000)
      setDisplay(d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  return { display, urgent }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const RARITY_ORDER_DISPLAY = ['void_touched', 'ephemeral', 'awakened', 'manifestation', 'remnant', 'whisper']

function LeaderRow({ entry, myId }: { entry: LeaderEntry; myId: string | undefined }) {
  const isMe    = entry.user_id === myId
  const colMeta = RARITY_META[rarityForRank(entry.rank) as keyof typeof RARITY_META]
  const breakdown = entry.rarity_breakdown
    ? RARITY_ORDER_DISPLAY
        .filter(r => (entry.rarity_breakdown![r as keyof typeof entry.rarity_breakdown] ?? 0) > 0)
        .map(r => ({
          rarity: r,
          count:  entry.rarity_breakdown![r as keyof typeof entry.rarity_breakdown] as number,
          meta:   RARITY_META[r as keyof typeof RARITY_META],
        }))
    : null

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
      isMe ? 'border-gold/40 bg-gold/5' : 'border-app-border bg-app-surface/50'
    }`}>
      {/* Rank */}
      <div className="w-6 shrink-0 text-center">
        {entry.rank === 1 ? <Crown className="h-4 w-4 text-gold mx-auto" /> :
         entry.rank === 2 ? <Trophy className="h-4 w-4 text-parchment/60 mx-auto" /> :
         entry.rank === 3 ? <Trophy className="h-4 w-4 text-amber-700 mx-auto" /> :
         <span className="font-mono text-[10px] text-parchment-muted/50">{entry.rank}</span>}
      </div>

      {/* Avatar */}
      <div className={`h-7 w-7 shrink-0 rounded-md border flex items-center justify-center ${rankBorderClass(entry.rank)}`}>
        {entry.avatar_url
          ? <img src={entry.avatar_url} alt="" className="h-full w-full rounded-md object-cover" />
          : <User className="h-3.5 w-3.5 text-parchment-muted/50" />
        }
      </div>

      {/* Name + sacrifice breakdown */}
      <div className="flex-1 min-w-0">
        <span className={`font-ui text-xs font-medium truncate block ${isMe ? 'text-gold' : 'text-parchment'}`}>
          {entry.display_name ?? entry.username ?? 'Unknown'}
          {isMe && <span className="ml-1 text-[9px] text-gold/60">(you)</span>}
        </span>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {entry.anima_given > 0 && (
            <span className="font-ui text-[8px] text-gold/50">⬡×{entry.anima_given.toLocaleString()}</span>
          )}
          {breakdown && breakdown.map(({ rarity, count, meta }) => (
            <span key={rarity} className={`font-ui text-[8px] ${meta.color}`}>
              {meta.glyph}×{count}
            </span>
          ))}
        </div>
      </div>

      {/* Score + projected reward */}
      <div className="shrink-0 text-right">
        <div className="font-mono text-xs font-bold text-parchment">{entry.total_score.toLocaleString()}</div>
        <div className={`font-ui text-[9px] ${colMeta.color}`}>{rewardForRank(entry.rank)}</div>
      </div>
    </div>
  )
}

// ── Lottie fire animation ──────────────────────────────────────────────────────
function RitualFire({ active }: { active: boolean }) {
  return (
    <div className="relative mx-auto w-48 h-48">
      {/* Purple/void ambient glow */}
      <div className={`absolute inset-x-4 bottom-2 h-1/3 rounded-full blur-2xl transition-opacity duration-1000 ${
        active ? 'opacity-80 bg-purple-700/60' : 'opacity-20 bg-purple-900/30'
      }`} />
      <div className={`transition-opacity duration-700 ${
        active ? 'opacity-100' : 'opacity-25 grayscale'
      }`}>
        <DotLottieReact
          src="/lottie/Fire.lottie"
          loop
          autoplay
          style={{ width: '100%', height: '100%', filter: active ? 'hue-rotate(260deg) saturate(1.4)' : 'hue-rotate(260deg) saturate(0.4) brightness(0.5)' }}
        />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RitualPage() {
  useSEO({
    title: 'The Rite of Convergence',
    description: 'Sacrifice Anima and creature cards in the community Rite of Convergence. Each Sunday a new folklore creature is conjured from the void and top contributors receive Void-Touched cards.',
    url: '/rite',
  })

  const { user, openAuthModal } = useAuth()

  // ── State ──────────────────────────────────────────────────────────────────
  const [ritual, setRitual]         = useState<RitualSession | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([])
  const [myCards, setMyCards]       = useState<UserCard[]>([])
  const [selectedCards, setSelected] = useState<Set<string>>(new Set())
  const [animaInput, setAnimaInput] = useState('')
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [success, setSuccess]       = useState<{ anima: number; cardScore: number } | null>(null)
  const [myBalance, setMyBalance]   = useState(0)
  const [showAllLeaders, setShowAll] = useState(false)
  const [pastRituals, setPastRituals] = useState<RitualSession[]>([])
  const [cardPickerOpen, setCardPickerOpen] = useState(false)
  const cardPickerRef = useRef<HTMLDivElement>(null)

  const { display: countdown, urgent } = useCountdown(ritual?.ends_at ?? null)

  // ── Load ritual + leaderboard ──────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Bootstrap ensures there's always an active ritual
      await supabase.rpc('bootstrap_ritual')

      const [{ data: ritualData }, { data: pastData }] = await Promise.all([
        supabase
          .from('ritual_sessions')
          .select('*')
          .eq('status', 'active')
          .order('starts_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('ritual_sessions')
          .select('*')
          .eq('status', 'complete')
          .order('ends_at', { ascending: false })
          .limit(5),
      ])

      if (ritualData) {
        setRitual(ritualData as RitualSession)
        const { data: lb } = await supabase.rpc('get_ritual_leaderboard', {
          p_ritual_id: ritualData.id,
        })
        setLeaderboard((lb as LeaderEntry[]) ?? [])
      }

      setPastRituals((pastData as RitualSession[]) ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Load user balance + un-locked cards ────────────────────────────────────
  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('users').select('anima_balance').eq('id', user.id).maybeSingle(),
      supabase
        .from('user_cards')
        .select('*, definition:card_definitions(rarity, creature:creatures(name))')
        .eq('user_id', user.id)
        .eq('is_locked', false)
        .eq('is_listed_market', false)
        .eq('is_listed_auction', false)
        .order('created_at', { ascending: false })
        .limit(100),
    ]).then(([{ data: u }, { data: cards }]) => {
      setMyBalance(u?.anima_balance ?? 0)
      setMyCards((cards as UserCard[]) ?? [])
    })
  }, [user, success])

  useEffect(() => { void load() }, [load])

  // Close card picker on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (cardPickerRef.current && !cardPickerRef.current.contains(e.target as Node)) {
        setCardPickerOpen(false)
      }
    }
    if (cardPickerOpen) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [cardPickerOpen])

  // ── Toggle card selection ──────────────────────────────────────────────────
  function toggleCard(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else              next.add(id)
      return next
    })
  }

  // ── Compute offering preview ───────────────────────────────────────────────
  const animaAmount = parseInt(animaInput) || 0
  const selectedCardList = myCards.filter(c => selectedCards.has(c.id))
  const cardScorePreview = selectedCardList.reduce((acc, c) => {
    const rarity = (c.definition as any)?.rarity as string ?? 'whisper'
    return acc + (RARITY_SCORE[rarity] ?? 10)
  }, 0)
  const totalScorePreview = animaAmount + cardScorePreview

  // ── Submit offering ────────────────────────────────────────────────────────
  async function handleOffer() {
    if (!user) { openAuthModal(); return }
    if (!ritual) return
    if (animaAmount === 0 && selectedCards.size === 0) {
      setError('Offer at least some Anima or one card.')
      return
    }
    if (animaAmount > myBalance) {
      setError(`Not enough Anima (you have ${formatFull(myBalance)} ⬡).`)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const { data, error: rpcErr } = await supabase.rpc('offer_to_ritual', {
        p_ritual_id: ritual.id,
        p_anima:     animaAmount,
        p_card_ids:  selectedCardList.map(c => c.id),
      })
      if (rpcErr) throw rpcErr

      const res = data as { success: boolean; anima_given: number; card_score: number }
      if (res.success) {
        setSuccess({ anima: res.anima_given, cardScore: res.card_score })
        setAnimaInput('')
        setSelected(new Set())
        // Refresh leaderboard
        const { data: lb } = await supabase.rpc('get_ritual_leaderboard', {
          p_ritual_id: ritual.id,
        })
        setLeaderboard((lb as LeaderEntry[]) ?? [])
        // Refresh ritual totals
        const { data: r } = await supabase
          .from('ritual_sessions')
          .select('*')
          .eq('id', ritual.id)
          .maybeSingle()
        if (r) setRitual(r as RitualSession)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.includes('Insufficient') ? 'Not enough Anima.' :
               msg.includes('locked')       ? 'One or more selected cards are locked.' :
               msg.includes('listed')       ? 'Delist cards before sacrificing them.' :
               msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ── My current standing ───────────────────────────────────────────────────
  const myEntry = leaderboard.find(e => e.user_id === user?.id)
  const isRitualActive = ritual?.status === 'active'

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-app-background py-8 px-4">
      <div className="mx-auto max-w-5xl space-y-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="text-center space-y-1">
          <h1 className="font-heading text-3xl tracking-[0.2em] text-gold">
            The Rite of Convergence
          </h1>
          <p className="font-body text-sm text-parchment-muted/70 max-w-lg mx-auto leading-relaxed">
            Cast your offerings into the fire. Each Sunday at the dark hour the Void stirs
            and from your sacrifices a new creature is born — unseen, unnamed, and waiting.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-parchment-muted/40" />
          </div>
        ) : ritual ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* ── LEFT: Pyre + Offering Form ─────────────────────────────── */}
            <div className="lg:col-span-3 space-y-4">

              {/* Ritual status card */}
              <div className={`rounded-2xl border overflow-hidden ${
                isRitualActive ? 'border-purple-500/30' : 'border-app-border'
              }`}>

                {/* Status banner */}
                <div className={`flex items-center justify-between px-4 py-2.5 text-[11px] font-ui uppercase tracking-[0.15em] ${
                  isRitualActive
                    ? 'bg-purple-900/20 text-purple-300'
                    : 'bg-app-surface text-parchment-muted/50'
                }`}>
                  <span className="flex items-center gap-2">
                    {isRitualActive
                      ? <><span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" /> Active ritual</>
                      : <>✦ Finalising…</>
                    }
                  </span>
                  <span className={urgent ? 'text-red-400 font-bold' : ''}>{countdown}</span>
                </div>

                {/* Pyre + pool stats */}
                <div className="bg-app-surface px-6 py-6 text-center space-y-2">
                  <RitualFire active={isRitualActive} />

                  <div className="flex items-center justify-center gap-8 pt-2">
                    <div className="text-center">
                      <div className="font-heading text-xl text-gold">{formatPrice(ritual.total_anima_pool)}</div>
                      <div className="font-ui text-[9px] text-parchment-muted/50 uppercase tracking-[0.15em]">Anima offered</div>
                    </div>
                    <div className="h-6 w-px bg-app-border" />
                    <div className="text-center">
                      <div className="font-heading text-xl text-parchment">{ritual.total_cards_pool}</div>
                      <div className="font-ui text-[9px] text-parchment-muted/50 uppercase tracking-[0.15em]">Cards sacrificed</div>
                    </div>
                    <div className="h-6 w-px bg-app-border" />
                    <div className="text-center">
                      <div className="font-heading text-xl text-parchment">{leaderboard.length}</div>
                      <div className="font-ui text-[9px] text-parchment-muted/50 uppercase tracking-[0.15em]">Participants</div>
                    </div>
                  </div>
                </div>

                {/* Reward tier legend */}
                <div className="border-t border-app-border bg-app-background px-4 py-3">
                  <p className="font-ui text-[9px] text-parchment-muted/35 uppercase tracking-[0.15em] text-center mb-2">
                    Creature cards exclusive to top 20 · everyone else earns anima
                  </p>
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    {([
                      { ranks: '1–5',  rarity: 'void_touched' as const, bonus: '500⬡' },
                      { ranks: '6–20', rarity: 'ephemeral'    as const, bonus: '200⬡' },
                    ]).map(({ ranks, rarity, bonus }) => {
                      const m = RARITY_META[rarity]
                      return (
                        <div key={rarity} className={`flex items-center gap-1.5 rounded border px-2 py-1.5 ${m.border} bg-app-surface/40`}>
                          <span className={`font-ui text-[9px] font-semibold ${m.color}`}>{m.glyph} {m.label}</span>
                          <span className="font-ui text-[8px] text-parchment-muted/50">card + {bonus} · rank {ranks}</span>
                        </div>
                      )
                    })}
                    {([
                      { ranks: '21–50',  anima: '300⬡' },
                      { ranks: '51–100', anima: '150⬡' },
                      { ranks: '101+',   anima: '50⬡' },
                    ]).map(({ ranks, anima }) => (
                      <div key={ranks} className="flex items-center gap-1.5 rounded border border-app-border px-2 py-1.5">
                        <span className="font-ui text-[9px] text-parchment-muted/60">{anima} anima</span>
                        <span className="font-ui text-[8px] text-parchment-muted/35">· rank {ranks}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Offering form ──────────────────────────────────────────── */}
              {isRitualActive && (
                <div className="rounded-xl border border-app-border bg-app-surface p-4 space-y-4">
                  <h2 className="font-ui text-xs font-semibold uppercase tracking-[0.18em] text-parchment">
                    Make Your Offering
                  </h2>

                  {/* My standing */}
                  {myEntry && (
                    <div className={`rounded-lg border px-3 py-2 flex items-center justify-between ${rankBorderClass(myEntry.rank)}`}>
                      <span className="font-ui text-[10px] text-parchment-muted">Your rank</span>
                      <div className="text-right">
                        <span className={`font-mono text-sm font-bold ${rankColorClass(myEntry.rank)}`}>
                          #{myEntry.rank}
                        </span>
                        <span className="font-ui text-[9px] text-parchment-muted/50 ml-1.5">
                          ({myEntry.total_score.toLocaleString()} pts · earns {rankLabel(myEntry.rank)})
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Anima input */}
                  <div>
                    <label className="font-ui text-[10px] text-parchment-muted/60 uppercase tracking-[0.12em] block mb-1.5">
                      Anima to sacrifice (balance: {formatFull(myBalance)} ⬡)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={myBalance}
                        value={animaInput}
                        onChange={e => setAnimaInput(e.target.value)}
                        placeholder="0"
                        className="flex-1 rounded-lg border border-app-border bg-app-background px-3 py-2 font-mono text-sm text-parchment focus:border-gold/40 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setAnimaInput(String(myBalance))}
                        className="shrink-0 rounded-lg border border-app-border px-3 py-2 font-ui text-[10px] text-parchment-muted/60 hover:text-parchment hover:border-gold/30 transition"
                      >
                        All in
                      </button>
                    </div>
                  </div>

                  {/* Card selector */}
                  <div ref={cardPickerRef} className="relative">
                    <label className="font-ui text-[10px] text-parchment-muted/60 uppercase tracking-[0.12em] block mb-1.5">
                      Cards to sacrifice ({selectedCards.size} selected · {cardScorePreview} score)
                    </label>
                    <button
                      type="button"
                      onClick={() => setCardPickerOpen(o => !o)}
                      className="w-full flex items-center justify-between rounded-lg border border-app-border bg-app-background px-3 py-2 font-ui text-sm text-parchment-muted/60 hover:border-gold/30 transition"
                    >
                      <span>{selectedCards.size > 0 ? `${selectedCards.size} card${selectedCards.size === 1 ? '' : 's'} chosen` : 'Choose cards to burn…'}</span>
                      {cardPickerOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {cardPickerOpen && (
                      <div className="absolute z-30 top-full mt-1 left-0 right-0 max-h-64 overflow-y-auto rounded-xl border border-app-border bg-void/98 shadow-void-deep backdrop-blur-2xl divide-y divide-app-border/50">
                        {myCards.length === 0 ? (
                          <p className="p-4 text-center font-ui text-[10px] text-parchment-muted/40">
                            No available cards. Open some packs first.
                          </p>
                        ) : myCards.map(card => {
                          const rarity = (card.definition as any)?.rarity as string ?? 'whisper'
                          const name   = (card.definition as any)?.creature?.name ?? 'Unknown'
                          const meta   = RARITY_META[rarity as keyof typeof RARITY_META]
                          const score  = RARITY_SCORE[rarity] ?? 10
                          const sel    = selectedCards.has(card.id)
                          return (
                            <button
                              key={card.id}
                              type="button"
                              onClick={() => toggleCard(card.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                                sel ? 'bg-purple-900/20' : 'hover:bg-app-surface/60'
                              }`}
                            >
                              <div className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                                sel ? 'border-purple-400 bg-purple-500/30' : 'border-app-border'
                              }`}>
                                {sel && <div className="h-2 w-2 rounded-sm bg-purple-400" />}
                              </div>
                              <span className={`font-ui text-xs truncate flex-1 ${meta.color}`}>{meta.glyph} {name}</span>
                              <span className="font-mono text-[9px] text-parchment-muted/40 shrink-0">+{score}pts</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Score preview */}
                  {(animaAmount > 0 || selectedCards.size > 0) && (
                    <div className="rounded-lg border border-purple-500/20 bg-purple-900/10 px-3 py-2.5">
                      <div className="flex items-center justify-between text-[10px] font-ui">
                        <span className="text-parchment-muted/60">Anima score</span>
                        <span className="text-parchment">{animaAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-ui mt-0.5">
                        <span className="text-parchment-muted/60">Card score</span>
                        <span className="text-parchment">{cardScorePreview}</span>
                      </div>
                      <div className="border-t border-purple-500/20 mt-1.5 pt-1.5 flex items-center justify-between text-xs font-ui">
                        <span className="text-purple-300 font-semibold">Total contribution</span>
                        <span className="text-purple-300 font-bold">{totalScorePreview.toLocaleString()} pts</span>
                      </div>
                    </div>
                  )}

                  {/* Errors / success */}
                  {error && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-900/10 px-3 py-2">
                      <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      <span className="font-ui text-[10px] text-red-400">{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="rounded-lg border border-purple-500/30 bg-purple-900/10 px-3 py-2">
                      <p className="font-ui text-[10px] text-purple-300">
                        ✦ Offering accepted — {formatFull(success.anima)} ⬡ and {success.cardScore} card score consumed.
                        The Void stirs…
                      </p>
                    </div>
                  )}

                  {/* Warning */}
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-900/8 px-3 py-2">
                    <Lock className="h-3 w-3 text-amber-400/70 shrink-0 mt-0.5" />
                    <p className="font-ui text-[9px] text-amber-400/70 leading-relaxed">
                      Sacrifices are permanent. Anima and cards offered cannot be recovered.
                      Cards will be locked and consumed by the Rite.
                    </p>
                  </div>

                  {/* Submit */}
                  <button
                    type="button"
                    disabled={submitting || (animaAmount === 0 && selectedCards.size === 0)}
                    onClick={() => user ? void handleOffer() : openAuthModal()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-purple-500/50 bg-purple-900/30
                      px-4 py-3 font-ui text-sm font-semibold text-purple-300 uppercase tracking-[0.2em]
                      hover:bg-purple-900/50 hover:border-purple-400/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Offering…</>
                      : <><Flame className="h-4 w-4" /> Cast into the fire</>
                    }
                  </button>
                </div>
              )}
            </div>

            {/* ── RIGHT: Leaderboard ────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-app-border">
                  <div className="flex items-center gap-2">
                    <Crown className="h-3.5 w-3.5 text-gold" />
                    <span className="font-ui text-xs font-semibold text-parchment uppercase tracking-[0.15em]">
                      Ritual Pact
                    </span>
                  </div>
                  <span className="font-ui text-[9px] text-parchment-muted/40">{leaderboard.length} witnesses</span>
                </div>

                <div className="divide-y divide-app-border/40 px-3 py-2 space-y-1.5">
                  {leaderboard.length === 0 ? (
                    <div className="py-8 text-center">
                      <Eye className="h-6 w-6 text-parchment-muted/20 mx-auto mb-2" />
                      <p className="font-ui text-[10px] text-parchment-muted/40">
                        No offerings yet. Be the first.
                      </p>
                    </div>
                  ) : (showAllLeaders ? leaderboard : leaderboard.slice(0, 10)).map(entry => (
                      <LeaderRow key={entry.user_id} entry={entry} myId={user?.id} />
                  ))}

                  {leaderboard.length > 10 && (
                    <button
                      type="button"
                      onClick={() => setShowAll(o => !o)}
                      className="w-full py-2 font-ui text-[10px] text-parchment-muted/50 hover:text-parchment transition flex items-center justify-center gap-1"
                    >
                      {showAllLeaders ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show all {leaderboard.length}</>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

        ) : (
          <div className="text-center py-20 text-parchment-muted/40">
            <Flame className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-ui text-sm">The pyre is cold. No ritual is active.</p>
          </div>
        )}

        {/* ── Past Rites ─────────────────────────────────────────────────── */}
        {pastRituals.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-heading text-lg text-gold tracking-[0.15em]">Past Rites</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pastRituals.map(r => (
                <div
                  key={r.id}
                  className="rounded-xl border border-app-border bg-app-surface p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                    <span className="font-ui text-[9px] text-parchment-muted/50 uppercase tracking-[0.12em]">
                      {new Date(r.ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  {r.result_summary?.creature_name ? (
                    <>
                      <p className="font-heading text-sm text-gold leading-tight">
                        {r.result_summary.creature_name}
                      </p>
                      <p className="font-ui text-[10px] text-parchment-muted/60">
                        {r.result_summary.region}, {r.result_summary.country}
                      </p>
                      <div className="flex items-center gap-3 text-[9px] font-ui text-parchment-muted/40">
                        <span>{formatFull(r.total_anima_pool)} ⬡ offered</span>
                        <span>·</span>
                        <span>{r.result_summary.total_contributors ?? 0} witnesses</span>
                      </div>
                      {r.creature_id && (
                        <Link
                          to={`/creatures/${r.result_summary.creature_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                          className="inline-block font-ui text-[9px] text-gold/70 hover:text-gold border border-gold/20 rounded px-2 py-0.5 transition"
                        >
                          View creature →
                        </Link>
                      )}
                    </>
                  ) : (
                    <p className="font-ui text-[10px] text-parchment-muted/40 italic">The Void was silent.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
