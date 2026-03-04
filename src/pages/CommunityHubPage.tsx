import { useState, useEffect, useRef, forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Users, Tag, Gavel, ArrowRightLeft, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { CardRarity } from '../types/cards'
import { RARITY_META } from '../types/cards'
import { formatPrice } from '../lib/currency'
import { useSEO } from '../hooks/useSEO'

interface ActivityItem {
  activity_type: 'sale' | 'trade'
  occurred_at: string
  price_anima: number | null
  rarity: CardRarity | null
  creature_name: string | null
  creature_slug: string | null
}

interface TopCollector {
  user_id: string
  username: string | null
  display_name: string | null
  card_count: number
}

function useVisible(ref: React.RefObject<Element | null>) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.3 })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [ref])
  return visible
}

// ── Pure-CSS mysterious hooded figure ──────────────────────────────────────
function HoodedFigure({ className = '' }: { className?: string }) {
  return (
    <>
      <style>{`
        @keyframes hf-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-14px); }
        }
        @keyframes hf-eye-pulse {
          0%, 100% { opacity: 1;   box-shadow: 0 0 8px 3px rgba(251,191,36,0.8); }
          50%       { opacity: 0.5; box-shadow: 0 0 3px 1px rgba(251,191,36,0.3); }
        }
        @keyframes hf-mist {
          0%, 100% { opacity: 0.18; transform: scaleX(1); }
          50%       { opacity: 0.28; transform: scaleX(1.06); }
        }
        .hf-eye { animation: hf-eye-pulse 3s ease-in-out infinite; }
        .hf-eye:nth-child(2) { animation-delay: 0.4s; }
        .hf-mist { animation: hf-mist 5s ease-in-out infinite; }
      `}</style>

      <div
        className={`pointer-events-none select-none flex flex-col items-center ${className}`}
        style={{ animation: 'hf-float 7s ease-in-out infinite' }}
      >
        {/* Hood */}
        <div style={{
          width: 90,
          height: 80,
          borderRadius: '50% 50% 12px 12px',
          background: 'linear-gradient(160deg, #07070d 20%, #13131f 100%)',
          border: '1px solid rgba(200,168,75,0.12)',
          boxShadow: '0 0 40px rgba(0,0,0,0.9), inset 0 -10px 24px rgba(200,168,75,0.04)',
          position: 'relative',
          zIndex: 2,
        }}>
          {/* Deep shadow face */}
          <div style={{
            position: 'absolute', inset: '20% 15% 0',
            borderRadius: '50% 50% 40% 40%',
            background: 'radial-gradient(ellipse at 50% 40%, #0a0a10 60%, transparent 100%)',
          }} />
          {/* Eyes */}
          <div style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 18 }}>
            <div className="hf-eye" style={{ width: 7, height: 4, borderRadius: '50%', background: 'rgba(251,191,36,0.95)' }} />
            <div className="hf-eye" style={{ width: 7, height: 4, borderRadius: '50%', background: 'rgba(251,191,36,0.95)' }} />
          </div>
        </div>

        {/* Neck */}
        <div style={{
          width: 28,
          height: 12,
          background: '#09090e',
          marginTop: -3,
          zIndex: 1,
        }} />

        {/* Shoulders mantle */}
        <div style={{
          width: 130,
          height: 22,
          background: 'linear-gradient(180deg, #0e0e18 0%, #0a0a12 100%)',
          borderRadius: '50% 50% 0 0',
          marginTop: -4,
          zIndex: 1,
          border: '1px solid rgba(200,168,75,0.08)',
          borderBottom: 'none',
        }} />

        {/* Cloak body */}
        <div style={{
          width: 160,
          height: 130,
          background: 'linear-gradient(180deg, #0c0c16 0%, #06060c 100%)',
          clipPath: 'polygon(22% 0%, 78% 0%, 100% 100%, 0% 100%)',
          marginTop: -2,
          boxShadow: '0 20px 60px rgba(0,0,0,0.95)',
          zIndex: 0,
        }} />

        {/* Hem / base fade */}
        <div style={{
          width: 160,
          height: 20,
          background: 'linear-gradient(180deg, #06060c 0%, transparent 100%)',
          marginTop: -2,
        }} />

        {/* Ground mist */}
        <div className="hf-mist" style={{
          width: 220,
          height: 24,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at 50% 50%, rgba(200,168,75,0.25) 0%, transparent 70%)',
          marginTop: -10,
          filter: 'blur(8px)',
        }} />
      </div>
    </>
  )
}

