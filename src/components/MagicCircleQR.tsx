/**
 * MagicCircleQR
 *
 * Renders a QR code disguised as a mystical summoning circle.
 * Outer SVG rings, tick runes, and cardinal glyphs surround a
 * gold-dot QR image. The whole thing looks like a magic seal.
 */
import { useEffect, useState, useId } from 'react'
import QRCode from 'qrcode'

// Elder-futhark-inspired unicode rune marks around the circle
const RUNE_CHARS = ['ᛟ', 'ᚢ', 'ᛏ', 'ᚱ', 'ᚨ', 'ᛗ', 'ᚷ', 'ᛚ']

interface Props {
  /** Full URL encoded into the QR */
  url: string
  /** Outer pixel size of the component (default 280) */
  size?: number
  /** Ambient accent colour in CSS (default amber) */
  color?: string
  /** Extra className on the wrapper */
  className?: string
}

export default function MagicCircleQR({
  url,
  size = 280,
  color = '#C8A84B',
  className = '',
}: Props) {
  const id         = useId().replace(/:/g, '')   // safe for SVG clip-path IDs
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: Math.round(size * 0.68),          // slightly smaller than clip circle
      margin: 1,
      color: { dark: color, light: '#00000000' }, // gold modules, transparent BG
      errorCorrectionLevel: 'H',               // high EC so SVG overlay doesn't break scan
    }).then(setQr).catch(() => {})
  }, [url, size, color])

  // ── SVG geometry ────────────────────────────────────────────────────────────
  const cx = 150, cy = 150          // centre of 300×300 viewBox
  const R = {
    qr:     94,                     // clip radius for the QR image
    inner:  98,                     // solid inner ring
    rune:   112,                    // radius rune chars sit on
    mid:    122,                    // dashed middle ring
    tick:   136,                    // tip of tick marks
    tickIn: 128,                    // base of tick marks
    outer:  143,                    // outer rotating ring
  }

  // 24 tick marks every 15 degrees; 8 are "major" (every 45°)
  const ticks = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * 15 * Math.PI) / 180
    const major = i % 3 === 0
    const r1 = major ? R.tickIn - 4 : R.tickIn
    const r2 = major ? R.tick  + 4 : R.tick
    return {
      x1: cx + r1 * Math.cos(angle),
      y1: cy + r1 * Math.sin(angle),
      x2: cx + r2 * Math.cos(angle),
      y2: cy + r2 * Math.sin(angle),
      major,
    }
  })

  // 8 rune characters at 45° intervals
  const runes = RUNE_CHARS.map((ch, i) => {
    const angle = (i * 45 * Math.PI) / 180
    return {
      ch,
      x: cx + R.rune * Math.cos(angle),
      y: cy + R.rune * Math.sin(angle),
    }
  })

  // 4 diamond marks at cardinal points (0°, 90°, 180°, 270°)
  const diamonds = [0, 90, 180, 270].map(deg => {
    const a = (deg * Math.PI) / 180
    return { cx: cx + R.mid * Math.cos(a), cy: cy + R.mid * Math.sin(a) }
  })

  const clipId    = `mcqr-clip-${id}`
  const filterId  = `mcqr-glow-${id}`
  const rotateId  = `mcqr-rot-${id}`

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        background: 'radial-gradient(circle at 50% 50%, #0e0c18 0%, #060609 60%)',
        borderRadius: '50%',
        boxShadow: `0 0 ${size * 0.25}px ${color}22, 0 0 ${size * 0.08}px ${color}33`,
      }}
    >
      {/* ── QR image ─────────────────────────────────────────────────────── */}
      {qr && (
        <img
          src={qr}
          alt="Trade QR seal"
          draggable={false}
          style={{
            position: 'absolute',
            width:  Math.round(size * 0.68),
            height: Math.round(size * 0.68),
            // Circular clip to keep QR inside the inner ring
            clipPath: `circle(${Math.round(size * 0.31)}px at 50% 50%)`,
            filter: `drop-shadow(0 0 ${size * 0.012}px ${color}) drop-shadow(0 0 ${size * 0.025}px ${color}88)`,
          }}
        />
      )}

      {/* ── SVG decorative overlay ───────────────────────────────────────── */}
      <svg
        viewBox="0 0 300 300"
        width={size}
        height={size}
        style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
        aria-hidden
      >
        <defs>
          {/* Glow filter */}
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Clip for QR */}
          <clipPath id={clipId}>
            <circle cx={cx} cy={cy} r={R.qr} />
          </clipPath>
          {/* Rotating ring animation */}
          <style>{`
            @keyframes ${rotateId} {
              from { transform: rotate(0deg); transform-origin: ${cx}px ${cy}px; }
              to   { transform: rotate(360deg); transform-origin: ${cx}px ${cy}px; }
            }
            .mcqr-spin-${id} { animation: ${rotateId} 18s linear infinite; }
            .mcqr-spin-rev-${id} { animation: ${rotateId} 28s linear infinite reverse; }
          `}</style>
        </defs>

        {/* ── Inner solid circle ─────────────────────────────────────────── */}
        <circle cx={cx} cy={cy} r={R.inner}
          fill="none" stroke={color} strokeWidth="0.6" opacity="0.55"
          filter={`url(#${filterId})`} />

        {/* ── Rune characters ────────────────────────────────────────────── */}
        {runes.map(({ ch, x, y }, i) => (
          <text key={i} x={x} y={y}
            textAnchor="middle" dominantBaseline="central"
            fontSize="9" fill={color} opacity="0.7"
            fontFamily="serif" filter={`url(#${filterId})`}
          >{ch}</text>
        ))}

        {/* ── Dashed middle ring (static) ───────────────────────────────── */}
        <circle cx={cx} cy={cy} r={R.mid}
          fill="none" stroke={color} strokeWidth="0.8"
          strokeDasharray="3 5" opacity="0.45"
          filter={`url(#${filterId})`} />

        {/* ── Diamond nodes at 0° intervals on middle ring ──────────────── */}
        {diamonds.map((d, i) => (
          <polygon key={i}
            points={`${d.cx},${d.cy - 3.5} ${d.cx + 3.5},${d.cy} ${d.cx},${d.cy + 3.5} ${d.cx - 3.5},${d.cy}`}
            fill={color} opacity="0.85" filter={`url(#${filterId})`}
          />
        ))}

        {/* ── Tick marks ───────────────────────────────────────────────────── */}
        {ticks.map((t, i) => (
          <line key={i}
            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={color}
            strokeWidth={t.major ? 1.1 : 0.6}
            opacity={t.major ? 0.8 : 0.4}
            filter={`url(#${filterId})`}
          />
        ))}

        {/* ── Outer rotating dashed ring ───────────────────────────────── */}
        <g className={`mcqr-spin-${id}`}>
          <circle cx={cx} cy={cy} r={R.outer}
            fill="none" stroke={color} strokeWidth="1.2"
            strokeDasharray="6 4" opacity="0.6"
            filter={`url(#${filterId})`} />
        </g>

        {/* ── Slow counter-rotating inner accent ring ───────────────────── */}
        <g className={`mcqr-spin-rev-${id}`}>
          <circle cx={cx} cy={cy} r={R.inner + 4}
            fill="none" stroke={color} strokeWidth="0.4"
            strokeDasharray="1 7" opacity="0.35" />
        </g>

        {/* ── Cross-hair guide lines (very faint) ─────────────────────── */}
        {[0, 45, 90, 135].map(deg => {
          const a  = (deg * Math.PI) / 180
          const r  = R.inner - 2
          return (
            <line key={deg}
              x1={cx - r * Math.cos(a)} y1={cy - r * Math.sin(a)}
              x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)}
              stroke={color} strokeWidth="0.3" opacity="0.18"
            />
          )
        })}

        {/* ── Outer edge glow ring ─────────────────────────────────────── */}
        <circle cx={cx} cy={cy} r={R.outer + 4}
          fill="none" stroke={color} strokeWidth="3" opacity="0.06" />
      </svg>
    </div>
  )
}
