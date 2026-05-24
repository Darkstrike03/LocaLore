import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Eye } from 'lucide-react'
import { useSEO } from '../hooks/useSEO'

// ─── Event definitions (synced with SeasonalBanner) ─────────────────────────────
interface ArchiveEvent {
  key: string
  startMonth: number
  startDay: number
  endMonth: number
  endDay: number
  emoji: string
  title: string
  body: string
  accent: string
}

const EVENTS: ArchiveEvent[] = [
  {
    key: 'halloween',
    startMonth: 10, startDay: 25,
    endMonth: 10,  endDay: 31,
    emoji: '🎃',
    title: 'The Veil Thins',
    body: 'Samhain approaches. The archive reports elevated sighting activity.',
    accent: 'border-orange-500/40 bg-orange-950/30 text-orange-300',
  },
  {
    key: 'day_of_dead',
    startMonth: 11, startDay: 1,
    endMonth: 11,  endDay: 2,
    emoji: '💀',
    title: 'Día de los Muertos',
    body: 'The dead are temporarily reclassified as guests.',
    accent: 'border-violet-500/40 bg-violet-950/30 text-violet-300',
  },
  {
    key: 'obon',
    startMonth: 8, startDay: 10,
    endMonth: 8,  endDay: 16,
    emoji: '🏮',
    title: 'Obon — The Return',
    body: 'Spirits of the departed are making their way back.',
    accent: 'border-amber-400/40 bg-amber-950/30 text-amber-300',
  },
  {
    key: 'bhoot_chaturdashi',
    startMonth: 10, startDay: 20,
    endMonth: 10,  endDay: 23,
    emoji: '🪔',
    title: 'Bhoot Chaturdashi',
    body: 'Fourteen ancestors walk the threshold.',
    accent: 'border-yellow-400/40 bg-yellow-950/30 text-yellow-200',
  },
  {
    key: 'walpurgis',
    startMonth: 4, startDay: 28,
    endMonth: 4,  endDay: 30,
    emoji: '🔥',
    title: 'Walpurgis Night',
    body: 'Witches gather. Demons are briefly reclassified as community members.',
    accent: 'border-red-500/40 bg-red-950/30 text-red-300',
  },
  {
    key: 'ghost_festival',
    startMonth: 8, startDay: 17,
    endMonth: 8,  endDay: 25,
    emoji: '👻',
    title: 'Hungry Ghost Festival',
    body: 'The gates are open. Several new sighting reports this week.',
    accent: 'border-cyan-500/40 bg-cyan-950/30 text-cyan-300',
  },
  {
    key: 'beltane',
    startMonth: 4, startDay: 30,
    endMonth: 5,  endDay: 1,
    emoji: '🌸',
    title: 'Beltane',
    body: 'The boundary between worlds grows porous.',
    accent: 'border-pink-400/40 bg-pink-950/30 text-pink-200',
  },
  {
    key: 'winter_solstice',
    startMonth: 12, startDay: 20,
    endMonth: 12,  endDay: 23,
    emoji: '🌑',
    title: 'The Longest Night',
    body: 'The archive goes dark. Old things wake.',
    accent: 'border-indigo-500/40 bg-indigo-950/30 text-indigo-300',
  },
  {
    key: 'setsubun',
    startMonth: 2, startDay: 2,
    endMonth: 2,  endDay: 3,
    emoji: '👹',
    title: 'Setsubun',
    body: 'Oni are being pelted with beans across Japan.',
    accent: 'border-red-400/40 bg-red-950/30 text-red-300',
  },
  {
    key: 'toro_nagashi',
    startMonth: 8, startDay: 15,
    endMonth: 8,  endDay: 16,
    emoji: '🕯️',
    title: 'Toro Nagashi',
    body: 'Paper lanterns float downriver to guide the dead home.',
    accent: 'border-amber-300/40 bg-amber-950/30 text-amber-200',
  },
  {
    key: 'naki_sumo',
    startMonth: 4, startDay: 28,
    endMonth: 4,  endDay: 29,
    emoji: '😢',
    title: 'Naki Sumo',
    body: 'Babies are made to cry to ward off evil spirits.',
    accent: 'border-blue-400/40 bg-blue-950/30 text-blue-200',
  },
  {
    key: 'qingming',
    startMonth: 4, startDay: 4,
    endMonth: 4,  endDay: 6,
    emoji: '🌿',
    title: 'Qingming — Tomb Sweeping',
    body: 'The living tend to the dead.',
    accent: 'border-green-500/40 bg-green-950/30 text-green-300',
  },
  {
    key: 'double_ninth',
    startMonth: 10, startDay: 10,
    endMonth: 10,  endDay: 11,
    emoji: '🏔️',
    title: 'Chongyang Festival',
    body: 'Climb high to avoid evil.',
    accent: 'border-teal-400/40 bg-teal-950/30 text-teal-200',
  },
  {
    key: 'phi_ta_khon',
    startMonth: 6, startDay: 20,
    endMonth: 6,  endDay: 22,
    emoji: '🎭',
    title: 'Phi Ta Khon',
    body: 'In Dan Sai, Thailand, the spirits join the living in celebration.',
    accent: 'border-lime-400/40 bg-lime-950/30 text-lime-200',
  },
  {
    key: 'pchum_ben',
    startMonth: 9, startDay: 20,
    endMonth: 10,  endDay: 5,
    emoji: '🙏',
    title: 'Pchum Ben',
    body: 'Cambodia opens its gates for fifteen days.',
    accent: 'border-orange-400/40 bg-orange-950/30 text-orange-200',
  },
  {
    key: 'festival_of_nine_emperor_gods',
    startMonth: 10, startDay: 2,
    endMonth: 10,  endDay: 11,
    emoji: '⭐',
    title: 'Nine Emperor Gods Festival',
    body: 'Taoist spirits descend for nine days across Malaysia and Singapore.',
    accent: 'border-yellow-300/40 bg-yellow-950/30 text-yellow-200',
  },
  {
    key: 'pitru_paksha',
    startMonth: 9, startDay: 14,
    endMonth: 10,  endDay: 2,
    emoji: '🌊',
    title: 'Pitru Paksha',
    body: 'Sixteen days of ancestral rites. The dead are listening.',
    accent: 'border-stone-400/40 bg-stone-900/30 text-stone-300',
  },
  {
    key: 'kati_bihu',
    startMonth: 10, startDay: 17,
    endMonth: 10,  endDay: 18,
    emoji: '🪔',
    title: 'Kati Bihu',
    body: 'In Assam, lamps are lit for the dead and for crops.',
    accent: 'border-yellow-500/40 bg-yellow-950/30 text-yellow-300',
  },
  {
    key: 'gai_jatra',
    startMonth: 8, startDay: 20,
    endMonth: 8,  endDay: 21,
    emoji: '🐄',
    title: 'Gai Jatra',
    body: 'In Nepal, the recently dead are guided to the afterlife by sacred cows.',
    accent: 'border-emerald-400/40 bg-emerald-950/30 text-emerald-200',
  },
  {
    key: 'samhain',
    startMonth: 10, startDay: 31,
    endMonth: 11,  endDay: 1,
    emoji: '🌫️',
    title: 'Samhain',
    body: 'The original night of the dead. The archive was founded on this date.',
    accent: 'border-slate-400/40 bg-slate-900/40 text-slate-200',
  },
  {
    key: 'nos_galan_gaeaf',
    startMonth: 10, startDay: 31,
    endMonth: 11,  endDay: 1,
    emoji: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
    title: 'Nos Galan Gaeaf',
    body: 'The Welsh winter spirit night.',
    accent: 'border-neutral-400/40 bg-neutral-900/40 text-neutral-200',
  },
  {
    key: 'feast_of_all_souls',
    startMonth: 11, startDay: 2,
    endMonth: 11,  endDay: 3,
    emoji: '⛪',
    title: 'All Souls Night',
    body: 'Candles are placed in windows to guide the dead.',
    accent: 'border-white/20 bg-zinc-900/40 text-zinc-200',
  },
  {
    key: 'perchten',
    startMonth: 1, startDay: 5,
    endMonth: 1,  endDay: 6,
    emoji: '🐐',
    title: 'Perchtenlauf',
    body: 'In Alpine Europe, masked figures chase away winter demons.',
    accent: 'border-zinc-500/40 bg-zinc-900/40 text-zinc-300',
  },
  {
    key: 'krampusnacht',
    startMonth: 12, startDay: 5,
    endMonth: 12,  endDay: 6,
    emoji: '🐾',
    title: 'Krampusnacht',
    body: 'Krampus walks tonight.',
    accent: 'border-red-700/40 bg-red-950/40 text-red-200',
  },
  {
    key: 'wild_hunt',
    startMonth: 12, startDay: 21,
    endMonth: 1,  endDay: 6,
    emoji: '🐺',
    title: 'The Wild Hunt',
    body: 'The spectral riders cross the sky from solstice to Epiphany.',
    accent: 'border-gray-500/40 bg-gray-900/40 text-gray-300',
  },
  {
    key: 'old_new_year_russia',
    startMonth: 1, startDay: 13,
    endMonth: 1,  endDay: 14,
    emoji: '❄️',
    title: 'Svyatki',
    body: 'The Russian holy tide between Christmas and Epiphany.',
    accent: 'border-blue-300/40 bg-blue-950/30 text-blue-200',
  },
  {
    key: 'hanal_pixan',
    startMonth: 10, startDay: 31,
    endMonth: 11,  endDay: 2,
    emoji: '🌽',
    title: 'Hanal Pixán',
    body: 'The Mayan feast for souls in Yucatán.',
    accent: 'border-amber-500/40 bg-amber-950/30 text-amber-200',
  },
  {
    key: 'fieles_difuntos',
    startMonth: 11, startDay: 1,
    endMonth: 11,  endDay: 2,
    emoji: '🕯️',
    title: 'Fieles Difuntos',
    body: 'In Ecuador and Peru, families sleep beside graves.',
    accent: 'border-purple-400/40 bg-purple-950/30 text-purple-200',
  },
  {
    key: 'fetu_afahye',
    startMonth: 9, startDay: 1,
    endMonth: 9,  endDay: 7,
    emoji: '🥁',
    title: 'Fetu Afahye',
    body: 'The Fante people of Ghana honour their ancestors and purify the land.',
    accent: 'border-yellow-600/40 bg-yellow-950/30 text-yellow-300',
  },
  {
    key: 'famadihana',
    startMonth: 7, startDay: 1,
    endMonth: 9,  endDay: 30,
    emoji: '🪦',
    title: 'Famadihana',
    body: 'In Madagascar, the dead are exhumed, rewrapped, and danced with.',
    accent: 'border-rose-400/40 bg-rose-950/30 text-rose-200',
  },
  {
    key: 'nowruz_spirits',
    startMonth: 3, startDay: 18,
    endMonth: 3,  endDay: 20,
    emoji: '🌙',
    title: 'Charshanbe Suri',
    body: 'The eve before Persian New Year. Spirits of the dead visit homes.',
    accent: 'border-orange-300/40 bg-orange-950/30 text-orange-200',
  },
  {
    key: 'nale_ba',
    startMonth: 4, startDay: 1,
    endMonth: 4,  endDay: 1,
    emoji: '👻',
    title: 'Nale Ba',
    body: 'A witch knocks on doors at night, mimicking loved ones. Write “Come Tomorrow” to survive.',
    accent: 'border-orange-300/40 bg-red-950/30 text-orange-200',
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

  if (start > end) return cur >= start || cur <= end
  return cur >= start && cur <= end
}

function isEventOnDay(event: ArchiveEvent, _year: number, month: number, day: number): boolean {
  const dateValue = month * 100 + day
  const start = event.startMonth * 100 + event.startDay
  const end = event.endMonth * 100 + event.endDay

  if (start > end) {
    return dateValue >= start || dateValue <= end
  }
  return dateValue >= start && dateValue <= end
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── Component ───────────────────────────────────────────────────────────────
function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<ArchiveEvent | null>(null)

  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  useSEO({
    title: 'Seasonal Calendar',
    description: 'A calendar of folklore events, festivals, and supernatural occurrences throughout the year.',
    url: '/calendar',
  })

  // Get days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()

  // Get events for current month
  const monthEvents = useMemo(() => {
    return EVENTS.filter(event => {
      const start = event.startMonth * 100 + event.startDay
      const end = event.endMonth * 100 + event.endDay
      const monthStart = (currentMonth + 1) * 100 + 1
      const monthEnd = (currentMonth + 1) * 100 + daysInMonth

      // Check if event overlaps with current month
      if (start > end) {
        // Year-wrapping event
        return monthStart >= start || monthEnd <= end
      }
      return monthEnd >= start && monthStart <= end
    })
  }, [currentMonth, currentYear, daysInMonth])

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 animate-rise">
      {/* Header */}
      <header className="mb-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-app-surface shadow-gold-glow">
          <CalendarIcon className="h-7 w-7 text-gold" />
        </div>
        <p className="section-label mb-2">Archive Calendar</p>
        <h1 className="font-heading text-3xl sm:text-4xl text-gold">
          Seasonal Events
        </h1>
        <p className="mx-auto mt-3 max-w-2xl font-body text-lg leading-relaxed text-parchment-muted">
          Track supernatural occurrences throughout the year. The veil thins on specific dates.
        </p>
      </header>

      {/* Divider */}
      <div className="rune-divider mb-8">
        <Eye className="h-3 w-3 text-parchment-dim flex-shrink-0" />
      </div>

      {/* Calendar Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-4 py-2 text-sm font-ui uppercase tracking-[0.2em] text-parchment-muted transition hover:border-gold/40 hover:text-gold"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="text-center">
          <h2 className="font-heading text-2xl text-gold">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>
        </div>

        <button
          type="button"
          onClick={goToNextMonth}
          className="flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-4 py-2 text-sm font-ui uppercase tracking-[0.2em] text-parchment-muted transition hover:border-gold/40 hover:text-gold"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-6 text-center">
        <button
          type="button"
          onClick={goToToday}
          className="text-sm font-ui uppercase tracking-[0.2em] text-gold/70 hover:text-gold transition-colors"
        >
          Return to Today
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border border-app-border bg-app-surface overflow-hidden shadow-void-deep">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-app-border bg-app-background">
          {DAY_NAMES.map(day => (
            <div
              key={day}
              className="py-3 text-center font-heading text-xs uppercase tracking-[0.3em] text-parchment-dim"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {/* Empty cells for days before first of month */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] border-r border-b border-app-border/50 bg-app-background/30" />
          ))}

          {/* Days of month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dayEvents = monthEvents.filter(event =>
              isEventOnDay(event, currentYear, currentMonth + 1, day)
            )
            const isToday = new Date().getDate() === day &&
                           new Date().getMonth() === currentMonth &&
                           new Date().getFullYear() === currentYear

            return (
              <div
                key={day}
                className={`min-h-[100px] border-r border-b border-app-border/50 p-2 transition-colors ${
                  isToday ? 'bg-gold/5' : 'bg-app-surface/50 hover:bg-app-surface'
                }`}
              >
                <div className={`font-ui text-sm ${
                  isToday ? 'text-gold font-bold' : 'text-parchment-muted'
                }`}>
                  {day}
                </div>
                <div className="mt-1 space-y-1">
                  {dayEvents.map(event => (
                    <button
                    key={event.key}
                    type="button"
                    onClick={() => setSelectedEvent(event)}
                    className={`w-full rounded px-1.5 py-1 text-left text-[10px] font-ui uppercase tracking-[0.15em] transition-all hover:scale-105 ${
                      isActive(event) ? event.accent : 'border border-app-border/30 bg-app-background text-parchment-muted/70'
                    }`}
                  >
                    <span className="mr-1">{event.emoji}</span>
                    <span className="hidden sm:inline">{event.title}</span>
                  </button>

                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Events list for current month */}
      <div className="mt-8">
        <h3 className="mb-4 font-heading text-xl text-gold">
          Events This Month
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {monthEvents.map(event => (
            <button
              key={event.key}
              type="button"
              onClick={() => setSelectedEvent(event)}
              className={`group relative overflow-hidden rounded-xl border p-5 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-gold-glow ${
                isActive(event)
                  ? event.accent + ' shadow-void-deep'
                  : 'border-app-border bg-app-surface hover:border-gold/30'
              }`}
            >
              <div className="mb-3 flex items-center gap-2.5">
                <span className="text-2xl">{event.emoji}</span>
                <h4 className="font-heading text-sm tracking-[0.2em] uppercase">
                  {event.title}
                </h4>
              </div>
              <p className="font-body text-sm leading-relaxed opacity-80">
                {event.body}
              </p>
              <div className="mt-3 font-ui text-xs uppercase tracking-[0.2em] opacity-60">
                {event.startMonth === event.endMonth
                  ? `${event.startMonth}/${event.startDay} – ${event.endMonth}/${event.endDay}`
                  : `${event.startMonth}/${event.startDay} – ${event.endMonth}/${event.endDay}`}
                {isActive(event) && (
                  <span className="ml-2 text-gold">· Active Now</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Event detail modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className={`max-w-lg w-full rounded-xl border p-6 shadow-void-deep animate-rise ${
              isActive(selectedEvent)
                ? selectedEvent.accent
                : 'border-app-border bg-app-surface'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedEvent.emoji}</span>
                <div>
                  <h3 className="font-heading text-xl tracking-[0.2em] uppercase text-gold">
                    {selectedEvent.title}
                  </h3>
                  {isActive(selectedEvent) && (
                    <span className="mt-1 inline-block rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-ui uppercase tracking-[0.2em] text-gold">
                      Active Now
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-app-border text-parchment-muted transition hover:border-gold/40 hover:text-gold"
              >
                ×
              </button>
            </div>
            <p className="font-body text-base leading-relaxed text-parchment-muted mb-4">
              {selectedEvent.body}
            </p>
            <div className="font-ui text-xs uppercase tracking-[0.2em] text-parchment-dim">
              {selectedEvent.startMonth === selectedEvent.endMonth
                ? `${selectedEvent.startMonth}/${selectedEvent.startDay} – ${selectedEvent.endMonth}/${selectedEvent.endDay}`
                : `${selectedEvent.startMonth}/${selectedEvent.startDay} – ${selectedEvent.endMonth}/${selectedEvent.endDay}`}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalendarPage
