import { useState, useEffect } from 'react'
import { X, Eye } from 'lucide-react'

// ─── Event definitions ────────────────────────────────────────────────────────
// Each event has a fixed month/day window (month is 1-based).
// key is used for localStorage so dismissal resets each calendar year.
interface ArchiveEvent {
  key: string
  startMonth: number
  startDay: number
  endMonth: number
  endDay: number
  emoji: string
  title: string
  body: string
  accent: string   // Tailwind border/bg colour tokens
}

const EVENTS: ArchiveEvent[] = [
  // ── Already existing ──────────────────────────────────────────────────────
  {
    key: 'halloween',
    startMonth: 10, startDay: 25,
    endMonth: 10,  endDay: 31,
    emoji: '🎃',
    title: 'The Veil Thins',
    body: 'Samhain approaches. The archive reports elevated sighting activity. Several entries have updated themselves.',
    accent: 'border-orange-500/40 bg-orange-950/30 text-orange-300',
  },
  {
    key: 'day_of_dead',
    startMonth: 11, startDay: 1,
    endMonth: 11,  endDay: 2,
    emoji: '💀',
    title: 'Día de los Muertos',
    body: 'The dead are temporarily reclassified as guests. The archive suspends its verified requirement for undead entries.',
    accent: 'border-violet-500/40 bg-violet-950/30 text-violet-300',
  },
  {
    key: 'obon',
    startMonth: 8, startDay: 10,
    endMonth: 8,  endDay: 16,
    emoji: '🏮',
    title: 'Obon — The Return',
    body: 'Spirits of the departed are making their way back. Several yokai entries have been flagged as temporarily active.',
    accent: 'border-amber-400/40 bg-amber-950/30 text-amber-300',
  },
  {
    key: 'bhoot_chaturdashi',
    startMonth: 10, startDay: 20,
    endMonth: 10,  endDay: 23,
    emoji: '🪔',
    title: 'Bhoot Chaturdashi',
    body: 'The night before Diwali. Fourteen ancestors walk the threshold. The archive recommends keeping fourteen lights lit.',
    accent: 'border-yellow-400/40 bg-yellow-950/30 text-yellow-200',
  },
  {
    key: 'walpurgis',
    startMonth: 4, startDay: 28,
    endMonth: 4,  endDay: 30,
    emoji: '🔥',
    title: 'Walpurgis Night',
    body: 'Witches gather. Demons are briefly reclassified as community members. Several entries have requested anonymity.',
    accent: 'border-red-500/40 bg-red-950/30 text-red-300',
  },
  {
    key: 'ghost_festival',
    startMonth: 8, startDay: 17,
    endMonth: 8,  endDay: 25,
    emoji: '👻',
    title: 'Hungry Ghost Festival',
    body: 'The gates are open. Several new sighting reports this week — a few submitted by the same entity.',
    accent: 'border-cyan-500/40 bg-cyan-950/30 text-cyan-300',
  },
  {
    key: 'beltane',
    startMonth: 4, startDay: 30,
    endMonth: 5,  endDay: 1,
    emoji: '🌸',
    title: 'Beltane',
    body: 'The boundary between worlds grows porous. Faerie-adjacent entries are temporarily starred. Approach with caution.',
    accent: 'border-pink-400/40 bg-pink-950/30 text-pink-200',
  },
  {
    key: 'winter_solstice',
    startMonth: 12, startDay: 20,
    endMonth: 12,  endDay: 23,
    emoji: '🌑',
    title: 'The Longest Night',
    body: 'The archive goes dark. Old things wake. Some entries have been updating their own danger ratings since sundown.',
    accent: 'border-indigo-500/40 bg-indigo-950/30 text-indigo-300',
  },

  // ── Japan ─────────────────────────────────────────────────────────────────
  {
    key: 'setsubun',
    startMonth: 2, startDay: 2,
    endMonth: 2,  endDay: 3,
    emoji: '👹',
    title: 'Setsubun',
    body: 'Oni are being pelted with beans across Japan. The archive notes several demon entries have temporarily hidden their coordinates.',
    accent: 'border-red-400/40 bg-red-950/30 text-red-300',
  },
  {
    key: 'toro_nagashi',
    startMonth: 8, startDay: 15,
    endMonth: 8,  endDay: 16,
    emoji: '🕯️',
    title: 'Toro Nagashi',
    body: 'Paper lanterns float downriver to guide the dead home. The archive has detected unusual movement near water creature entries.',
    accent: 'border-amber-300/40 bg-amber-950/30 text-amber-200',
  },
  {
    key: 'naki_sumo',
    startMonth: 4, startDay: 28,
    endMonth: 4,  endDay: 29,
    emoji: '😢',
    title: 'Naki Sumo',
    body: 'Babies are made to cry to ward off evil spirits. The archive confirms: it is working. Several oni have filed complaints.',
    accent: 'border-blue-400/40 bg-blue-950/30 text-blue-200',
  },

  // ── China & Southeast Asia ────────────────────────────────────────────────
  {
    key: 'qingming',
    startMonth: 4, startDay: 4,
    endMonth: 4,  endDay: 6,
    emoji: '🌿',
    title: 'Qingming — Tomb Sweeping',
    body: 'The living tend to the dead. The archive notes that jiangshi entries are unusually still today. Best not to disturb them.',
    accent: 'border-green-500/40 bg-green-950/30 text-green-300',
  },
  {
    key: 'double_ninth',
    startMonth: 10, startDay: 10,
    endMonth: 10,  endDay: 11,
    emoji: '🏔️',
    title: 'Chongyang Festival',
    body: 'Climb high to avoid evil. The archive recommends avoiding valleys and riverbanks until sunset. Water creatures have been active.',
    accent: 'border-teal-400/40 bg-teal-950/30 text-teal-200',
  },
  {
    key: 'phi_ta_khon',
    startMonth: 6, startDay: 20,
    endMonth: 6,  endDay: 22,
    emoji: '🎭',
    title: 'Phi Ta Khon',
    body: 'In Dan Sai, Thailand, the spirits join the living in celebration. The archive cannot currently distinguish entries from attendees.',
    accent: 'border-lime-400/40 bg-lime-950/30 text-lime-200',
  },
  {
    key: 'pchum_ben',
    startMonth: 9, startDay: 20,
    endMonth: 10,  endDay: 5,
    emoji: '🙏',
    title: 'Pchum Ben',
    body: 'Cambodia opens its gates for fifteen days. Hungry spirits wander if not fed. The archive advises leaving offerings near exits.',
    accent: 'border-orange-400/40 bg-orange-950/30 text-orange-200',
  },
  {
    key: 'festival_of_nine_emperor_gods',
    startMonth: 10, startDay: 2,
    endMonth: 10,  endDay: 11,
    emoji: '⭐',
    title: 'Nine Emperor Gods Festival',
    body: 'Taoist spirits descend for nine days across Malaysia and Singapore. The archive has temporarily elevated spirit entries in the region.',
    accent: 'border-yellow-300/40 bg-yellow-950/30 text-yellow-200',
  },

  // ── India & South Asia ────────────────────────────────────────────────────
  {
    key: 'pitru_paksha',
    startMonth: 9, startDay: 14,
    endMonth: 10,  endDay: 2,
    emoji: '🌊',
    title: 'Pitru Paksha',
    body: 'Sixteen days of ancestral rites. The dead are listening. The archive recommends performing tarpan near any body of water.',
    accent: 'border-stone-400/40 bg-stone-900/30 text-stone-300',
  },
  {
    key: 'kati_bihu',
    startMonth: 10, startDay: 17,
    endMonth: 10,  endDay: 18,
    emoji: '🪔',
    title: 'Kati Bihu',
    body: 'In Assam, lamps are lit for the dead and for crops. The archive notes the border between the living world and the other is thin tonight.',
    accent: 'border-yellow-500/40 bg-yellow-950/30 text-yellow-300',
  },
  {
    key: 'gai_jatra',
    startMonth: 8, startDay: 20,
    endMonth: 8,  endDay: 21,
    emoji: '🐄',
    title: 'Gai Jatra',
    body: 'In Nepal, the recently dead are guided to the afterlife by sacred cows. Several archive entries in the region have gone quiet.',
    accent: 'border-emerald-400/40 bg-emerald-950/30 text-emerald-200',
  },

  // ── Europe & Celtic ───────────────────────────────────────────────────────
  {
    key: 'samhain',
    startMonth: 10, startDay: 31,
    endMonth: 11,  endDay: 1,
    emoji: '🌫️',
    title: 'Samhain',
    body: 'The original night of the dead. The archive was founded on this date. All entries are considered active until dawn.',
    accent: 'border-slate-400/40 bg-slate-900/40 text-slate-200',
  },
  {
    key: 'nos_galan_gaeaf',
    startMonth: 10, startDay: 31,
    endMonth: 11,  endDay: 1,
    emoji: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
    title: 'Nos Galan Gaeaf',
    body: 'The Welsh winter spirit night. Yr Hwch Ddu Gwta, the tailless black sow, is abroad. Do not be last to leave the bonfire.',
    accent: 'border-neutral-400/40 bg-neutral-900/40 text-neutral-200',
  },
  {
    key: 'feast_of_all_souls',
    startMonth: 11, startDay: 2,
    endMonth: 11,  endDay: 3,
    emoji: '⛪',
    title: 'All Souls Night',
    body: 'Candles are placed in windows to guide the dead. The archive recommends not extinguishing any flame you did not light yourself.',
    accent: 'border-white/20 bg-zinc-900/40 text-zinc-200',
  },
  {
    key: 'perchten',
    startMonth: 1, startDay: 5,
    endMonth: 1,  endDay: 6,
    emoji: '🐐',
    title: 'Perchtenlauf',
    body: 'In Alpine Europe, masked figures chase away winter demons. The archive notes several krampus-adjacent entries have gone offline.',
    accent: 'border-zinc-500/40 bg-zinc-900/40 text-zinc-300',
  },
  {
    key: 'krampusnacht',
    startMonth: 12, startDay: 5,
    endMonth: 12,  endDay: 6,
    emoji: '🐾',
    title: 'Krampusnacht',
    body: 'Krampus walks tonight. The archive has temporarily suspended the danger rating cap. Several demon entries have marked themselves unavailable.',
    accent: 'border-red-700/40 bg-red-950/40 text-red-200',
  },
  {
    key: 'wild_hunt',
    startMonth: 12, startDay: 21,
    endMonth: 1,  endDay: 6,
    emoji: '🐺',
    title: 'The Wild Hunt',
    body: 'The spectral riders cross the sky from solstice to Epiphany. Do not look up. The archive advises against submitting any new entries tonight.',
    accent: 'border-gray-500/40 bg-gray-900/40 text-gray-300',
  },
  {
    key: 'old_new_year_russia',
    startMonth: 1, startDay: 13,
    endMonth: 1,  endDay: 14,
    emoji: '❄️',
    title: 'Svyatki',
    body: 'The Russian holy tide between Christmas and Epiphany. Spirits roam freely. The archive has detected unusual activity in Slavic entries.',
    accent: 'border-blue-300/40 bg-blue-950/30 text-blue-200',
  },

  // ── Americas ──────────────────────────────────────────────────────────────
  {
    key: 'hanal_pixan',
    startMonth: 10, startDay: 31,
    endMonth: 11,  endDay: 2,
    emoji: '🌽',
    title: 'Hanal Pixán',
    body: 'The Mayan feast for souls in Yucatán. The archive notes several Mesoamerican entries have temporarily updated their status to present.',
    accent: 'border-amber-500/40 bg-amber-950/30 text-amber-200',
  },
  {
    key: 'fieles_difuntos',
    startMonth: 11, startDay: 1,
    endMonth: 11,  endDay: 2,
    emoji: '🕯️',
    title: 'Fieles Difuntos',
    body: 'In Ecuador and Peru, families sleep beside graves. The archive notes Andean spirit entries have been unusually responsive to queries.',
    accent: 'border-purple-400/40 bg-purple-950/30 text-purple-200',
  },

  // ── Africa & Diaspora ─────────────────────────────────────────────────────
  {
    key: 'fetu_afahye',
    startMonth: 9, startDay: 1,
    endMonth: 9,  endDay: 7,
    emoji: '🥁',
    title: 'Fetu Afahye',
    body: 'The Fante people of Ghana honour their ancestors and purify the land. The archive has elevated all West African spirit entries this week.',
    accent: 'border-yellow-600/40 bg-yellow-950/30 text-yellow-300',
  },
  {
    key: 'famadihana',
    startMonth: 7, startDay: 1,
    endMonth: 9,  endDay: 30,
    emoji: '🪦',
    title: 'Famadihana',
    body: 'In Madagascar, the dead are exhumed, rewrapped, and danced with. The archive has no protocol for this. Entries are being monitored.',
    accent: 'border-rose-400/40 bg-rose-950/30 text-rose-200',
  },

  // ── Middle East ───────────────────────────────────────────────────────────
  {
    key: 'nowruz_spirits',
    startMonth: 3, startDay: 18,
    endMonth: 3,  endDay: 20,
    emoji: '🌙',
    title: 'Charshanbe Suri',
    body: 'The eve before Persian New Year. Spirits of the dead visit homes. The archive recommends jumping over fire to confuse anything following you.',
    accent: 'border-orange-300/40 bg-orange-950/30 text-orange-200',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isActive(e: ArchiveEvent): boolean {
  const now = new Date()
  const m = now.getMonth() + 1
  const d = now.getDate()
  const cur = m * 100 + d
  const start = e.startMonth * 100 + e.startDay
  const end = e.endMonth * 100 + e.endDay

  // Handle year-wrapping ranges (e.g. Dec 21 → Jan 6)
  if (start > end) return cur >= start || cur <= end
  return cur >= start && cur <= end
}

function dismissKey(key: string) {
  return `localore_banner_dismissed_${key}_${new Date().getFullYear()}`
}

/** Days until an event's next start date (0 = starts today, negative = already active/past) */
function daysUntil(e: ArchiveEvent): number {
  const now = new Date()
  const year = now.getFullYear()
  const candidate = new Date(year, e.startMonth - 1, e.startDay)
  // If that date has already passed this year, check next year's occurrence
  if (candidate.getTime() < now.setHours(0, 0, 0, 0)) {
    candidate.setFullYear(year + 1)
  }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((candidate.getTime() - today.getTime()) / 86_400_000)
}

function upcomingDismissKey(key: string) {
  const now = new Date()
  return `localore_upcoming_dismissed_${key}_${now.getFullYear()}_${now.getMonth()}`
}

const UPCOMING_WINDOW_DAYS = 7

// ─── Component ────────────────────────────────────────────────────────────────
export default function SeasonalBanner() {
  const [event, setEvent]               = useState<ArchiveEvent | null>(null)
  const [visible, setVisible]           = useState(false)
  const [upcoming, setUpcoming]         = useState<ArchiveEvent | null>(null)
  const [upcomingDays, setUpcomingDays] = useState(0)
  const [upcomingVisible, setUpcomingVisible] = useState(false)

  useEffect(() => {
    // Active event
    const active = EVENTS.find(isActive)
    if (active && !localStorage.getItem(dismissKey(active.key))) {
      setEvent(active)
      const t = setTimeout(() => setVisible(true), 600)
      return () => clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    // Upcoming event — nearest non-active event within UPCOMING_WINDOW_DAYS
    const candidates = EVENTS
      .filter(e => !isActive(e))
      .map(e => ({ event: e, days: daysUntil(e) }))
      .filter(({ days }) => days >= 0 && days <= UPCOMING_WINDOW_DAYS)
      .sort((a, b) => a.days - b.days)

    const next = candidates[0]
    if (!next) return
    if (localStorage.getItem(upcomingDismissKey(next.event.key))) return

    setUpcoming(next.event)
    setUpcomingDays(next.days)
    const t = setTimeout(() => setUpcomingVisible(true), 900)
    return () => clearTimeout(t)
  }, [])

  function dismiss() {
    setVisible(false)
    if (event) localStorage.setItem(dismissKey(event.key), '1')
    setTimeout(() => setEvent(null), 400)
  }

  function dismissUpcoming() {
    setUpcomingVisible(false)
    if (upcoming) localStorage.setItem(upcomingDismissKey(upcoming.key), '1')
    setTimeout(() => setUpcoming(null), 400)
  }

  if (!event && !upcoming) return null

  return (
    <div role="region" aria-label="Event notifications">
      {/* ── Active event banner ───────────────────────────────────────────── */}
      {event && (
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out
            ${visible ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}
          role="banner"
          aria-label={`Seasonal event: ${event.title}`}
        >
          <div className={`relative border-b ${event.accent} backdrop-blur-sm`}>
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 sm:px-6">
              <span className="text-lg leading-none shrink-0" aria-hidden="true">{event.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-heading text-[11px] uppercase tracking-[0.25em] shrink-0">
                    {event.title}
                  </span>
                  <span className="font-body text-[12px] opacity-80 leading-snug line-clamp-1">
                    {event.body}
                  </span>
                </div>
              </div>
              <Eye className="h-3 w-3 opacity-40 shrink-0 animate-flicker hidden sm:block" />
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss banner"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-50 hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upcoming event banner ─────────────────────────────────────────── */}
      {upcoming && (
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out
            ${upcomingVisible ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}
          role="banner"
          aria-label={`Upcoming event: ${upcoming.title}`}
        >
          <div className="relative border-b border-gold/20 bg-void/40 text-parchment-muted backdrop-blur-sm">
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-1.5 sm:px-6">
              {/* Hourglass-style countdown indicator */}
              <span className="text-base leading-none shrink-0 opacity-60" aria-hidden="true">
                {upcoming.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-heading text-[10px] uppercase tracking-[0.2em] text-gold/50 shrink-0">
                    {upcomingDays === 0 ? 'Begins today' : `In ${upcomingDays} day${upcomingDays === 1 ? '' : 's'}`}
                  </span>
                  <span className="font-heading text-[11px] uppercase tracking-[0.15em] opacity-70 shrink-0">
                    · {upcoming.title}
                  </span>
                  <span className="font-body text-[11px] opacity-40 leading-snug line-clamp-1 hidden sm:block">
                    {upcoming.body}
                  </span>
                </div>
              </div>
              <Eye className="h-2.5 w-2.5 opacity-20 shrink-0 hidden sm:block" />
              <button
                type="button"
                onClick={dismissUpcoming}
                aria-label="Dismiss upcoming event notification"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-30 hover:opacity-70 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
