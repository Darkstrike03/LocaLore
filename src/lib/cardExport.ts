/**
 * Exports a UserCard as a PNG image.
 *
 * What this does:
 *  1. Draws the creature artwork onto a canvas
 *  2. Adds a styled info panel (name, rarity, flavor text, serial number)
 *  3. Adds a subtle "localore.app" watermark — discoverable by Google Lens OCR
 *  4. Steganographically encodes the card's UUID into pixel LSBs (invisible)
 *  5. Triggers a PNG download
 *
 * The hidden card ID survives:  PNG save → file share → upload decode  ✅
 * The hidden card ID does NOT survive: camera capture / JPEG re-compression  ❌
 *  (for camera-based trade, the MagicCircleQR on PresentCardPage is used)
 */

import { stegEncode } from './steganography'
import type { UserCard } from '../types/cards'

type FullCard = UserCard & { definition: NonNullable<UserCard['definition']> }

const RARITY_ACCENT: Record<string, string> = {
  whisper:       '#D4CDB8',
  remnant:       '#D4CDB8',
  manifestation: '#C8A84B',
  awakened:      '#B8C6D0',
  ephemeral:     '#A78BFA',
  void_touched:  '#A855F7',
}

const CARD_W = 480
const CARD_H = 672

/** Wraps canvas text into multiple lines, returns the Y position after the last line. */
function fillWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(' ')
  let line = ''
  let y = startY
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y)
      line = word
      y += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, y)
  return y
}

/** Loads an image URL onto a canvas2D, returns true on success. */
async function drawRemoteImage(
  ctx: CanvasRenderingContext2D,
  url: string,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.drawImage(img, dx, dy, dw, dh)
      resolve(true)
    }
    img.onerror = () => resolve(false)
    img.src = url
  })
}

export async function exportCardAsPNG(card: FullCard): Promise<void> {
  const creature = card.definition?.creature
  const rarity   = card.definition?.rarity ?? 'whisper'
  const accent   = RARITY_ACCENT[rarity] ?? '#D4CDB8'
  const imageUrl = creature?.image_url ?? ''

  const canvas = document.createElement('canvas')
  canvas.width  = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  // ── 1. Dark background ────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, CARD_H)
  bg.addColorStop(0, '#0c0c14')
  bg.addColorStop(1, '#060609')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // ── 2. Creature artwork ───────────────────────────────────────────────────
  const artH = Math.floor(CARD_H * 0.70)
  if (imageUrl) {
    await drawRemoteImage(ctx, imageUrl, 0, 0, CARD_W, artH)
    // Gradient fade-to-dark at bottom of art
    const fade = ctx.createLinearGradient(0, artH * 0.6, 0, artH)
    fade.addColorStop(0, 'transparent')
    fade.addColorStop(1, '#060609')
    ctx.fillStyle = fade
    ctx.fillRect(0, artH * 0.6, CARD_W, artH * 0.4 + 2)
  }

  // ── 3. Info panel background ──────────────────────────────────────────────
  const panelY = artH
  ctx.fillStyle = '#060609'
  ctx.fillRect(0, panelY, CARD_W, CARD_H - panelY)

  // Thin rarity accent separator line
  ctx.strokeStyle = `${accent}55`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(24, panelY + 1)
  ctx.lineTo(CARD_W - 24, panelY + 1)
  ctx.stroke()

  // ── 4. Creature name ──────────────────────────────────────────────────────
  ctx.font = `bold 26px Georgia, serif`
  ctx.fillStyle = accent
  ctx.textAlign = 'center'
  ctx.fillText(creature?.name ?? 'Unknown Entity', CARD_W / 2, panelY + 34)

  // ── 5. Rarity + region ────────────────────────────────────────────────────
  ctx.font = `11px Arial, sans-serif`
  ctx.fillStyle = `${accent}88`
  const rarityLabel = rarity.replace(/_/g, ' ').toUpperCase()
  const regionLabel = creature?.region ? `  ·  ${creature.region}` : ''
  ctx.fillText(`${rarityLabel}${regionLabel}`, CARD_W / 2, panelY + 54)

  // ── 6. Flavor text ────────────────────────────────────────────────────────
  if (card.definition?.flavor_text) {
    ctx.font = `italic 12px Georgia, serif`
    ctx.fillStyle = '#9c917888'
    ctx.textAlign = 'center'
    fillWrappedText(ctx, `"${card.definition.flavor_text}"`, CARD_W / 2, panelY + 76, CARD_W - 56, 18)
  }

  // ── 7. Card border (double rule) ──────────────────────────────────────────
  ctx.strokeStyle = `${accent}44`
  ctx.lineWidth = 1.5
  ctx.strokeRect(5, 5, CARD_W - 10, CARD_H - 10)
  ctx.strokeStyle = `${accent}18`
  ctx.lineWidth = 1
  ctx.strokeRect(10, 10, CARD_W - 20, CARD_H - 20)

  // ── 8. Serial number (bottom-left) ────────────────────────────────────────
  ctx.font = `10px Arial, monospace`
  ctx.fillStyle = `${accent}55`
  ctx.textAlign = 'left'
  ctx.fillText(`#${String(card.serial_number).padStart(4, '0')}`, 14, CARD_H - 10)

  // ── 9. localore.app watermark (bottom-right, subtle but OCR-readable) ────
  // This is the "free marketing" hook: Google Lens OCR picks up the domain,
  // linking the shared card back to the platform.
  ctx.font = `10px Arial, sans-serif`
  ctx.fillStyle = `${accent}66`
  ctx.textAlign = 'right'
  ctx.fillText('localore.app', CARD_W - 14, CARD_H - 10)

  // ── 10. Steganographic encoding (hidden card ID in pixel LSBs) ────────────
  // Encodes card.id (UUID, 36 bytes) invisibly into the image.
  // Survives PNG file sharing. When the receiver uploads this PNG, the app
  // reads the hidden ID and opens the trade flow automatically.
  let stegoApplied = false
  try {
    const imageData = ctx.getImageData(0, 0, CARD_W, CARD_H)
    stegEncode(imageData, card.id)
    ctx.putImageData(imageData, 0, 0)
    stegoApplied = true
  } catch {
    // Canvas tainted by CORS — stego skipped, visual image still exported
    console.warn('[cardExport] CORS taint prevented steganography — image exported without hidden ID')
  }

  // ── 11. Trigger download ──────────────────────────────────────────────────
  const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'))
  if (!blob) return

  const objUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href     = objUrl
  a.download = `${(creature?.name ?? 'localore-card').replace(/\s+/g, '-').toLowerCase()}-${String(card.serial_number).padStart(4, '0')}.png`
  a.click()
  setTimeout(() => URL.revokeObjectURL(objUrl), 10_000)

  if (!stegoApplied) {
    // Bubble up so the caller can inform the user
    throw new Error('cors_taint')
  }
}
