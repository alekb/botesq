import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding'
import { sha256 } from '@oslojs/crypto/sha2'

/**
 * Generate a cryptographically secure random token
 * Uses 32 bytes of randomness encoded as base32 (51 chars)
 */
export function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return encodeBase32LowerCaseNoPadding(bytes)
}

/**
 * Generate a shorter token for email verification
 * Uses 20 bytes of randomness encoded as base32 (32 chars)
 */
export function generateShortToken(): string {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  return encodeBase32LowerCaseNoPadding(bytes)
}

/**
 * Hash a token for storage using SHA-256
 * Tokens should be hashed before storing in the database
 */
export function hashToken(token: string): string {
  const bytes = new TextEncoder().encode(token)
  const hash = sha256(bytes)
  return encodeHexLowerCase(hash)
}

/**
 * Generate a session ID (used as primary key, not secret)
 */
export function generateSessionId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return encodeHexLowerCase(bytes)
}
