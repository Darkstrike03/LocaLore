import { useState, useEffect, Fragment } from 'react'
import { Eye, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { CardPack, CardRarity, UserCard } from '../types/cards'
import { RARITY_META } from '../types/cards'
import { formatFull, formatTooltip, ANIMA_REWARDS } from '../lib/currency'
import CurrencyBadge from '../components/cards/CurrencyBadge'
import PackOpeningModal from '../components/cards/PackOpeningModal'

// ─── Local pack-open logic ────────────────────────────────────────────────────
function pickRarity(pack: CardPack): CardRarity {
  const roll = Math.random() * 100
  let cum = 0
  const slots: [CardRarity, number][] = [
    ['whisper',       pack.weight_whisper],
    ['remnant',       pack.weight_remnant],
    ['manifestation', pack.weight_manifestation],
    ['awakened',      pack.weight_awakened],
    ['ephemeral',     pack.weight_ephemeral],
    ['void_touched',  pack.weight_void_touched],
  ]
  for (const [r, w] of slots) { cum += w; if (roll < cum) return r }
  return 'whisper'
}

// ─── How-to-earn accordion ────────────────────────────────────────────────────
const EARN_ROWS: [string, number][] = [
  ['React to a creature', ANIMA_REWARDS.react],
  ['File a sighting',     ANIMA_REWARDS.sighting_filed],
  ['Submit a creature',   ANIMA_REWARDS.submit_creature],
  ['Creature gets verified', ANIMA_REWARDS.creature_verified],
  ['3-day login streak',  ANIMA_REWARDS.daily_streak_3],
  ['7-day login streak',  ANIMA_REWARDS.daily_streak_7],
  ['14-day login streak', ANIMA_REWARDS.daily_streak_14],
]

export default function VaultPage() {
  const { user } = useAuth()
  const [balance, setBalance]     = useState<number>(0)
  const [packs, setPacks]         = useState<CardPack[]>([])
  const [loading, setLoading]     = useState(true)
  const [opening, setOpening]     = useState<CardPack | null>(null)
  const [newCards, setNewCards]   = useState<(UserCard & { definition: NonNullable<UserCard['definition']> })[]>([])
  const [packLoading, setPackLoading] = useState(false)
  const [showEarn, setShowEarn]   = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: userData }, { data: packData }] = await Promise.all([
        supabase.from('users').select('anima_balance').eq('id', user?.id ?? '').maybeSingle(),
        supabase.from('card_packs').select('*').eq('is_active', true).order('cost_anima'),
      ])
      setBalance(userData?.anima_balance ?? 0)
      setPacks(packData ?? [])
      setLoading(false)
    }
    if (user) void load()
  }, [user])

  async function openPack(pack: CardPack) {
    if (!user) return
    setError(null)
    if (balance < pack.cost_anima) {
      setError(`Not enough anima. You need ${formatFull(pack.cost_anima)} but have ${formatFull(balance)}.`)
      return
    }

    // Show loading modal immediately so user sees feedback
    setNewCards([])
    setOpening(pack)
    setPackLoading(true)
    const rarities = Array.from({ length: pack.card_count }, () => pickRarity(pack))

    // 2. For each rarity, pick a random card_definition
    const cardResults: (UserCard & { definition: NonNullable<UserCard['definition']> })[] = []
    for (const rarity of rarities) {
      const { data: defs } = await supabase
        .from('card_definitions')
        .select('*, creature:creatures!creature_id(*)')
        .eq('rarity', rarity)
        .limit(50)
      if (!defs || defs.length === 0) continue

      // Filter by region when opening a regional pack
      const eligible = pack.region_filter
        ? (defs.filter(d => (d.creature as any)?.country === pack.region_filter).length > 0
            ? defs.filter(d => (d.creature as any)?.country === pack.region_filter)
            : defs) // fallback: use all defs if no creature matches region yet
        : defs
      const def = eligible[Math.floor(Math.random() * eligible.length)]

      // Mint new copy
      const serial = (def.copies_minted ?? 0) + 1
      const grade = def.is_event_exclusive ? 'mint' : 'near_mint'

      const { data: newCard } = await supabase
        .from('user_cards')
        .insert({
          user_id: user.id, card_def_id: def.id,
          serial_number: serial, acquired_via: 'pack', grade,
        })
        .select('*')
        .single()

      // Increment copies_minted
      await supabase.from('card_definitions')
        .update({ copies_minted: serial })
        .eq('id', def.id)

      if (newCard) cardResults.push({ ...newCard, definition: { ...def } })
    }

    // 3. Guard — if no cards could be minted (empty card_definitions), abort
    if (cardResults.length === 0) {
      setOpening(null)
      setPackLoading(false)
      setError('No cards are available in the archive yet. An archivist must define card entries first.')
      return
    }

    // 4. Deduct anima — only after confirmed cards were minted
    await supabase.rpc('increment_anima', { uid: user.id, amount: -pack.cost_anima })
    const newBalance = balance - pack.cost_anima
    await supabase.from('anima_ledger').insert({
      user_id: user.id, amount: -pack.cost_anima,
      balance_after: newBalance, reason: `Opened: ${pack.name}`,
    })

    setBalance(newBalance)
    setNewCards(cardResults)
    setPackLoading(false)
  }

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <Eye className="h-6 w-6 text-gold animate-flicker" />
    </div>
  )

  if (!user) return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-heading text-xl text-parchment-muted">The Vault is sealed.</p>
      <p className="text-sm text-parchment-muted">Initiates must identify themselves before accessing the archive treasury.</p>
    </div>
  )

  const generalPacks  = packs.filter(p => !p.region_filter)
  const regionalPacks = packs.filter(p => !!p.region_filter)
  const packFlag = (region: string | null): string => {
    const flags: Record<string, string> = {
      Japan: '\uD83C\uDDEF\uD83C\uDDF5', China: '\uD83C\uDDE8\uD83C\uDDF3', Korea: '\uD83C\uDDF0\uD83C\uDDF7', India: '\uD83C\uDDEE\uD83C\uDDF3',
      Thailand: '\uD83C\uDDF9\uD83C\uDDED', Indonesia: '\uD83C\uDDEE\uD83C\uDDE9', Philippines: '\uD83C\uDDF5\uD83C\uDDED', Malaysia: '\uD83C\uDDF2\uD83C\uDDFE',
      Vietnam: '\uD83C\uDDFB\uD83C\uDDF3', UK: '\uD83C\uDDEC\uD83C\uDDE7', Ireland: '\uD83C\uDDEE\uD83C\uDDEA', Germany: '\uD83C\uDDE9\uD83C\uDDEA',
      France: '\uD83C\uDDEB\uD83C\uDDF7', Russia: '\uD83C\uDDF7\uD83C\uDDFA', USA: '\uD83C\uDDFA\uD83C\uDDF8', Mexico: '\uD83C\uDDF2\uD83C\uDDFD',
      Brazil: '\uD83C\uDDE7\uD83C\uDDF7', Egypt: '\uD83C\uDDEA\uD83C\uDDEC', Nigeria: '\uD83C\uDDF3\uD83C\uDDEC',
    }
    return region ? (flags[region] ?? '\uD83C\uDF10') : ''
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-10 text-center">
        <p className="font-ui text-[10px] uppercase tracking-[0.4em] text-parchment-muted mb-2">Archive Treasury</p>
        <h1 className="font-heading text-4xl tracking-[0.15em] text-gold drop-shadow-gold">The Vault</h1>
        <p className="mt-3 font-body text-sm text-parchment-muted max-w-md mx-auto">
          Offerings fuel the archive. Exchange yours for sealed packets of crystallised lore.
        </p>

        {/* Balance */}
        <div className="mt-5 inline-flex flex-col items-center gap-1">
          <p className="font-ui text-[9px] uppercase tracking-[0.35em] text-parchment-muted">Your balance</p>
          <CurrencyBadge anima={balance} size="md" showTooltip />
          <p className="font-ui text-[9px] text-parchment-muted/50 mt-0.5">{formatTooltip(balance)}</p>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 rounded-lg border border-crimson/40 bg-crimson/10 px-4 py-3 text-sm text-crimson">
          {error}
        </div>
      )}

      {/* ── Pack shelf ─────────────────────────────────────────────────── */}
      <div className="grid gap-5 sm:grid-cols-2">
        {[...generalPacks, ...regionalPacks].map((pack, idx) => {
          const canAfford = balance >= pack.cost_anima
          const isFirstRegional = idx === generalPacks.length && regionalPacks.length > 0
          return (
            <Fragment key={pack.id}>
              {/* Section divider before first regional pack */}
              {isFirstRegional && (
                <div className="col-span-full mt-6 mb-2 border-t border-app-border pt-6">
                  <p className="font-ui text-[10px] uppercase tracking-[0.4em] text-parchment-muted mb-1">Regional Collections</p>
                  <h2 className="font-heading text-xl tracking-[0.12em] text-gold">Origin Archives</h2>
                  <p className="font-body text-xs text-parchment-muted mt-1">
                    Draws exclusively from creatures of the specified origin. Complete a region to earn a collector's seal.
                  </p>
                </div>
              )}
              <div
                className={`group relative overflow-hidden rounded-xl border bg-app-surface transition-all duration-300 ${
                  canAfford
                    ? 'border-gold/20 hover:border-gold/50 hover:shadow-gold-glow'
                    : 'border-app-border opacity-60'
                }`}
              >
                {/* Pack art strip */}
                <div className="relative h-28 flex items-center justify-center bg-gradient-to-br from-void to-app-surface overflow-hidden">
                  {pack.region_filter ? (
                    <span className="text-7xl select-none leading-none opacity-90">{packFlag(pack.region_filter)}</span>
                  ) : (
                    <>
                      <span className="text-6xl opacity-10 font-heading text-gold select-none">☽</span>
                      <Eye className={`absolute h-10 w-10 text-gold/30 ${canAfford ? 'group-hover:animate-glow-pulse' : ''}`} />
                    </>
                  )}
                  {/* Card count badge */}
                  <span className="absolute top-2 right-2 font-ui text-[10px] uppercase tracking-[0.2em] text-parchment-muted bg-black/40 rounded px-1.5 py-0.5">
                    {pack.card_count} cards
                  </span>
                  {/* Region label */}
                  {pack.region_filter && (
                    <span className="absolute bottom-2 left-2 font-ui text-[9px] uppercase tracking-[0.15em] text-parchment-muted bg-black/60 rounded px-1.5 py-0.5">
                      {pack.region_filter} only
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-heading text-base tracking-[0.1em] text-parchment">{pack.name}</h3>
                    <CurrencyBadge anima={pack.cost_anima} size="xs" />
                  </div>
                  <p className="font-body text-xs text-parchment-muted mb-4 leading-relaxed">{pack.description}</p>

                  {/* Rarity breakdown */}
                  <div className="mb-4 space-y-1">
                    {(
                      [
                        ['whisper', pack.weight_whisper],
                        ['remnant', pack.weight_remnant],
                        ['manifestation', pack.weight_manifestation],
                        ['awakened', pack.weight_awakened],
                        ['ephemeral', pack.weight_ephemeral],
                        ['void_touched', pack.weight_void_touched],
                      ] as [CardRarity, number][]
                    ).filter(([, w]) => w > 0).map(([r, w]) => (
                      <div key={r} className="flex items-center gap-2">
                        <span className={`font-ui text-[9px] uppercase tracking-[0.15em] w-24 ${RARITY_META[r].color}`}>
                          {RARITY_META[r].label}
                        </span>
                        <div className="flex-1 h-1 rounded-full bg-app-border overflow-hidden">
                          <div className="h-full rounded-full bg-current transition-all" style={{ width: `${w}%`, color: 'currentColor' }} />
                        </div>
                        <span className="font-ui text-[9px] text-parchment-muted w-8 text-right">{w}%</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => void openPack(pack)}
                    disabled={!canAfford}
                    className={`w-full rounded-lg py-2 font-ui text-[11px] uppercase tracking-[0.2em] transition-all ${
                      canAfford
                        ? 'bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 hover:border-gold/50'
                        : 'bg-app-border/20 text-parchment-muted cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? 'Open Pack' : 'Insufficient Anima'}
                  </button>
                </div>
              </div>
            </Fragment>
          )
        })}
      </div>

      {/* ── Earn anima accordion ─────────────────────────────────────────── */}
      <div className="mt-10 rounded-xl border border-app-border bg-app-surface overflow-hidden">
        <button
          type="button"
          onClick={() => setShowEarn(v => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div>
            <span className="font-heading text-sm tracking-[0.12em] text-parchment">How to earn Anima</span>
            <p className="font-ui text-[10px] text-parchment-muted mt-0.5">Offerings are earned through archive contributions.</p>
          </div>
          {showEarn ? <ChevronUp className="h-4 w-4 text-parchment-muted" /> : <ChevronDown className="h-4 w-4 text-parchment-muted" />}
        </button>
        {showEarn && (
          <div className="border-t border-app-border">
            {EARN_ROWS.map(([label, amt]) => (
              <div key={label} className="flex items-center justify-between px-5 py-2.5 border-b border-app-border/50 last:border-0">
                <span className="font-ui text-xs text-parchment-muted">{label}</span>
                <CurrencyBadge anima={amt} size="xs" sign="gain" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pack opening modal ───────────────────────────────────────────── */}
      {opening && (
        <PackOpeningModal
          cards={newCards}
          packName={opening.name}
          loading={packLoading}
          onClose={() => { setOpening(null); setNewCards([]); setPackLoading(false) }}
        />
      )}

      {/* ── Empty packs (DB not set up yet) ──────────────────────────── */}
      {!loading && packs.length === 0 && (
        <div className="mt-12 text-center space-y-2">
          <RefreshCw className="mx-auto h-6 w-6 text-parchment-muted animate-spin" />
          <p className="font-body text-sm text-parchment-muted">The treasury is being prepared. Return soon.</p>
        </div>
      )}
    </div>
  )
}
