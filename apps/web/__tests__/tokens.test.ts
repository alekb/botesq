import { describe, it, expect } from 'vitest'
import { generateToken, generateShortToken, hashToken, generateSessionId } from '../lib/auth/tokens'

describe('auth tokens', () => {
  describe('generateToken', () => {
    it('should generate a 51-character base32 token', () => {
      const token = generateToken()

      // 32 bytes encoded in base32 (lowercase, no padding) = 51-52 chars
      expect(token.length).toBeGreaterThanOrEqual(51)
      expect(token.length).toBeLessThanOrEqual(52)
    })

    it('should only contain lowercase base32 characters', () => {
      const token = generateToken()

      expect(token).toMatch(/^[a-z2-7]+$/)
    })

    it('should generate unique tokens', () => {
      const tokens = new Set<string>()
      for (let i = 0; i < 20; i++) {
        tokens.add(generateToken())
      }
      expect(tokens.size).toBe(20)
    })
  })

  describe('generateShortToken', () => {
    it('should generate a 32-character base32 token', () => {
      const token = generateShortToken()

      expect(token.length).toBe(32)
    })

    it('should only contain lowercase base32 characters', () => {
      const token = generateShortToken()

      expect(token).toMatch(/^[a-z2-7]+$/)
    })
  })

  describe('hashToken', () => {
    it('should return deterministic hex hash', () => {
      const hash1 = hashToken('test-token')
      const hash2 = hashToken('test-token')

      expect(hash1).toBe(hash2)
    })

    it('should return 64-character hex string (SHA-256)', () => {
      const hash = hashToken('test-token')

      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashToken('token-a')
      const hash2 = hashToken('token-b')

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('generateSessionId', () => {
    it('should generate a 32-character hex string', () => {
      const id = generateSessionId()

      expect(id).toHaveLength(32)
      expect(id).toMatch(/^[a-f0-9]{32}$/)
    })

    it('should generate unique IDs', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 20; i++) {
        ids.add(generateSessionId())
      }
      expect(ids.size).toBe(20)
    })
  })
})
