import { useState, useEffect, useRef, useCallback } from 'react'
import { Gavel, Eye, Clock, TrendingUp, X, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { AuctionListing } from '../types/cards'
import { formatPrice } from '../lib/currency'
import CardDisplay from '../components/cards/CardDisplay'
import CurrencyBadge from '../components/cards/CurrencyBadge'
import RarityBadge from '../components/cards/RarityBadge'

function useVisible(ref: React.RefObject<Element | null>) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.25 })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [ref])
  return visible
}

// Fires the settle Edge Function exactly once when this countdown hits zero.
// All connected clients race to call it; the function is idempotent so duplicates are harmless.
function Countdown({ endsAt, auctionId }: { endsAt: string; auctionId: string }) {
  const [remaining, setRemaining] = useState('')
  const [urgent, setUrgent] = useState(false)
  const settled = useRef(false)

  useEffect(() => {
    settled.current = false // reset if endsAt changes (snipe extension)
  }, [endsAt])

  useEffect(() => {
    function tick() {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) {
        setRemaining('Ended')
        if (!settled.current) {
          settled.current = true
          // Best-effort: fire and forget. Idempotent on the server.
          supabase.functions.invoke('settle-auction', { body: { auctionId } }).catch(() => {})
        }
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setUrgent(diff < 300_000) // < 5 min
      setRemaining(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt, auctionId])

  return <span className={urgent ? 'text-red-400 animate-auction-pulse' : 'text-parchment-muted'}>{remaining}</span>
}

export default function AuctionHousePage() {
  const { user } = useAuth()
  const [auctions, setAuctions]   = useState<AuctionListing[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<AuctionListing | null>(null)
  const [bidAmount, setBidAmount] = useState('')
  const [bidError, setBidError]   = useState<string | null>(null)
  const [bidLoading, setBidLoad]  = useState(false)
  const [balance, setBalance]     = useState(0)

  const s2Ref    = useRef<HTMLElement>(null)
  const s3Ref    = useRef<HTMLElement>(null)
  const s2Vis    = useVisible(s2Ref as React.RefObject<Element>)
  const s3Vis    = useVisible(s3Ref as React.RefObject<Element>)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Helper: fetch a single listing with all joins
  const fetchListing = useCallback(async (id: string): Promise<AuctionListing | null> => {
    const { data } = await supabase
      .from('auction_listings')
      .select('*, user_card:user_cards(*, definition:card_definitions(*, creature:creatures(*)))')
      .eq('id', id)
      .maybeSingle()
    return (data as AuctionListing | null)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data }, { data: u }] = await Promise.all([
      supabase.from('auction_listings')
        .select('*, user_card:user_cards(*, definition:card_definitions(*, creature:creatures(*)))')
        .eq('status', 'active')
        .order('ends_at', { ascending: true }),
      user ? supabase.from('users').select('anima_balance').eq('id', user.id).maybeSingle() : { data: null },
    ])
    setAuctions((data ?? []) as AuctionListing[])
    setBalance(u?.anima_balance ?? 0)
    setLoading(false)
  }, [user])

  // Supabase Realtime: keep auctions and bid modal in sync
  useEffect(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const ch = supabase
      .channel('auction-house-live')
      // Existing listing updated (new bid, snipe extension, status change)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auction_listings' },
        async (payload) => {
          const id = (payload.new as { id: string }).id
          const fresh = await fetchListing(id)
          if (!fresh) return
          setAuctions(prev => {
            if (fresh.status !== 'active') return prev.filter(a => a.id !== id)
            const idx = prev.findIndex(a => a.id === id)
            if (idx === -1) return prev
            const next = [...prev]
            next[idx] = fresh
            return next
          })
          // Refresh the open bid modal so the user sees the latest price
          setSelected(prev => prev?.id === id ? fresh : prev)
        },
      )
      // Brand-new listing goes live
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'auction_listings' },
        async (payload) => {
          const id = (payload.new as { id: string; status: string }).id
          if ((payload.new as { status: string }).status !== 'active') return
          const fresh = await fetchListing(id)
          if (fresh) setAuctions(prev =>
            [...prev, fresh].sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime())
          )
        },
      )
      .subscribe()

    channelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [fetchListing])

  useEffect(() => { void load() }, [load])

  // Re-sync user balance from server after a bid lands (ours or someone else's)
  useEffect(() => {
    if (!user) return
    const balCh = supabase
      .channel('user-balance-live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
        (payload) => {
          const u = payload.new as { anima_balance: number }
          if (u.anima_balance !== undefined) setBalance(u.anima_balance)
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(balCh) }
  }, [user])

  async function placeBid() {
    if (!user || !selected) return
    const amount = parseInt(bidAmount, 10)
    if (!amount || amount <= 0) { setBidError('Enter a valid bid amount.'); return }

    // Fetch the freshest listing to guard against stale state
    const fresh = await fetchListing(selected.id)
    if (!fresh || fresh.status !== 'active') { setBidError('This auction has already ended.'); setBidLoad(false); return }

    const minBid = (fresh.current_bid_anima ?? fresh.starting_bid_anima) + 1
    if (amount < minBid) { setBidError(`Minimum bid is now ${formatPrice(minBid)}`); return }
    if (amount > balance) { setBidError('Insufficient anima.'); return }

    setBidLoad(true)
    setBidError(null)

    // Use RPC for atomic bid: refunds previous bidder, deducts from new bidder, handles snipe extension
    const { error } = await supabase.rpc('place_auction_bid', {
      p_auction_id: selected.id,
      p_amount:     amount,
    })

    if (error) {
      setBidError(error.message)
      setBidLoad(false)
      return
    }

    setSelected(null)
    setBidAmount('')
    setBidLoad(false)
    // Realtime will update the listings; also refresh balance
    const { data: u } = await supabase.from('users').select('anima_balance').eq('id', user.id).maybeSingle()
    if (u) setBalance(u.anima_balance)
  }

  const featured = auctions.slice(0, 2)

  return (
    <div
      className="h-[calc(100dvh-theme(spacing.14))] overflow-y-auto"
      style={{ scrollSnapType: 'y mandatory', scrollBehavior: 'smooth' }}
    >

      {/* ── Scene 1 — The Bidding Chamber ──────────────────────────────── */}
      <section
        className="relative flex h-[100dvh] flex-col items-center justify-center overflow-hidden"
        style={{ scrollSnapAlign: 'start', background: 'radial-gradient(ellipse at 50% 60%, #1a0a00 0%, #050507 70%)' }}
      >
        {/* Particle-like dots */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="pointer-events-none absolute rounded-full bg-amber-500/20 animate-pulse"
            style={{ width: 2 + (i % 4), height: 2 + (i % 4), top: `${10 + i * 7}%`, left: `${8 + i * 8}%`, animationDelay: `${i * 0.3}s`, animationDuration: `${2 + i * 0.4}s` }}
          />
        ))}
        <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-amber-400/30 animate-auction-pulse" />
            <Gavel className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <p className="font-ui text-[10px] uppercase tracking-[0.5em] text-parchment-muted mb-2">Timed Exchange</p>
            <h1 className="font-heading text-5xl sm:text-6xl tracking-[0.1em] text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]">
              Auction House
            </h1>
            <p className="mt-4 font-body text-lg text-parchment-muted max-w-md mx-auto leading-relaxed">
              Time-bound. Highest bid claims the manifest. Bids in the final five minutes extend the clock.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-ui text-[10px] uppercase tracking-[0.3em] text-parchment-muted">
              {auctions.length} auction{auctions.length !== 1 ? 's' : ''} live
            </span>
          </div>
          <p className="font-ui text-[9px] uppercase tracking-[0.3em] text-parchment-muted/40 animate-bounce mt-4">
            Scroll to bid
          </p>
        </div>
      </section>

      {/* ── Scene 2 — Featured ──────────────────────────────────────────── */}
      <section
        ref={s2Ref}
        className="relative flex h-[100dvh] flex-col items-center justify-center bg-app-surface"
        style={{ scrollSnapAlign: 'start' }}
      >
        <div className={`relative z-10 w-full max-w-4xl px-6 transition-all duration-700 ${s2Vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-8">
            <p className="font-ui text-[10px] uppercase tracking-[0.4em] text-parchment-muted mb-2">Most Contested</p>
            <h2 className="font-heading text-3xl tracking-[0.12em] text-amber-400">Active Auctions</h2>
          </div>
          {featured.length === 0 ? (
            <p className="text-center font-body text-parchment-muted py-8">The chamber is silent. No auctions active.</p>
          ) : (
            <div className="flex flex-wrap justify-center gap-8">
              {featured.map(a => a.user_card?.definition && (
                <div key={a.id} className="flex flex-col items-center gap-3">
                  <CardDisplay card={a.user_card as never} size="lg" interactive />
                  <div className="text-center space-y-1">
                    <div className="flex items-center gap-2 justify-center">
                      <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
                      <CurrencyBadge anima={a.current_bid_anima ?? a.starting_bid_anima} size="sm" />
                    </div>
                    <div className="flex items-center gap-1.5 justify-center">
                      <Clock className="h-3 w-3 text-parchment-muted" />
                      <span className="font-ui text-[11px]"><Countdown endsAt={a.ends_at} auctionId={a.id} /></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelected(a); setBidAmount(String((a.current_bid_anima ?? a.starting_bid_anima) + 10)) }}
                      className="mt-2 rounded-lg border border-amber-500/40 bg-amber-900/20 px-4 py-1.5 font-ui text-[11px] uppercase tracking-[0.2em] text-amber-400 hover:bg-amber-900/40 transition-colors"
                    >
                      Place Bid
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Scene 3 — All auctions ─────────────────────────────────────── */}
      <section
        ref={s3Ref}
        className="min-h-[100dvh] bg-app-background px-4 py-12 sm:px-6"
        style={{ scrollSnapAlign: 'start' }}
      >
        <div className={`mx-auto max-w-7xl transition-all duration-700 ${s3Vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="font-heading text-2xl tracking-[0.12em] text-amber-400 mb-8">All Live Auctions</h2>
          {loading ? (
            <div className="flex justify-center py-20"><Eye className="h-6 w-6 text-gold animate-flicker" /></div>
          ) : auctions.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <p className="font-heading text-xl text-parchment-muted">The chamber awaits its first bid.</p>
              <p className="text-sm text-parchment-muted">List a card from your collection to start an auction.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {auctions.map(a => a.user_card?.definition && (
                <div key={a.id} className="rounded-xl border border-app-border bg-app-surface p-4 hover:border-amber-400/20 transition-all">
                  <div className="flex gap-4">
                    <div className="shrink-0">
                      <CardDisplay card={a.user_card as never} size="sm" interactive={false} />
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <p className="font-heading text-sm text-parchment truncate">{a.user_card.definition.creature?.name}</p>
                      <RarityBadge rarity={a.user_card.definition.rarity} size="xs" />
                      <div className="flex items-center gap-1.5 mt-1">
                        <TrendingUp className="h-3 w-3 text-amber-400" />
                        <CurrencyBadge anima={a.current_bid_anima ?? a.starting_bid_anima} size="xs" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-parchment-muted" />
                        <span className="font-ui text-[10px]"><Countdown endsAt={a.ends_at} auctionId={a.id} /></span>
                      </div>
                      {a.snipe_extended_at && (
                        <div className="flex items-center gap-1">
                          <ChevronUp className="h-2.5 w-2.5 text-amber-400" />
                          <span className="font-ui text-[9px] text-amber-400 uppercase tracking-[0.15em]">Extended</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => { setSelected(a); setBidAmount(String((a.current_bid_anima ?? a.starting_bid_anima) + 10)) }}
                        className="mt-auto rounded border border-amber-500/30 py-1 font-ui text-[10px] uppercase tracking-[0.15em] text-amber-400 hover:bg-amber-900/20 transition-colors"
                      >
                        Bid
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Bid modal ────────────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-amber-400/30 bg-app-surface p-6 space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="font-heading text-lg text-amber-400">Place a Bid</h3>
              <button type="button" onClick={() => setSelected(null)} className="text-parchment-muted hover:text-parchment"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-3">
              {selected.user_card?.definition && <CardDisplay card={selected.user_card as never} size="sm" interactive={false} />}
              <div className="space-y-1.5">
                <p className="font-heading text-sm text-parchment">{selected.user_card?.definition?.creature?.name}</p>
                <p className="font-ui text-[10px] text-parchment-muted">Current: <span className="text-amber-400">{formatPrice(selected.current_bid_anima ?? selected.starting_bid_anima)}</span></p>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-parchment-muted" />
                  <span className="font-ui text-[10px]"><Countdown endsAt={selected.ends_at} auctionId={selected.id} /></span>
                </div>
                {selected.snipe_extended_at && (
                  <p className="font-ui text-[9px] text-amber-400">⚡ Snipe protection active</p>
                )}
              </div>
            </div>
            <div>
              <label className="font-ui text-[10px] uppercase tracking-[0.2em] text-parchment-muted block mb-1.5">Your Bid (Anima)</label>
              <input
                type="number"
                min={(selected.current_bid_anima ?? selected.starting_bid_anima) + 1}
                value={bidAmount}
                onChange={e => setBidAmount(e.target.value)}
                className="w-full rounded border border-app-border bg-void px-3 py-2 font-ui text-sm text-parchment focus:border-amber-400/40 focus:outline-none"
              />
              {bidAmount && parseInt(bidAmount) > 0 && (
                <p className="mt-1 font-ui text-[10px] text-parchment-muted">≈ <CurrencyBadge anima={parseInt(bidAmount)} size="xs" /></p>
              )}
              <p className="mt-1 font-ui text-[9px] text-parchment-muted/60">Your balance: {formatPrice(balance)}</p>
            </div>
            {bidError && <p className="text-xs text-crimson">{bidError}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => void placeBid()}
                disabled={bidLoading}
                className="flex-1 rounded-lg border border-amber-500/40 bg-amber-900/20 py-2 font-ui text-[11px] uppercase tracking-[0.2em] text-amber-400 hover:bg-amber-900/40 disabled:opacity-50 transition-colors"
              >
                {bidLoading ? 'Placing...' : 'Place Bid'}
              </button>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-app-border px-4 py-2 font-ui text-[11px] text-parchment-muted hover:border-parchment-muted/40 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
