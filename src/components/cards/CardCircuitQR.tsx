/**
 * CardCircuitQR
 *
 * Renders the QR data as glowing circuit traces across the full card.
 * NO filled squares/pads — only thin stroked lines with tiny node dots,
 * exactly like anime magic circuit / energy channel aesthetics.
 *
 * Dormant: opacity 5% — ghost texture barely visible under art.
 * Activated: opacity 65% + rarity-coloured glow — the circuits ignite.
 */
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { CardRarity } from '../../types/cards'

export const CIRCUIT_COLOR: Record<CardRarity, string> = {
  whisper:       '#D4CDB8',
  remnant:       '#D4CDB8',
  manifestation: '#C8A84B',
  awakened:      '#B8C6D0',
  ephemeral:     '#A78BFA',
  void_touched:  '#A855F7',
}

interface Props {
  cardId:     string
  rarity:     CardRarity
  activated?: boolean
  className?: string
}

type QRMatrix = { data: Uint8ClampedArray; size: number }

// ── Build SVG path strings (stroke-only, no fill) ────────────────────────
function buildCircuit(matrix: QRMatrix) {
  const { data, size } = matrix
  const UNIT = 10                // SVG units per module cell
  const NODE_R = 1.0            // radius of junction dot

  const isDark = (r: number, c: number) =>
    r >= 0 && r < size && c >= 0 && c < size && data[r * size + c] !== 0

  // Polyline segments: M x1 y1 L x2 y2  (stroked, no fill)
  const lines: string[] = []
  // Node circles: M cx-r cy  a r r 0 1 0 2r 0 a r r 0 1 0 -2r 0  (arc trick)
  const nodes: string[] = []

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isDark(r, c)) continue

      const cx = c * UNIT + UNIT / 2
      const cy = r * UNIT + UNIT / 2

      // Tiny junction dot (circle via arc path)
      nodes.push(
        `M${cx - NODE_R},${cy}` +
        `a${NODE_R},${NODE_R} 0 1 0 ${NODE_R * 2},0` +
        `a${NODE_R},${NODE_R} 0 1 0 ${-NODE_R * 2},0`
      )

      // Horizontal trace to right neighbour
      if (isDark(r, c + 1)) {
        const nx = (c + 1) * UNIT + UNIT / 2
        lines.push(`M${cx},${cy}L${nx},${cy}`)
      }

      // Vertical trace to bottom neighbour
      if (isDark(r + 1, c)) {
        const ny = (r + 1) * UNIT + UNIT / 2
        lines.push(`M${cx},${cy}L${cx},${ny}`)
      }

      // Diagonal — only when BOTH neighbouring cells are dark too
      // (creates organic crossings in dense areas, avoided in sparse areas)
      if (isDark(r + 1, c + 1) && isDark(r, c + 1) && isDark(r + 1, c)) {
        const nx = (c + 1) * UNIT + UNIT / 2
        const ny = (r + 1) * UNIT + UNIT / 2
        lines.push(`M${cx},${cy}L${nx},${ny}`)
      }
    }
  }

  return {
    lines: lines.join(' '),
    nodes: nodes.join(' '),
    svgSize: size * UNIT,
  }
}

// ── Component ──────────────────────────────────────────────────────────────
export default function CardCircuitQR({ cardId, rarity, activated = false, className = '' }: Props) {
  const [circuit, setCircuit] = useState<ReturnType<typeof buildCircuit> | null>(null)
  const color = CIRCUIT_COLOR[rarity]

  useEffect(() => {
    const url = `${window.location.origin}/trade/present/${cardId}`
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qr = (QRCode as any).create(url, { errorCorrectionLevel: 'M' })
      setCircuit(buildCircuit(qr.modules as QRMatrix))
    } catch { /* skip */ }
  }, [cardId])

  if (!circuit) return null

  const opacity = activated ? 0.65 : 0.05
  const glow    = activated
    ? `drop-shadow(0 0 1.5px ${color}cc) drop-shadow(0 0 5px ${color}88) drop-shadow(0 0 12px ${color}44)`
    : undefined

  return (
    <svg
      viewBox={`0 0 ${circuit.svgSize} ${circuit.svgSize}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      style={{
        opacity,
        filter: glow,
        mixBlendMode: 'screen',
        transition: 'opacity 1.2s ease, filter 1.2s ease',
      }}
    >
      {/* Traces — thin stroked lines, NO fill */}
      <path
        d={circuit.lines}
        fill="none"
        stroke={color}
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* Junction nodes — small filled circles, much smaller than pads */}
      <path
        d={circuit.nodes}
        fill={color}
        opacity="1"
      />
    </svg>
  )
}

