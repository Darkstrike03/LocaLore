/**
 * LSB (Least-Significant-Bit) steganography for browser ImageData.
 *
 * Works perfectly for digital file sharing (PNG saved to disk / sent via chat).
 * Does NOT survive camera capture or JPEG re-compression.
 *
 * Payload layout (all big-endian):
 *   [4 bytes magic 'LORE'] [4 bytes payload length] [N bytes UTF-8 payload]
 *
 * Encoding: bits are written sequentially into the LSB of R, G, B channels
 * (alpha is untouched).  1 pixel absorbs 3 bits.
 */

const MAGIC = [76, 79, 82, 69] // 'LORE'

// ─── Encode ───────────────────────────────────────────────────────────────────
/**
 * Encodes `text` into the LSBs of `imageData` (mutates in place).
 * The caller must call ctx.putImageData() after this.
 */
export function stegEncode(imageData: ImageData, text: string): void {
  const payload = new TextEncoder().encode(text)
  const data    = imageData.data

  const bits: number[] = []

  // Magic header
  for (const b of MAGIC) {
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1)
  }

  // Length (uint32 big-endian)
  const len = payload.length
  for (let i = 31; i >= 0; i--) bits.push((len >> i) & 1)

  // Payload bytes
  for (const byte of payload) {
    for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1)
  }

  // Write into R, G, B LSBs (skip A = every 4th byte)
  let bitIdx = 0
  for (let px = 0; px < data.length && bitIdx < bits.length; px += 4) {
    data[px]   = (data[px]   & 0xFE) | bits[bitIdx++]            // R
    if (bitIdx < bits.length) data[px+1] = (data[px+1] & 0xFE) | bits[bitIdx++] // G
    if (bitIdx < bits.length) data[px+2] = (data[px+2] & 0xFE) | bits[bitIdx++] // B
  }
}

// ─── Decode ───────────────────────────────────────────────────────────────────
/**
 * Attempts to decode a string from the LSBs of `imageData`.
 * Returns `null` if the magic header is absent (i.e. no payload was embedded).
 */
export function stegDecode(imageData: ImageData): string | null {
  const data = imageData.data
  const bits: number[] = []

  // Extract LSBs from R, G, B channels
  for (let px = 0; px < data.length; px += 4) {
    bits.push(data[px]   & 1)
    bits.push(data[px+1] & 1)
    bits.push(data[px+2] & 1)
  }

  let pos = 0

  const readByte = (): number => {
    let b = 0
    for (let i = 7; i >= 0; i--) b |= (bits[pos++] << i)
    return b
  }

  const readUint32 = (): number => {
    let n = 0
    for (let i = 31; i >= 0; i--) n |= (bits[pos++] << i)
    return n >>> 0  // ensure unsigned
  }

  // Verify magic
  for (const expected of MAGIC) {
    if (readByte() !== expected) return null
  }

  const len = readUint32()
  // Sanity bounds: UUIDs are 36 bytes, full trade URLs are < 200 bytes
  if (len <= 0 || len > 4096) return null

  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = readByte()

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}