const Scene = forwardRef<HTMLElement, { children: React.ReactNode; className?: string }>(
  function Scene({ children, className = '' }, ref) {
    return (
      <section
        ref={ref}
        className={`relative flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden ${className}`}
        style={{ scrollSnapAlign: 'start' }}
      >
        {children}
      </section>
    )
  }
)

export default function CommunityHubPage() {
  useSEO({
    title: 'Community Hub',
    description: 'The LocaLore Community Hub — see live card market activity, top collectors, and community highlights from the folklore trading community.',
    url: '/hub',
  })
  const [activity, setActivity]     = useState<ActivityItem[]>([])
  const [collectors, setCollectors] = useState<TopCollector[]>([])
  const [stats, setStats]           = useState({ cards: 0, traders: 0, volume: 0 })

  const s2Ref = useRef<HTMLElement>(null)
  const s3Ref = useRef<HTMLElement>(null)
  const s4Ref = useRef<HTMLElement>(null)
  const s2Vis = useVisible(s2Ref as React.RefObject<Element>)
  const s3Vis = useVisible(s3Ref as React.RefObject<Element>)
  const s4Vis = useVisible(s4Ref as React.RefObject<Element>)

  useEffect(() => {
    async function load() {
      // Step 1: get all user_card rows (just user_id) + market sales
      const [{ data: uc }, { data: ml }] = await Promise.all([
        supabase.from('user_cards').select('user_id'),
        supabase.from('market_listings').select('price_anima').eq('status', 'sold'),
      ])

      // Step 2: tally counts per user_id
      const countMap: Record<string, number> = {}
      for (const row of (uc ?? []) as { user_id: string }[]) {
        if (!row.user_id) continue
        countMap[row.user_id] = (countMap[row.user_id] ?? 0) + 1
      }

      // Step 3: fetch public.users profiles for the top user_ids
      const topIds = Object.entries(countMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id]) => id)

      let profileMap: Record<string, { username: string | null; display_name: string | null }> = {}
      if (topIds.length > 0) {
        const { data: profiles } = await supabase
          .from('users')
          .select('id, username, display_name')
          .in('id', topIds)
        for (const p of (profiles ?? []) as { id: string; username: string | null; display_name: string | null }[]) {
          profileMap[p.id] = { username: p.username, display_name: p.display_name }
        }
      }

      const top: TopCollector[] = topIds.map(id => ({
        user_id: id,
        username: profileMap[id]?.username ?? null,
        display_name: profileMap[id]?.display_name ?? null,
        card_count: countMap[id],
      }))

      setCollectors(top)

      // Activity feed
      const { data: act } = await supabase.from('community_activity').select('*').limit(12)
      setActivity((act ?? []) as ActivityItem[])

      const totalVolume = (ml ?? []).reduce((s, r) => s + (r.price_anima ?? 0), 0)
      setStats({ cards: uc?.length ?? 0, traders: top.length, volume: totalVolume })
    }
    void load()
  }, [])

  const LINKS = [
    { to: '/vault',    icon: Eye,            label: 'The Vault',      sub: 'Open packs, earn manifests',   color: 'text-gold',       border: 'border-gold/30',       hover: 'hover:border-gold/60' },
    { to: '/market',   icon: Tag,            label: 'Marketplace',    sub: 'Buy & sell at fixed price',    color: 'text-emerald-400', border: 'border-emerald-500/30', hover: 'hover:border-emerald-400/60' },
    { to: '/auction',  icon: Gavel,          label: 'Auction House',  sub: 'Bid on rare manifests',        color: 'text-amber-400',  border: 'border-amber-500/30',  hover: 'hover:border-amber-400/60' },
    { to: '/trade',    icon: ArrowRightLeft, label: 'Trade Board',    sub: 'Peer-to-peer card exchange',   color: 'text-violet-400', border: 'border-violet-500/30', hover: 'hover:border-violet-400/60' },
    { to: '/collection', icon: Sparkles,    label: 'My Collection',  sub: 'View & manage your manifests', color: 'text-[#C8D8E4]',  border: 'border-[#B8C6D0]/30',  hover: 'hover:border-[#B8C6D0]/60' },
  ]

  return (
    <div
      className="h-[calc(100dvh-theme(spacing.14))] overflow-y-auto"
      style={{ scrollSnapType: 'y mandatory', scrollBehavior: 'smooth' }}
    >

      {/* ── Scene 1 — The Gathering ─────────────────────────────────────── */}
      <Scene className="bg-gradient-to-b from-void via-app-background to-app-surface">
        {/* Atmospheric grid */}
        <div className="pointer-events-none absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(rgba(200,168,75,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,168,75,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* Hooded figure — left side */}
        <HoodedFigure className="absolute bottom-0 left-[8%] opacity-60" />
        {/* Hooded figure — right side, slightly smaller / delayed */}
        <HoodedFigure className="absolute bottom-0 right-[8%] opacity-40" />

        <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
          <span className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-gold/30 animate-glow-pulse" style={{ animationDuration: '2s' }} />
            <span className="absolute inset-2 rounded-full border border-gold/20 animate-glow-pulse" style={{ animationDuration: '3s', animationDelay: '1s' }} />
            <Users className="relative h-7 w-7 text-gold" />
          </span>
          <div>
            <p className="font-ui text-[10px] uppercase tracking-[0.5em] text-parchment-muted mb-2">LocaLore</p>
            <h1 className="font-heading text-5xl sm:text-6xl tracking-[0.1em] text-gold drop-shadow-gold">The Gathering</h1>
            <p className="mt-4 font-body text-lg text-parchment-muted max-w-lg mx-auto leading-relaxed">
              Collectors, traders, and archivists converge. The manifests change hands. The archive remembers.
            </p>
          </div>

          {/* Live stats */}
          <div className="flex gap-8 mt-2">
            {[
              { label: 'Manifests', value: stats.cards },
              { label: 'Collectors', value: stats.traders },
              { label: 'Volume', value: stats.volume, currency: true },
            ].map(({ label, value, currency }) => (
              <div key={label} className="text-center">
                <div className="font-heading text-2xl text-gold">
                  {currency ? formatPrice(value) : value.toLocaleString()}
                </div>
                <div className="font-ui text-[9px] uppercase tracking-[0.3em] text-parchment-muted mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          <p className="font-ui text-[9px] uppercase tracking-[0.3em] text-parchment-muted/40 animate-bounce mt-2">
            Scroll to descend
          </p>
        </div>
      </Scene>

      {/* ── Scene 2 — Activity Feed ─────────────────────────────────────── */}
      <Scene ref={s2Ref} className="bg-app-surface">
        <div className={`relative z-10 w-full max-w-2xl px-6 transition-all duration-700 ${s2Vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-8">
            <p className="font-ui text-[10px] uppercase tracking-[0.4em] text-parchment-muted mb-2">Live</p>
            <h2 className="font-heading text-3xl tracking-[0.12em] text-gold">Recent Activity</h2>
          </div>

          <div className="space-y-2 max-h-[50dvh] overflow-y-auto pr-1">
            {activity.length === 0 && (
              <p className="text-center font-body text-parchment-muted py-8">The archive is quiet. Be the first to trade.</p>
            )}
            {activity.map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-app-border bg-app-surface/60 px-4 py-2.5">
                {item.activity_type === 'sale'
                  ? <Tag className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  : <ArrowRightLeft className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  {item.activity_type === 'sale' && item.creature_name ? (
                    <p className="font-ui text-xs text-parchment truncate">
                      <span className="text-parchment-muted">Manifest sold —</span>{' '}
                      <Link to={`/creatures/${item.creature_slug}`} className="text-parchment hover:text-gold">{item.creature_name}</Link>
                      {item.rarity && <span className={`ml-1.5 ${RARITY_META[item.rarity].color}`}>{RARITY_META[item.rarity].glyph}</span>}
                    </p>
                  ) : (
                    <p className="font-ui text-xs text-parchment-muted">A trade was completed</p>
                  )}
                </div>
                {item.price_anima && (
                  <span className="font-ui text-[10px] text-gold shrink-0">{formatPrice(item.price_anima)}</span>
                )}
                <span className="font-ui text-[9px] text-parchment-muted/50 shrink-0">
                  {new Date(item.occurred_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Scene>

      {/* ── Scene 3 — Top Collectors ────────────────────────────────────── */}
      <Scene ref={s3Ref} className="bg-gradient-to-b from-app-surface to-app-background">
        <div className={`relative z-10 w-full max-w-3xl px-6 transition-all duration-700 ${s3Vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-8">
            <p className="font-ui text-[10px] uppercase tracking-[0.4em] text-parchment-muted mb-2">Archive</p>
            <h2 className="font-heading text-3xl tracking-[0.12em] text-gold">Top Collectors</h2>
          </div>

          {collectors.length === 0 ? (
            <p className="text-center font-body text-parchment-muted py-8">No collectors on record yet. Be the first.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gold/20">
                  <th className="w-10 pb-2 font-ui text-[9px] uppercase tracking-[0.3em] text-parchment-muted/50 text-center">#</th>
                  <th className="pb-2 font-ui text-[9px] uppercase tracking-[0.3em] text-parchment-muted/50 text-left pl-3">Archivist</th>
                  <th className="pb-2 font-ui text-[9px] uppercase tracking-[0.3em] text-parchment-muted/50 text-right pr-2">Manifests</th>
                </tr>
              </thead>
              <tbody>
                {collectors.slice(0, 8).map((c, i) => (
                  <tr
                    key={c.user_id}
                    className="group border-b border-app-border/60 hover:bg-gold/5 transition-colors"
                  >
                    <td className="py-2.5 text-center">
                      {i < 3 ? (
                        <span className={`font-heading text-sm ${
                          i === 0 ? 'text-amber-400' : i === 1 ? 'text-[#C8D8E4]' : 'text-amber-700'
                        }`}>{i + 1}</span>
                      ) : (
                        <span className="font-heading text-sm text-parchment-muted/30">{i + 1}</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-3">
                      <Link
                        to={`/collection/${c.username ?? c.user_id}`}
                        className="flex items-center gap-2 min-w-0"
                      >
                        {/* Avatar glyph */}
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-app-border bg-void text-[10px] text-parchment-muted/60 group-hover:border-gold/30 transition-colors">
                          {(c.display_name ?? c.username ?? 'A')[0].toUpperCase()}
                        </span>
                        <span className="font-heading text-sm text-parchment truncate group-hover:text-gold transition-colors">
                          {c.display_name ?? c.username ?? 'Archivist'}
                        </span>
                      </Link>
                    </td>
                    <td className="py-2.5 pr-2 text-right">
                      <span className="font-ui text-xs text-parchment-muted tabular-nums">
                        {c.card_count.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Scene>

      {/* ── Scene 4 — Navigation Hub ─────────────────────────────────────── */}
      <Scene ref={s4Ref} className="bg-app-background">
        <div className={`relative z-10 w-full max-w-4xl px-6 transition-all duration-700 ${s4Vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-8">
            <p className="font-ui text-[10px] uppercase tracking-[0.4em] text-parchment-muted mb-2">Navigate</p>
            <h2 className="font-heading text-3xl tracking-[0.12em] text-gold">Where will you go?</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LINKS.map(({ to, icon: Icon, label, sub, color, border, hover }) => (
              <Link
                key={to}
                to={to}
                className={`group flex flex-col gap-2 rounded-xl border ${border} ${hover} bg-app-surface p-5 transition-all duration-300`}
              >
                <Icon className={`h-5 w-5 ${color}`} />
                <div>
                  <p className={`font-heading text-base tracking-[0.08em] ${color}`}>{label}</p>
                  <p className="font-ui text-[10px] text-parchment-muted mt-0.5">{sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Scene>
    </div>
  )
}
