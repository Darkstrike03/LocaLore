import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookMarked, Eye, MapPin, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { Creature } from '../types/creature'

// Ã¢â€â‚¬Ã¢â€â‚¬ Constants Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const TYPE_GLYPH: Record<string, string> = {
  spirit: '☽', demon: '⛧', trickster: '⚘', water_creature: '≋',
  shapeshifter: '◈', undead: '✝', other: '✦',
}
const INDEX_PER_PAGE = 8

// Ã¢â€â‚¬Ã¢â€â‚¬ Page model Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
type BookPage =
  | { type: 'index'; creatures: Creature[]; part: number; total: number }
  | { type: 'creature'; creature: Creature; pageNum: number }

function buildPages(creatures: Creature[]): BookPage[] {
  const pages: BookPage[] = []
  const parts = Math.max(1, Math.ceil(creatures.length / INDEX_PER_PAGE))
  for (let p = 0; p < parts; p++) {
    pages.push({
      type: 'index',
      creatures: creatures.slice(p * INDEX_PER_PAGE, (p + 1) * INDEX_PER_PAGE),
      part: p + 1,
      total: parts,
    })
  }
  creatures.forEach((c, i) => pages.push({ type: 'creature', creature: c, pageNum: i + 1 }))
  return pages
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Index page content Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function IndexContent({
  page, onSelect,
}: {
  page: Extract<BookPage, { type: 'index' }>
  onSelect: (pageIdx: number) => void
}) {
  // Offset of first creature in this slice
  const offset = (page.part - 1) * INDEX_PER_PAGE
  const idxPages = page.total
  // Creature pages start after all index pages
  const creaturePageOffset = idxPages

  return (
    <div className="flex flex-col h-full select-none">
      {/* Header */}
      <div className="text-center mb-3 shrink-0">
        <p className="font-ui text-[8px] uppercase tracking-[0.5em] text-gold/35">
          {idxPages > 1 ? `Contents · ${page.part} of ${page.total}` : 'Table of Contents'}
        </p>
        <div className="mt-1.5 flex items-center justify-center gap-2">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-gold/20" />
          <span className="font-heading text-[9px] text-gold/20">✦</span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-gold/20" />
        </div>
      </div>

      {/* Entry list */}
      <div className="flex-1 flex flex-col justify-start">
        {page.creatures.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Eye className="h-5 w-5 text-parchment-dim/30" />
            <p className="font-body text-[11px] italic text-parchment/30">No entries yet.</p>
            <Link to="/library" className="btn-summon text-[10px] mt-1">
              <MapPin className="h-3 w-3" /> Browse Library
            </Link>
          </div>
        ) : (
          page.creatures.map((c, i) => {
            const globalIdx = offset + i
            const targetPageIdx = creaturePageOffset + globalIdx
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(targetPageIdx)}
                className="w-full flex items-center gap-2 py-[7px] border-b text-left group transition-colors hover:bg-gold/[0.04]"
                style={{ borderColor: 'rgba(200,168,75,0.07)' }}
              >
                {/* Number */}
                <span className="font-ui text-[9px] text-gold/25 tabular-nums w-5 text-right shrink-0 leading-none">
                  {String(globalIdx + 1).padStart(2, '0')}.
                </span>
                {/* Name + location */}
                <span className="flex-1 min-w-0">
                  <span className="font-heading text-[13px] leading-tight text-parchment/80 group-hover:text-gold/90 transition-colors block truncate">
                    {c.name}
                  </span>
                  <span className="font-ui text-[9px] text-parchment-dim/40 block truncate leading-tight mt-0.5">
                    {[c.region, c.country].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {/* Glyph */}
                <span className="font-heading text-[11px] text-gold/15 shrink-0 leading-none">{TYPE_GLYPH[c.creature_type] ?? '✦'}</span>
                {/* Page ref */}
                <span className="font-ui text-[9px] text-parchment-dim/25 tabular-nums w-5 text-right shrink-0 leading-none">
                  {globalIdx + 1}
                </span>
              </button>
            )
          })
        )}
      </div>

      {/* Page label */}
      <div className="shrink-0 mt-3 text-center">
        <span className="font-ui text-[7px] uppercase tracking-[0.45em] text-parchment-dim/20">
          {idxPages > 1 ? `Index ${page.part}` : 'Index'}
        </span>
      </div>
    </div>
  )
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Creature page content Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function CreatureContent({ page }: { page: Extract<BookPage, { type: 'creature' }> }) {
  const c = page.creature
  const glyph = TYPE_GLYPH[c.creature_type] ?? '✦'

  return (
    <div className="flex flex-col h-full">
      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Illustration area (top ~42%) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div
        className="shrink-0 relative rounded-t-sm overflow-hidden"
        style={{ height: '42%' }}
      >
        {c.image_url ? (
          <>
            <img
              src={c.image_url}
              alt={c.name}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: 'sepia(0.3) brightness(0.55) contrast(1.1)' }}
            />
          </>
        ) : (
          /* Illustrated placeholder - atmospheric glyph */
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{
              background: 'radial-gradient(ellipse at 50% 60%, rgba(200,168,75,0.06) 0%, transparent 65%), #0a0705',
            }}
          >
            <span
              className="font-heading select-none text-gold/10 leading-none"
              style={{ fontSize: 'clamp(48px, 10vw, 80px)' }}
            >{glyph}</span>
            <span
              className="font-heading uppercase tracking-[0.3em] text-gold/6 mt-2 select-none"
              style={{ fontSize: 'clamp(7px, 1.2vw, 10px)' }}
            >{c.name}</span>
          </div>
        )}
        {/* Fade to page background */}
        <div
          className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #0d0a07)' }}
        />
        {/* Top left: verified mark */}
        {c.verified && (
          <div className="absolute top-2 left-2 font-ui text-[7px] uppercase tracking-widest text-gold/40 bg-black/50 rounded px-1.5 py-0.5 backdrop-blur-sm">
            Verified
          </div>
        )}
        {/* Top right: danger pips */}
        {c.danger_rating != null && c.danger_rating > 0 && (
          <div className="absolute top-2 right-2 flex gap-0.5 bg-black/50 rounded px-1.5 py-1 backdrop-blur-sm">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`h-1 w-1 rounded-full ${i < c.danger_rating! ? 'bg-crimson-DEFAULT/80' : 'bg-parchment-dim/20'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Text area (bottom ~58%) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div className="flex flex-col flex-1 min-h-0 px-0 pt-2 pb-0">
        {/* Entry rule */}
        <div className="flex items-center gap-1.5 mb-2 shrink-0">
          <span className="h-px flex-1 bg-gold/10" />
          <span className="font-ui text-[7px] uppercase tracking-[0.4em] text-gold/25">Entry</span>
          <span className="h-px flex-1 bg-gold/10" />
        </div>

        {/* Name */}
        <h2
          className="font-heading text-gold leading-tight shrink-0 truncate"
          style={{ fontSize: 'clamp(16px, 3vw, 22px)' }}
        >{c.name}</h2>

        {/* Alternate names */}
        {c.alternate_names?.length > 0 && (
          <p className="font-body text-[9px] italic text-parchment/35 mt-0.5 shrink-0 truncate">
            {c.alternate_names.join(' · ')}
          </p>
        )}

        {/* Region + type */}
        <p className="font-ui text-[9px] uppercase tracking-[0.18em] text-parchment/40 mt-1 shrink-0 truncate">
          {[c.region, c.country].filter(Boolean).join(' · ')}
          <span className="text-gold/20"> · </span>
          {c.creature_type.replace('_', ' ')}
        </p>

        {/* Thin rule */}
        <div className="my-2 h-px shrink-0" style={{ background: 'rgba(200,168,75,0.08)' }} />

        {/* Scrollable lore body */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(200,168,75,0.15) transparent' }}>
          {c.description && (
            <p
              className="font-body italic text-parchment/60 leading-relaxed mb-3"
              style={{ fontSize: 'clamp(10px, 1.6vw, 12px)' }}
            >
              &ldquo;{c.description}&rdquo;
            </p>
          )}
          {c.origin_story && (
            <div className="mb-3">
              <p className="font-ui text-[8px] uppercase tracking-widest text-gold/25 mb-1">Origin</p>
              <p className="font-body text-parchment/50 leading-relaxed" style={{ fontSize: 'clamp(10px, 1.6vw, 12px)' }}>{c.origin_story}</p>
            </div>
          )}
          {c.abilities && (
            <div className="mb-2">
              <p className="font-ui text-[8px] uppercase tracking-widest text-gold/25 mb-1">Abilities</p>
              <p className="font-body text-parchment/45 leading-relaxed" style={{ fontSize: 'clamp(9px, 1.4vw, 11px)' }}>{c.abilities}</p>
            </div>
          )}
          {c.survival_tips && (
            <div>
              <p className="font-ui text-[8px] uppercase tracking-widest text-gold/25 mb-1">Survival</p>
              <p className="font-body text-parchment/45 leading-relaxed" style={{ fontSize: 'clamp(9px, 1.4vw, 11px)' }}>{c.survival_tips}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="shrink-0 flex items-center justify-between mt-2 pt-2 border-t"
          style={{ borderColor: 'rgba(200,168,75,0.08)' }}
        >
          <Link
            to={`/creatures/${c.slug}`}
            className="flex items-center gap-1 font-ui text-[9px] uppercase tracking-wider text-gold/35 hover:text-gold/60 transition-colors"
          >
            Full entry <ExternalLink className="h-2.5 w-2.5" />
          </Link>
          <span className="font-ui text-[8px] text-parchment-dim/20 tracking-widest tabular-nums">
            {page.pageNum}
          </span>
        </div>
      </div>
    </div>
  )
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Single physical page wrapper (fixed aspect ratio) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function PageWrapper({
  children,
  side,
}: {
  children: React.ReactNode
  side: 'left' | 'right' | 'single'
}) {
  return (
    <div
      className="relative flex-1 min-w-0"
      style={{
        background: 'linear-gradient(165deg, #130e09 0%, #0c0804 45%, #130e09 100%)',
        boxShadow: side === 'left'
          ? 'inset -10px 0 24px rgba(0,0,0,0.45)'
          : side === 'right'
            ? 'inset 10px 0 24px rgba(0,0,0,0.45)'
            : 'none',
      }}
    >
      {/* Subtle paper texture lines */}
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          className="pointer-events-none absolute inset-x-0"
          style={{
            top: `${(i + 1) * (100 / 19)}%`,
            height: '1px',
            background: 'rgba(200,168,75,0.018)',
          }}
        />
      ))}
      {/* Content */}
      <div className="absolute inset-0 p-5 sm:p-6 flex flex-col">
        {children}
      </div>
      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,0.22) 100%)' }}
      />
    </div>
  )
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Main component Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// ── Mobile single-page book ──────────────────────────────────────────────
function MobileSinglePageBook({
  pages,
  currentPage,
  loading,
  onGoTo,
}: {
  pages: BookPage[]
  currentPage: number
  loading: boolean
  onGoTo: (p: number) => void
}) {
  const totalPages = pages.length
  const canPrev = currentPage > 0
  const canNext = currentPage < totalPages - 1

  function renderContent(page: BookPage) {
    if (page.type === 'index') {
      return <IndexContent page={page} onSelect={(idx) => onGoTo(idx)} />
    }
    return <CreatureContent page={page} />
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Book wrapper */}
      <div
        className="relative rounded-sm"
        style={{
          background: 'linear-gradient(135deg, #2a1a08 0%, #1a0e04 50%, #2a1a08 100%)',
          boxShadow: '0 20px 56px rgba(0,0,0,0.9), 0 0 0 1px #3d2510, inset 0 1px 0 rgba(200,168,75,0.07)',
          padding: '16px 12px 16px 22px',
        }}
      >
        {/* Spine */}
        <div
          className="absolute top-0 bottom-0 left-0 w-5 rounded-l-sm"
          style={{
            background: 'linear-gradient(to right, #060402, #1a0e04)',
            borderRight: '1px solid #2d1e0a',
            boxShadow: 'inset -5px 0 14px rgba(0,0,0,0.65)',
          }}
        />
        {/* Cover corners */}
        {['top-2 left-7', 'top-2 right-2', 'bottom-2 left-7', 'bottom-2 right-2'].map(pos => (
          <span key={pos} className={`pointer-events-none absolute ${pos} font-heading text-[9px] text-gold/18 select-none`}>✦</span>
        ))}
        {/* Inset border */}
        <div className="absolute inset-x-[16px] inset-y-[8px] rounded-sm border border-gold/[0.055] pointer-events-none" />

        {loading ? (
          <div
            className="rounded-sm overflow-hidden p-5 space-y-3"
            style={{ aspectRatio: '3/4', background: 'linear-gradient(160deg, #110c07, #0c0804)' }}
          >
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="animate-pulse flex gap-2 border-b border-[#1f1509]/30 pb-2.5">
                <div className="h-2 w-4 rounded bg-parchment/8 shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-2.5 w-3/4 rounded bg-parchment/8" />
                  <div className="h-1.5 w-1/2 rounded bg-parchment/5" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex rounded-sm overflow-hidden" style={{ aspectRatio: '3/4' }}>
            <PageWrapper side="single">
              {renderContent(pages[currentPage])}
            </PageWrapper>
          </div>
        )}
      </div>

      {/* Navigation */}
      {!loading && (
        <div className="mt-4 flex items-center justify-between gap-3 px-1">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => onGoTo(currentPage - 1)}
            className="flex items-center gap-1.5 rounded-lg border border-app-border bg-app-surface px-3 py-2 font-ui text-[11px] text-parchment-muted hover:border-gold/30 hover:text-parchment transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>

          <div className="flex-1 flex flex-col items-center gap-1.5">
            <p className="font-ui text-[9px] text-parchment-dim/40 tabular-nums">
              p.{currentPage + 1}
              <span className="text-parchment-dim/20"> / {totalPages}</span>
            </p>
            <div className="flex items-center gap-1 flex-wrap justify-center max-w-[160px]">
              {pages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onGoTo(i)}
                  className={`rounded-full transition-all duration-200 ${
                    i === currentPage
                      ? 'bg-gold/60 w-3.5 h-1.5'
                      : 'bg-parchment-dim/18 w-1.5 h-1.5 hover:bg-parchment-dim/35'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={!canNext}
            onClick={() => onGoTo(currentPage + 1)}
            className="flex items-center gap-1.5 rounded-lg border border-app-border bg-app-surface px-3 py-2 font-ui text-[11px] text-parchment-muted hover:border-gold/30 hover:text-parchment transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

function GrimoirePage() {
  const { user, openAuthModal } = useAuth()
  const [creatures, setCreatures]   = useState<Creature[]>([])
  const [loading, setLoading]       = useState(true)
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let mounted = true
    ;(async () => {
      const { data } = await supabase
        .from('creature_bookmarks')
        .select('creature_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (!mounted || !data?.length) { setLoading(false); return }
      const ids = data.map(r => r.creature_id)
      const { data: cdata } = await supabase.from('creatures').select('*').in('id', ids)
      if (!mounted) return
      const map = new Map((cdata as Creature[]).map(c => [c.id, c]))
      setCreatures(ids.map(id => map.get(id)!).filter(Boolean))
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [user])

  useEffect(() => { setCurrentPage(0) }, [creatures.length])

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <div className="relative w-24 h-32 mx-auto mb-2">
          <div className="absolute inset-0 rounded-r-md bg-[#1a1007] border border-[#3a2510]"
            style={{ boxShadow: '4px 4px 16px rgba(0,0,0,0.7)' }} />
          <div className="absolute top-1 bottom-1 right-0 w-[calc(100%-10px)] rounded-r-md bg-[#150f06] border border-[#2d1e0a]" />
          <div className="absolute top-0 bottom-0 left-0 right-3 rounded-r-md flex flex-col items-center justify-center gap-2 px-2"
            style={{ background: 'linear-gradient(135deg,#2a1a08,#1a0e04)', border: '1px solid #5a3a18' }}>
            <div className="w-8 h-8 rounded-full border border-gold/30 flex items-center justify-center bg-black/30">
              <BookMarked className="h-4 w-4 text-gold/60" />
            </div>
            <span className="font-heading text-[7px] tracking-[0.3em] text-gold/40 uppercase">Grimoire</span>
          </div>
          <div className="absolute top-0 bottom-0 left-0 w-2 rounded-l-sm"
            style={{ background: 'linear-gradient(to right, #0d0804, #2a1a08)', borderLeft: '1px solid #3a2510' }} />
        </div>
        <h1 className="font-heading text-2xl text-gold">Your Grimoire</h1>
        <p className="font-body text-sm text-parchment-muted max-w-sm">
          A living book of creatures you've marked for study. Sign in to begin.
        </p>
        <button type="button" onClick={openAuthModal} className="btn-summon mt-2">
          Open your Grimoire
        </button>
      </div>
    )
  }

  const pages = buildPages(creatures)
  const totalPages = pages.length

  // Desktop: show even+odd pair (spread); always snap to even
  const leftIdx  = currentPage % 2 === 0 ? currentPage : currentPage - 1
  const rightIdx = leftIdx + 1
  const hasRight = rightIdx < totalPages

  const canPrev = leftIdx > 0
  const canNext = leftIdx + 2 < totalPages || (!hasRight && currentPage < totalPages - 1)

  function goTo(p: number) {
    setCurrentPage(Math.max(0, Math.min(totalPages - 1, p)))
  }
  function prevSpread() { goTo(Math.max(0, leftIdx - 2)) }
  function nextSpread() { goTo(Math.min(totalPages - 1, leftIdx + 2)) }

  function renderContent(page: BookPage) {
    if (page.type === 'index') {
      return (
        <IndexContent
          page={page}
          onSelect={(idx) => goTo(idx)}
        />
      )
    }
    return <CreatureContent page={page} />
  }

  return (
    <div
      className="min-h-screen px-3 py-8 sm:px-6 sm:py-12 flex flex-col items-center"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a0e04 0%, #06040a 80%)' }}
    >
      {/* Title */}
      <div className="mb-6 text-center shrink-0">
        <p className="font-ui text-[9px] uppercase tracking-[0.5em] text-gold/40 mb-1">Personal Archive</p>
        <h1 className="font-heading text-3xl sm:text-4xl text-gold tracking-wide">Grimoire</h1>
        <div className="mt-2 flex items-center justify-center gap-3">
          <span className="h-px w-14 bg-gradient-to-r from-transparent to-gold/30" />
          <span className="font-heading text-xs text-gold/30">✦</span>
          <span className="h-px w-14 bg-gradient-to-l from-transparent to-gold/30" />
        </div>
      </div>

      {/* Mobile: single-page book */}
      <div className="md:hidden w-full flex justify-center">
        <MobileSinglePageBook
          pages={pages}
          currentPage={currentPage}
          loading={loading}
          onGoTo={goTo}
        />
      </div>

      {/* Desktop: two-page spread */}
      <div className="hidden md:block w-full max-w-4xl">
        <div
          className="relative rounded-sm"
          style={{
            background: 'linear-gradient(135deg, #2a1a08 0%, #1a0e04 50%, #2a1a08 100%)',
            boxShadow: '0 28px 72px rgba(0,0,0,0.9), 0 0 0 1px #3d2510, inset 0 1px 0 rgba(200,168,75,0.07)',
            padding: '20px 12px 20px 22px',
          }}
        >
          {/* Spine */}
          <div
            className="absolute top-0 bottom-0 left-0 w-5 rounded-l-sm"
            style={{
              background: 'linear-gradient(to right, #060402, #1a0e04)',
              borderRight: '1px solid #2d1e0a',
              boxShadow: 'inset -5px 0 14px rgba(0,0,0,0.65)',
            }}
          />
          {/* Cover corners */}
          {['top-3 left-7', 'top-3 right-3', 'bottom-3 left-7', 'bottom-3 right-3'].map(pos => (
            <span key={pos} className={`pointer-events-none absolute ${pos} font-heading text-[9px] text-gold/18 select-none`}>✦</span>
          ))}
          {/* Inset border */}
          <div className="absolute inset-x-[16px] inset-y-[10px] rounded-sm border border-gold/[0.055] pointer-events-none" />

          {loading ? (
            /* Skeleton spread */
            <div className="flex gap-0 rounded-sm overflow-hidden" style={{ aspectRatio: '2/1.4' }}>
              {[0, 1].map(s => (
                <div
                  key={s}
                  className={`flex-1 p-6 space-y-3 ${s === 0 ? 'hidden sm:block' : ''}`}
                  style={{ background: 'linear-gradient(160deg, #110c07, #0c0804)' }}
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex gap-2 border-b border-[#1f1509]/30 pb-2.5">
                      <div className="h-2 w-4 rounded bg-parchment/8 shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="h-2.5 w-3/4 rounded bg-parchment/8" />
                        <div className="h-1.5 w-1/2 rounded bg-parchment/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            /* Spread - fixed aspect ratio */
            <div className="flex rounded-sm overflow-hidden aspect-[3/4] sm:aspect-[3/2]">
              {/* Left page */}
              <PageWrapper side={hasRight ? 'left' : 'single'}>
                {renderContent(pages[leftIdx])}
              </PageWrapper>

              {/* Ã¢â€â‚¬Ã¢â€â‚¬ Binding Ã¢â€â‚¬Ã¢â€â‚¬ */}
              <div
                className="hidden sm:flex flex-col items-center shrink-0 py-5"
                style={{
                  width: '28px',
                  background: 'linear-gradient(to right, #090603, #120906, #090603)',
                  borderLeft: '1px solid rgba(200,168,75,0.04)',
                  borderRight: '1px solid rgba(200,168,75,0.04)',
                }}
              >
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="w-[2px] h-[2px] rounded-full bg-gold/12 my-[9px]" />
                ))}
              </div>

              {/* Right page (desktop only) */}
              {hasRight ? (
                <PageWrapper side="right">
                  {renderContent(pages[rightIdx])}
                </PageWrapper>
              ) : (
                /* Blank closing page */
                <div
                  className="hidden sm:flex flex-1 items-center justify-center"
                  style={{ background: 'linear-gradient(160deg, #0e0a06, #090603)' }}
                >
                  <span className="font-heading text-5xl text-gold/[0.04] select-none">✦</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        {!loading && (
          <div className="mt-4 flex items-center justify-between gap-3 px-1">
            <button
              type="button"
              disabled={!canPrev}
              onClick={prevSpread}
              className="flex items-center gap-1.5 rounded-lg border border-app-border bg-app-surface px-3 sm:px-4 py-2 font-ui text-[11px] text-parchment-muted hover:border-gold/30 hover:text-parchment transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {/* Page dots */}
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <p className="font-ui text-[9px] text-parchment-dim/40 tabular-nums">
                <span className="hidden sm:inline">
                  pp.{leftIdx}{hasRight ? `-${rightIdx}` : ''}
                </span>
                <span className="sm:hidden">p.{leftIdx}</span>
                <span className="text-parchment-dim/20"> / {totalPages - 1}</span>
              </p>
              <div className="flex items-center gap-1 flex-wrap justify-center max-w-[180px]">
                {pages.map((_, i) => {
                  const active = i === leftIdx || i === rightIdx
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => goTo(i % 2 === 0 ? i : i - 1)}
                      className={`rounded-full transition-all duration-200 ${
                        active
                          ? 'bg-gold/60 w-3.5 h-1.5'
                          : 'bg-parchment-dim/18 w-1.5 h-1.5 hover:bg-parchment-dim/35'
                      }`}
                    />
                  )
                })}
              </div>
            </div>

            <button
              type="button"
              disabled={!canNext}
              onClick={nextSpread}
              className="flex items-center gap-1.5 rounded-lg border border-app-border bg-app-surface px-3 sm:px-4 py-2 font-ui text-[11px] text-parchment-muted hover:border-gold/30 hover:text-parchment transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default GrimoirePage
