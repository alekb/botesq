/**
 * @deprecated Use secure-id.ts instead. This module will be removed in v3.0.0
 *
 * Migration guide:
 * - generateId() → use generateSecureId() or generateExternalId() from secure-id.ts
 * - generateShortToken() → use generateToken() from secure-id.ts
 * - generateRequestId() → not yet migrated, keep using this for now
 */

import { randomBytes } from 'crypto'

/**
 * @deprecated Use generateSecureId() from secure-id.ts instead
 * Generate a unique ID with an optional prefix
 * Format: PREFIX-XXXXXXXXXX (10 random alphanumeric chars)
 */
export function generateId(prefix?: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = randomBytes(10)
  let id = ''

  for (let i = 0; i < 10; i++) {
    const byte = bytes[i]
    if (byte !== undefined) {
      id += chars[byte % chars.length]
    }
  }

  return prefix ? `${prefix}-${id}` : id
}

/**
 * @deprecated Use generateToken() from secure-id.ts instead
 * Generate a short token for URLs (email verification, password reset, etc.)
 * @returns A URL-safe base64 encoded token
 */
export function generateShortToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Generate a request ID for tracking
 * Format: req_XXXXXXXXXXXXXXXX (16 random hex chars)
 */
export function generateRequestId(): string {
  return `req_${randomBytes(8).toString('hex')}`
}
