import { createHmac, randomBytes } from 'crypto'

/**
 * Generate a random TOTP secret (base32 encoded)
 */
export function generateTotpSecret(): string {
  const buffer = randomBytes(20)
  return base32Encode(buffer)
}

/**
 * Verify a TOTP code against a secret
 * Allows for 1 step before and after current time (30 second windows)
 */
export function verifyTotp(secret: string, code: string): boolean {
  const currentTime = Math.floor(Date.now() / 1000 / 30)

  // Check current and adjacent time steps for clock drift tolerance
  for (let i = -1; i <= 1; i++) {
    const expectedCode = generateTotpCode(secret, currentTime + i)
    if (timingSafeEqual(code, expectedCode)) {
      return true
    }
  }

  return false
}

/**
 * Generate a TOTP code for a given time step
 */
export function generateTotpCode(secret: string, timeStep: number): string {
  const buffer = Buffer.alloc(8)
  buffer.writeBigInt64BE(BigInt(timeStep))

  const decodedSecret = base32Decode(secret)
  const hmac = createHmac('sha1', decodedSecret)
  hmac.update(buffer)
  const hash = hmac.digest()

  // Dynamic truncation
  const lastByte = hash[hash.length - 1]
  if (lastByte === undefined) {
    throw new Error('Invalid HMAC hash')
  }
  const offset = lastByte & 0x0f
  const b0 = hash[offset]
  const b1 = hash[offset + 1]
  const b2 = hash[offset + 2]
  const b3 = hash[offset + 3]
  if (b0 === undefined || b1 === undefined || b2 === undefined || b3 === undefined) {
    throw new Error('Invalid HMAC hash offset')
  }
  const code = ((b0 & 0x7f) << 24) | ((b1 & 0xff) << 16) | ((b2 & 0xff) << 8) | (b3 & 0xff)

  return String(code % 1000000).padStart(6, '0')
}

/**
 * Generate a TOTP URI for authenticator apps
 */
export function generateTotpUri(secret: string, email: string, issuer: string = 'BotEsq'): string {
  const encodedIssuer = encodeURIComponent(issuer)
  const encodedEmail = encodeURIComponent(email)
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`
}

// Base32 encoding/decoding helpers
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(buffer: Buffer): string {
  let result = ''
  let bits = 0
  let value = 0

  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8

    while (bits >= 5) {
      bits -= 5
      result += BASE32_ALPHABET[(value >> bits) & 0x1f]
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f]
  }

  return result
}

function base32Decode(encoded: string): Buffer {
  const cleanedInput = encoded.toUpperCase().replace(/=+$/, '')
  const bytes: number[] = []
  let bits = 0
  let value = 0

  for (const char of cleanedInput) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) continue

    value = (value << 5) | index
    bits += 5

    if (bits >= 8) {
      bits -= 8
      bytes.push((value >> bits) & 0xff)
    }
  }

  return Buffer.from(bytes)
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}
