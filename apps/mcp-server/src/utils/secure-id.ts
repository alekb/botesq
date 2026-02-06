/**
 * Secure ID Generation Utility
 *
 * Uses Node.js crypto.randomBytes for cryptographically secure random IDs.
 * All external-facing IDs should use this module.
 */

import crypto from 'crypto'

// URL-safe alphabet (no ambiguous characters like 0/O, 1/l/I)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ALPHABET_LENGTH = ALPHABET.length // 32 characters

/**
 * Generate a cryptographically secure random ID
 *
 * Uses crypto.randomBytes() which is backed by the OS CSPRNG.
 * With 16 characters from a 32-char alphabet = 32^16 = 1.2e24 combinations
 *
 * @param length - Number of characters (default: 16)
 * @returns Random alphanumeric string
 */
export function generateSecureId(length: number = 16): string {
  const bytes = crypto.randomBytes(length)
  let result = ''

  for (let i = 0; i < length; i++) {
    // Use modulo to map byte to alphabet index
    // This is slightly biased but acceptable for our use case
    // (bias is < 0.4% with 32-char alphabet and 256 possible byte values)
    const byteValue = bytes[i] as number
    result += ALPHABET[byteValue % ALPHABET_LENGTH]
  }

  return result
}

/**
 * Generate a secure external ID with a prefix
 *
 * @param prefix - ID prefix (e.g., 'CONS', 'DOC', 'MTR')
 * @param length - Random portion length (default: 16)
 * @returns Prefixed secure ID (e.g., 'CONS-A7B3C9D2E5F8G4H6')
 */
export function generateExternalId(prefix: string, length: number = 16): string {
  return `${prefix}-${generateSecureId(length)}`
}

// Pre-configured ID generators for each entity type
export const generateConsultationId = () => generateExternalId('CONS')
export const generateMatterId = () => generateExternalId('MTR')
export const generateDocumentId = () => generateExternalId('DOC')
export const generateRetainerId = () => generateExternalId('RET')
export const generateDisputeId = () => generateExternalId('RDISP')
export const generateTransactionId = () => generateExternalId('RTXN')
export const generateAgentId = () => generateExternalId('RAGENT')
export const generateEscalationId = () => generateExternalId('RESC')
