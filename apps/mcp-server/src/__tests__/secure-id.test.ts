import { describe, it, expect } from 'vitest'
import {
  generateSecureId,
  generateExternalId,
  generateConsultationId,
  generateMatterId,
  generateDocumentId,
  generateRetainerId,
  generateDisputeId,
  generateTransactionId,
  generateAgentId,
  generateEscalationId,
  generateProviderId,
  generateToken,
} from '../utils/secure-id'

const VALID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

describe('secure-id', () => {
  describe('generateSecureId', () => {
    it('should generate ID with default length of 16', () => {
      const id = generateSecureId()
      expect(id).toHaveLength(16)
    })

    it('should generate ID with custom length', () => {
      const id = generateSecureId(8)
      expect(id).toHaveLength(8)
    })

    it('should only contain valid alphabet characters', () => {
      const id = generateSecureId(100)
      for (const char of id) {
        expect(VALID_ALPHABET).toContain(char)
      }
    })

    it('should not contain ambiguous characters (0, O, 1, l, I)', () => {
      // Generate many IDs to increase coverage
      for (let i = 0; i < 50; i++) {
        const id = generateSecureId(32)
        expect(id).not.toMatch(/[0OlI1]/)
      }
    })

    it('should generate unique IDs', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 100; i++) {
        ids.add(generateSecureId())
      }
      expect(ids.size).toBe(100)
    })
  })

  describe('generateExternalId', () => {
    it('should generate ID with prefix', () => {
      const id = generateExternalId('TEST')
      expect(id).toMatch(/^TEST-[A-Z2-9]{16}$/)
    })

    it('should generate ID with prefix and custom length', () => {
      const id = generateExternalId('X', 8)
      expect(id).toMatch(/^X-[A-Z2-9]{8}$/)
    })
  })

  describe('prefixed ID generators', () => {
    const generators = [
      { fn: generateConsultationId, prefix: 'CONS' },
      { fn: generateMatterId, prefix: 'MTR' },
      { fn: generateDocumentId, prefix: 'DOC' },
      { fn: generateRetainerId, prefix: 'RET' },
      { fn: generateDisputeId, prefix: 'RDISP' },
      { fn: generateTransactionId, prefix: 'RTXN' },
      { fn: generateAgentId, prefix: 'RAGENT' },
      { fn: generateEscalationId, prefix: 'RESC' },
      { fn: generateProviderId, prefix: 'PRV' },
    ]

    for (const { fn, prefix } of generators) {
      it(`should generate ID with ${prefix} prefix`, () => {
        const id = fn()
        expect(id.startsWith(`${prefix}-`)).toBe(true)
        const randomPart = id.slice(prefix.length + 1)
        expect(randomPart).toHaveLength(16)
      })
    }
  })

  describe('generateToken', () => {
    it('should generate base64url encoded token with default 32 bytes', () => {
      const token = generateToken()
      // 32 bytes in base64url = 43 characters
      expect(token).toHaveLength(43)
    })

    it('should generate token with custom byte length', () => {
      const token = generateToken(16)
      // 16 bytes in base64url = 22 characters
      expect(token).toHaveLength(22)
    })

    it('should only contain URL-safe characters', () => {
      const token = generateToken()
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('should generate unique tokens', () => {
      const tokens = new Set<string>()
      for (let i = 0; i < 50; i++) {
        tokens.add(generateToken())
      }
      expect(tokens.size).toBe(50)
    })
  })
})
