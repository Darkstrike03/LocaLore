import { BookOpen, Globe, ScrollText, Users, Eye } from 'lucide-react'

const PILLARS = [
  {
    icon: BookOpen,
    title: 'A cursed atlas',
    body: 'Every pin and entry is a fragment of a much older map — one that traces the shadows between rivers, mountains, graveyards, and alleyways.',
  },
  {
    icon: Users,
    title: 'Crowdsourced & curated',
    body: 'Witness accounts, regional myths, and AI-collected folklore all converge here. Unverified entries are marked so you can tread carefully.',
  },
  {
    icon: Globe,
    title: 'Global in scope',
    body: "The initial map lingers over Japan's yokai, but the tome is designed to hold creatures from every corner of the world.",
  },
  {
    icon: ScrollText,
    title: 'Future chapters',
    body: 'The archive will grow with automatic folklore ingestion, smarter search, and richer cross-references between creatures, locations, and rituals.',
  },
]

function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 animate-rise">

      {/* Hero */}
      <header className="mb-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-app-surface shadow-gold-glow">
          <Eye className="h-7 w-7 text-gold" />
        </div>
        <p className="section-label mb-2">About this archive</p>
        <h1 className="font-heading text-3xl sm:text-4xl text-gold">
          The LocaLore Project
        </h1>
        <p className="mx-auto mt-3 max-w-2xl font-body text-lg leading-relaxed text-parchment-muted">
          LocaLore is a living bestiary of folklore creatures, yokai, spirits, and monsters stitched together from local memory, oral tradition, and written lore. It is not a game. It is a record.
        </p>
      </header>

      {/* Divider */}
      <div className="rune-divider mb-10">
        <Eye className="h-3 w-3 text-parchment-dim flex-shrink-0" />
      </div>

      {/* Pillars grid */}
      <section aria-label="Project pillars" className="grid gap-4 sm:grid-cols-2">
        {PILLARS.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="group relative overflow-hidden rounded-xl border border-app-border bg-app-surface p-5 shadow-void-deep
                       transition-all duration-300 hover:border-gold/30 hover:shadow-gold-glow"
          >
            {/* Corner accent */}
            <div className="absolute top-0 right-0 h-8 w-8 overflow-hidden">
              <div className="absolute -top-4 -right-4 h-8 w-8 rotate-45 bg-gold/5 group-hover:bg-gold/10 transition-colors" />
            </div>

            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold/20 bg-app-background">
                <Icon className="h-4 w-4 text-gold" />
              </div>
              <h2 className="font-heading text-sm tracking-[0.2em] text-gold uppercase">
                {title}
              </h2>
            </div>
            <p className="font-body text-[16px] leading-[1.75] text-parchment-muted">
              {body}
            </p>
          </div>
        ))}
      </section>

      {/* Bottom note */}
      <div className="rune-divider mt-10 mb-6">
        <Eye className="h-3 w-3 text-parchment-dim flex-shrink-0" />
      </div>
      <p className="text-center font-body text-sm italic text-parchment-dim">
        The archive is open. What you find here, you cannot un-find.
      </p>
    </div>
  )
}

export default AboutPage

