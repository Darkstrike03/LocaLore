import { useState, useEffect, useCallback } from 'react'
import { Eye, Plus, ArrowRightLeft, Check, X, MessageSquare } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { TradeOffer, UserCard } from '../types/cards'
import CardDisplay from '../components/cards/CardDisplay'
import RarityBadge from '../components/cards/RarityBadge'

type TradeTab = 'incoming' | 'outgoing' | 'new'

export default function TradePage() {
  const { user } = useAuth()
  const [tab, setTab]              = useState<TradeTab>('incoming')
  const [incoming, setIncoming]    = useState<TradeOffer[]>([])
  const [outgoing, setOutgoing]    = useState<TradeOffer[]>([])
  const [loading, setLoading]      = useState(true)

  // ── New trade form state ─────────────────────────────────────────────
  const [myCards, setMyCards]      = useState<(UserCard & { definition: NonNullable<UserCard['definition']> })[]>([])
  const [targetUsername, setTargetUsername] = useState('')
  const [theirCards, setTheirCards] = useState<(UserCard & { definition: NonNullable<UserCard['definition']> })[]>([])
  const [offeredIds, setOfferedIds] = useState<string[]>([])
  const [requestedIds, setRequestedIds] = useState<string[]>([])
  const [message, setMessage]      = useState('')
  const [formError, setFormError]  = useState<string | null>(null)
  const [targetUserId, setTargetUserId] = useState<string | null>(null)
  const [searching, setSearching]  = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [{ data: inc }, { data: out }, { data: mine }] = await Promise.all([
      supabase.from('trade_offers')
        .select('*, from_user:users!from_user_id(username, display_name), offered_cards:user_cards(*, definition:card_definitions(*, creature:creatures(*)))')
        .eq('to_user_id', user.id).eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('trade_offers')
        .select('*, to_user:users!to_user_id(username, display_name), offered_cards:user_cards(*, definition:card_definitions(*, creature:creatures(*)))')
        .eq('from_user_id', user.id).in('status', ['pending', 'countered']).order('created_at', { ascending: false }),
      supabase.from('user_cards')
        .select('*, definition:card_definitions(*, creature:creatures(*))')
        .eq('user_id', user.id).eq('is_locked', false).eq('is_listed_market', false).eq('is_listed_auction', false),
    ])
    setIncoming((inc ?? []) as TradeOffer[])
    setOutgoing((out ?? []) as TradeOffer[])
    setMyCards((mine ?? []) as (UserCard & { definition: NonNullable<UserCard['definition']> })[])
    setLoading(false)
  }, [user])

  useEffect(() => { void load() }, [load])

  // ── Search target user's cards ──────────────────────────────────────
  async function searchTarget() {
    setSearching(true)
    setFormError(null)
    const { data: u } = await supabase.from('users').select('id').eq('username', targetUsername).maybeSingle()
    if (!u) { setFormError('Archivist not found.'); setSearching(false); return }
    setTargetUserId(u.id)
    const { data: cards } = await supabase.from('user_cards')
      .select('*, definition:card_definitions(*, creature:creatures(*))')
      .eq('user_id', u.id).eq('is_locked', false).eq('is_listed_market', false).eq('is_listed_auction', false)
    setTheirCards((cards ?? []) as (UserCard & { definition: NonNullable<UserCard['definition']> })[])
    setSearching(false)
  }

  // ── Submit trade offer ───────────────────────────────────────────────
  async function submitOffer() {
    if (!user || !targetUserId) return
    if (offeredIds.length === 0 || requestedIds.length === 0) { setFormError('Select at least one card from each side.'); return }
    // Lock offered cards
    for (const id of offeredIds) await supabase.from('user_cards').update({ is_locked: true }).eq('id', id)
    await supabase.from('trade_offers').insert({
      from_user_id: user.id, to_user_id: targetUserId,
      offered_card_ids: offeredIds, requested_card_ids: requestedIds, message: message || null,
    })
    setOfferedIds([]); setRequestedIds([]); setMessage(''); setTargetUsername(''); setTargetUserId(null); setTheirCards([])
    setTab('outgoing')
    void load()
  }

  // ── Respond to trade ─────────────────────────────────────────────────
  async function respond(offer: TradeOffer, action: 'accepted' | 'declined') {
    if (!user) return
    await supabase.from('trade_offers').update({ status: action, responded_at: new Date().toISOString() }).eq('id', offer.id)
    if (action === 'accepted') {
      // Swap ownership
      for (const id of offer.offered_card_ids)    await supabase.from('user_cards').update({ user_id: user.id,           acquired_via: 'trade', is_locked: false }).eq('id', id)
      for (const id of offer.requested_card_ids)  await supabase.from('user_cards').update({ user_id: offer.from_user_id, acquired_via: 'trade', is_locked: false }).eq('id', id)
    } else {
      for (const id of offer.offered_card_ids)    await supabase.from('user_cards').update({ is_locked: false }).eq('id', id)
    }
    void load()
  }

  function toggleSelect(id: string, list: string[], setter: (v: string[]) => void) {
    setter(list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  }

  const TABS: { key: TradeTab; label: string; count?: number }[] = [
    { key: 'incoming', label: 'Incoming', count: incoming.length },
    { key: 'outgoing', label: 'Outgoing', count: outgoing.length },
    { key: 'new', label: 'New Trade' },
  ]

  if (!user) return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-heading text-xl text-parchment-muted">Sign in to access the trade board.</p>
    </div>
  )

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center"><Eye className="h-6 w-6 text-gold animate-flicker" /></div>
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-8 text-center">
        <p className="font-ui text-[10px] uppercase tracking-[0.4em] text-parchment-muted mb-2">Archive Exchange</p>
        <h1 className="font-heading text-4xl tracking-[0.15em] text-violet-400 drop-shadow-[0_0_20px_rgba(167,139,250,0.4)]">
          Trade Board
        </h1>
        <p className="mt-3 font-body text-sm text-parchment-muted">Peer-to-peer exchanges. Both parties must agree. The archive witnesses.</p>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 rounded-xl border border-app-border bg-app-surface p-1">
        {TABS.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 font-ui text-[11px] uppercase tracking-[0.2em] transition-all ${
              tab === key ? 'bg-violet-900/40 text-violet-300 border border-violet-500/30' : 'text-parchment-muted hover:text-parchment'
            }`}
          >
            {label}
            {count != null && count > 0 && (
              <span className="rounded-full bg-crimson/30 px-1.5 py-0.5 font-ui text-[9px] text-crimson">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Incoming ─────────────────────────────────────────────────── */}
      {tab === 'incoming' && (
        <div className="space-y-4">
          {incoming.length === 0 && <div className="py-20 text-center"><p className="font-body text-parchment-muted">No pending trade offers.</p></div>}
          {incoming.map(offer => (
            <div key={offer.id} className="rounded-xl border border-app-border bg-app-surface p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-ui text-xs text-parchment-muted">
                  From <span className="text-parchment">{(offer as { from_user?: { username: string | null; display_name: string | null } }).from_user?.display_name ?? (offer as { from_user?: { username: string | null } }).from_user?.username ?? 'Unknown'}</span>
                </p>
                <span className="font-ui text-[9px] text-parchment-muted/50">{new Date(offer.created_at).toLocaleDateString()}</span>
              </div>
              {offer.message && (
                <p className="font-body text-xs text-parchment-muted italic border-l-2 border-violet-500/30 pl-3">"{offer.message}"</p>
              )}
              <div className="flex flex-wrap gap-4 items-start">
                <div>
                  <p className="font-ui text-[9px] uppercase tracking-[0.2em] text-parchment-muted mb-2">They offer</p>
                  <div className="flex flex-wrap gap-2">
                    {((offer as { offered_cards?: (UserCard & { definition: NonNullable<UserCard['definition']> })[] }).offered_cards ?? []).map(c => (
                      <div key={c.id} className="flex flex-col items-center gap-1">
                        <CardDisplay card={c} size="sm" interactive={false} />
                        <RarityBadge rarity={c.definition?.rarity ?? 'whisper'} size="xs" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center self-center"><ArrowRightLeft className="h-5 w-5 text-parchment-muted/40" /></div>
                <div>
                  <p className="font-ui text-[9px] uppercase tracking-[0.2em] text-parchment-muted mb-2">They request</p>
                  <div className="flex flex-wrap gap-2">
                    {myCards.filter(c => offer.requested_card_ids.includes(c.id)).map(c => (
                      <div key={c.id} className="flex flex-col items-center gap-1">
                        <CardDisplay card={c} size="sm" interactive={false} />
                        <RarityBadge rarity={c.definition?.rarity ?? 'whisper'} size="xs" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => void respond(offer, 'accepted')} className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-900/20 px-4 py-2 font-ui text-[11px] uppercase tracking-[0.2em] text-emerald-400 hover:bg-emerald-900/40 transition-colors">
                  <Check className="h-3.5 w-3.5" /> Accept
                </button>
                <button type="button" onClick={() => void respond(offer, 'declined')} className="flex items-center gap-1.5 rounded-lg border border-crimson/40 bg-crimson/10 px-4 py-2 font-ui text-[11px] uppercase tracking-[0.2em] text-crimson hover:bg-crimson/20 transition-colors">
                  <X className="h-3.5 w-3.5" /> Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Outgoing ─────────────────────────────────────────────────── */}
      {tab === 'outgoing' && (
        <div className="space-y-4">
          {outgoing.length === 0 && <div className="py-20 text-center"><p className="font-body text-parchment-muted">No active outgoing offers.</p></div>}
          {outgoing.map(offer => (
            <div key={offer.id} className="rounded-xl border border-app-border bg-app-surface p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-ui text-xs text-parchment-muted">To <span className="text-parchment">{(offer as { to_user?: { display_name: string | null; username: string | null } }).to_user?.display_name ?? (offer as { to_user?: { username: string | null } }).to_user?.username ?? 'Unknown'}</span></p>
                <span className={`font-ui text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded ${
                  offer.status === 'pending' ? 'text-amber-400 bg-amber-900/20' : 'text-violet-400 bg-violet-900/20'
                }`}>{offer.status}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {((offer as { offered_cards?: (UserCard & { definition: NonNullable<UserCard['definition']> })[] }).offered_cards ?? []).map(c => (
                  <CardDisplay key={c.id} card={c} size="sm" interactive={false} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── New Trade ─────────────────────────────────────────────────── */}
      {tab === 'new' && (
        <div className="space-y-6">
          {/* Target user search */}
          <div>
            <label className="font-ui text-[10px] uppercase tracking-[0.2em] text-parchment-muted block mb-2">
              Trade with (username)
            </label>
            <div className="flex gap-2">
              <input
                value={targetUsername}
                onChange={e => setTargetUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void searchTarget()}
                placeholder="archivist_username"
                className="flex-1 rounded border border-app-border bg-void px-3 py-2 font-ui text-sm text-parchment focus:border-violet-500/40 focus:outline-none placeholder:text-parchment-muted/40"
              />
              <button type="button" onClick={() => void searchTarget()} disabled={searching} className="rounded border border-violet-500/30 bg-violet-900/20 px-4 font-ui text-[11px] uppercase tracking-[0.2em] text-violet-400 hover:bg-violet-900/40 disabled:opacity-50 transition-colors">
                {searching ? '...' : 'Find'}
              </button>
            </div>
          </div>

          {formError && <p className="text-sm text-crimson">{formError}</p>}

          {(myCards.length > 0 || theirCards.length > 0) && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Your cards */}
              <div>
                <p className="font-ui text-[10px] uppercase tracking-[0.2em] text-parchment-muted mb-3">
                  Your cards — select to offer
                </p>
                <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto pr-1">
                  {myCards.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleSelect(c.id, offeredIds, setOfferedIds)}
                      className={`relative rounded-lg transition-all ${offeredIds.includes(c.id) ? 'ring-2 ring-violet-400 ring-offset-1 ring-offset-black' : 'opacity-70 hover:opacity-100'}`}
                    >
                      <CardDisplay card={c} size="sm" interactive={false} />
                      {offeredIds.includes(c.id) && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-violet-900/30">
                          <Check className="h-5 w-5 text-violet-300" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Their cards */}
              <div>
                <p className="font-ui text-[10px] uppercase tracking-[0.2em] text-parchment-muted mb-3">
                  Their cards — select to request
                </p>
                {theirCards.length === 0
                  ? <p className="text-sm text-parchment-muted">Search for an archivist above to see their tradeable manifests.</p>
                  : (
                    <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto pr-1">
                      {theirCards.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleSelect(c.id, requestedIds, setRequestedIds)}
                          className={`relative rounded-lg transition-all ${requestedIds.includes(c.id) ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-black' : 'opacity-70 hover:opacity-100'}`}
                        >
                          <CardDisplay card={c} size="sm" interactive={false} />
                          {requestedIds.includes(c.id) && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-emerald-900/30">
                              <Check className="h-5 w-5 text-emerald-300" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )
                }
              </div>
            </div>
          )}

          {/* Message */}
          {targetUserId && (
            <div>
              <label className="font-ui text-[10px] uppercase tracking-[0.2em] text-parchment-muted block mb-2">
                <MessageSquare className="inline h-3 w-3 mr-1" />Message (optional)
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={2}
                placeholder="The archive suggests a fair exchange..."
                className="w-full rounded border border-app-border bg-void px-3 py-2 font-body text-sm text-parchment resize-none focus:border-violet-500/40 focus:outline-none placeholder:text-parchment-muted/40"
              />
            </div>
          )}

          {targetUserId && (
            <button
              type="button"
              onClick={() => void submitOffer()}
              disabled={offeredIds.length === 0 || requestedIds.length === 0}
              className="w-full rounded-lg border border-violet-500/40 bg-violet-900/20 py-3 font-ui text-[11px] uppercase tracking-[0.2em] text-violet-400 hover:bg-violet-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="inline h-3.5 w-3.5 mr-1.5" />
              Submit Trade Offer ({offeredIds.length} offered · {requestedIds.length} requested)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
