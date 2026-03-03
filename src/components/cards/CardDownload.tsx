/**
 * CardDownload.tsx
 *
 * A dedicated card component used ONLY for generating download PNGs via html2canvas.
 * It is rendered off-screen and never shown to users interactively.
 *
 * ── ADJUSTING THE CARD SIZE ─────────────────────────────────────────────────
 * All dimensions live in the CARD constant below. Tweak freely:
 *
 *   width       — total card width  in px
 *   height      — total card height in px  (set to 'auto' to grow with content)
 *   imgHeight   — art area height   in px  (roughly width * 0.72 looks natural)
 *   nameSize    — creature name font size  in px
 *   textSize    — body / flavor text font size in px
 *   padding     — horizontal padding inside the card (px)
 * ────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react'
import type { UserCard } from '../../types/cards'
import { RARITY_META, GRADE_META } from '../../types/cards'

// ─── TWEAK THESE ────────────────────────────────────────────────────────────
const CARD = {
  width:     280,   // px — total card width
  height:    392, // 'auto' grows to fit content; set e.g. 392 to fix
  imgHeight: 200,   // px — art area height
  nameSize:  16,    // px — creature name
  textSize:  11,    // px — region / type / flavor text
  padding:   12,    // px — horizontal inner padding
  radius:    10,    // px — corner radius
}
// ────────────────────────────────────────────────────────────────────────────

const TYPE_GLYPH: Record<string, string> = {
  spirit:         '👁',
  demon:          '🔥',
  trickster:      '🃏',
  water_creature: '🌊',
  shapeshifter:   '🌑',
  undead:         '💀',
  other:          '☽',
}

const RARITY_GLOW: Record<string, string> = {
  whisper:        'rgba(180,170,150,0.14)',
  remnant:        'rgba(212,205,184,0.18)',
  manifestation:  'rgba(200,168,75,0.24)',
  awakened:       'rgba(184,198,208,0.24)',
  ephemeral:      'rgba(167,139,250,0.28)',
  void_touched:   'rgba(168,85,247,0.34)',
}

interface Props {
  card: UserCard & { definition: NonNullable<UserCard['definition']> }
}

export default function CardDownload({ card }: Props) {
  const [imgError, setImgError] = useState(false)
  const { definition } = card

  const creature = definition.creature ?? {
    id: '', name: 'Unknown Entity', slug: '', alternate_names: [],
    region: null, country: null, locality: null, latitude: null, longitude: null,
    creature_type: 'other' as const, description: '', origin_story: null, abilities: null,
    survival_tips: null, image_url: null, model_url: null, verified: false,
    danger_rating: null, source: 'ai_collected' as const, submitted_by: null,
    created_at: '', updated_at: '',
  }

  const rarity = RARITY_META[definition.rarity]
  const grade  = GRADE_META[card.grade]

  // Border color extracted from rarity.border class → map to raw CSS
  const BORDER_COLOR: Record<string, string> = {
    whisper:        '#6b6456',
    remnant:        '#8a8374',
    manifestation:  '#b8994a',
    awakened:       '#7a9bb0',
    ephemeral:      '#8b6fd6',
    void_touched:   '#9333ea',
  }
  const borderColor = BORDER_COLOR[definition.rarity] ?? '#4a4a5a'

  return (
    <div
      style={{
        width:           CARD.width,
        height:          CARD.height,
        borderRadius:    CARD.radius,
        border:          `1.5px solid ${borderColor}`,
        backgroundColor: '#080810',
        overflow:        'hidden',
        fontFamily:      'sans-serif',
        display:         'flex',
        flexDirection:   'column',
      }}
    >
      {/* ── Art area ──────────────────────────────────────────────── */}
      <div style={{ position: 'relative', width: '100%', height: CARD.imgHeight, flexShrink: 0 }}>
        {creature.image_url && !imgError ? (
          <img
            src={creature.image_url}
            alt={creature.name}
            crossOrigin="anonymous"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            style={{
              width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 6,
              background: `radial-gradient(ellipse at 50% 60%, ${RARITY_GLOW[definition.rarity] ?? 'rgba(200,168,75,0.15)'}, #080810 80%)`,
            }}
          >
            <span style={{ fontSize: CARD.imgHeight * 0.30, opacity: 0.55 }}>
              {TYPE_GLYPH[creature.creature_type] ?? '☽'}
            </span>
            <span style={{ fontSize: CARD.imgHeight * 0.06, opacity: 0.20, textAlign: 'center', padding: '0 8px', wordBreak: 'break-word' }}>
              {creature.name.toUpperCase()}
            </span>
          </div>
        )}

        {/* Serial + rarity glyph overlay */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '6px 8px' }}>
          <span style={{
            fontFamily: 'monospace', fontSize: CARD.textSize - 1,
            background: 'rgba(0,0,0,0.65)', borderRadius: 4, padding: '2px 5px',
            color: rarity.color.replace('text-', '').replace('[', '').replace(']', '') || '#c8a84b',
          }}>
            {definition.edition_size
              ? `#${String(card.serial_number).padStart(3, '0')}/${definition.edition_size}`
              : `#${card.serial_number}`}
          </span>
          <span style={{ fontSize: 16, lineHeight: 1 }}>{rarity.glyph}</span>
        </div>

        {/* Bottom fade */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 24, background: 'linear-gradient(to top, #080810, transparent)' }} />
      </div>

      {/* ── Info area ─────────────────────────────────────────────── */}
      <div style={{ padding: `10px ${CARD.padding}px 14px`, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {/* Name */}
        <div style={{ fontSize: CARD.nameSize, fontWeight: 700, color: '#e8e0cc', letterSpacing: '0.04em', lineHeight: 1.2 }}>
          {creature.name}
        </div>

        {/* Region · type */}
        <div style={{ fontSize: CARD.textSize, color: '#9a9080', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span>{creature.region ?? creature.country ?? 'Unknown'}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ textTransform: 'capitalize' }}>{creature.creature_type.replace('_', ' ')}</span>
        </div>

        {/* Danger pips */}
        {creature.danger_rating != null && (
          <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ width: 8, height: 5, borderRadius: 2, background: i < (creature.danger_rating ?? 0) ? '#c0392b' : '#2a2a3a' }} />
            ))}
          </div>
        )}

        {/* Flavor text — no clamp, shows fully */}
        {definition.flavor_text && (
          <div style={{ fontSize: CARD.textSize, color: '#9a9080', fontStyle: 'italic', lineHeight: 1.5, marginTop: 2, opacity: 0.85 }}>
            "{definition.flavor_text}"
          </div>
        )}

        {/* Rarity + grade row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: CARD.textSize }}>
          <span style={{ color: '#c8a84b' }}>{rarity.label}</span>
          <span style={{ color: grade.color.includes('text-') ? '#aaa' : '#aaa', opacity: 0.7 }}>{grade.label}</span>
        </div>

        {/* Event badge */}
        {definition.is_event_exclusive && (
          <div style={{ alignSelf: 'flex-start', fontSize: CARD.textSize - 1, background: 'rgba(109,40,217,0.4)', color: '#c4b5fd', borderRadius: 4, padding: '2px 6px' }}>
            Event
          </div>
        )}
      </div>
    </div>
  )
}
