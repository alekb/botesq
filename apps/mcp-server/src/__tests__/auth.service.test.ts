import { describe, it, expect } from 'vitest'
import {
  hashPassword,
  verifyPassword,
  hashApiKey,
  generateApiKey,
} from '../services/auth.service.js'

describe('auth.service', () => {
  describe('hashPassword / verifyPassword', () => {
    it('should hash a password and verify it correctly', async () => {
      const password = 'SecureP@ssw0rd123!'
      const hash = await hashPassword(password)

      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.startsWith('$argon2id$')).toBe(true)

      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'CorrectPassword'
      const hash = await hashPassword(password)

      const isValid = await verifyPassword('WrongPassword', hash)
      expect(isValid).toBe(false)
    })

    it('should return false for invalid hash format', async () => {
      const isValid = await verifyPassword('password', 'not-a-valid-hash')
      expect(isValid).toBe(false)
    })

    it('should generate different hashes for same password (due to salt)', async () => {
      const password = 'SamePassword'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      expect(hash1).not.toBe(hash2)

      // But both should verify correctly
      expect(await verifyPassword(password, hash1)).toBe(true)
      expect(await verifyPassword(password, hash2)).toBe(true)
    })
  })

  describe('hashApiKey', () => {
    it('should hash an API key using SHA-256', () => {
      const key = 'be_testkey123'
      const hash = hashApiKey(key)

      expect(hash).toBeDefined()
      expect(hash).toHaveLength(64) // SHA-256 hex is 64 chars
    })

    it('should produce consistent hashes for same input', () => {
      const key = 'be_testkey123'
      const hash1 = hashApiKey(key)
      const hash2 = hashApiKey(key)

      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashApiKey('be_key1')
      const hash2 = hashApiKey('be_key2')

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('generateApiKey', () => {
    it('should generate API key with be_ prefix', () => {
      const { key, prefix, hash } = generateApiKey()

      expect(key.startsWith('be_')).toBe(true)
      expect(prefix).toBe(key.slice(0, 11))
      expect(hash).toHaveLength(64)
    })

    it('should generate unique keys', () => {
      const key1 = generateApiKey()
      const key2 = generateApiKey()

      expect(key1.key).not.toBe(key2.key)
      expect(key1.hash).not.toBe(key2.hash)
    })

    it('should generate keys that can be verified', () => {
      const { key, hash } = generateApiKey()
      const computedHash = hashApiKey(key)

      expect(computedHash).toBe(hash)
    })
  })
})
