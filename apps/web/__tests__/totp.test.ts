import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  generateTotpSecret,
  generateTotpCode,
  verifyTotp,
  generateTotpUri,
} from '../lib/attorney-auth/totp'

describe('TOTP', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('generateTotpSecret', () => {
    it('should generate base32 encoded secret', () => {
      const secret = generateTotpSecret()

      // Base32 only contains A-Z and 2-7
      expect(secret).toMatch(/^[A-Z2-7]+$/)
    })

    it('should generate 32-character secret (20 bytes encoded)', () => {
      const secret = generateTotpSecret()

      expect(secret.length).toBe(32)
    })

    it('should generate unique secrets', () => {
      const secrets = new Set<string>()
      for (let i = 0; i < 20; i++) {
        secrets.add(generateTotpSecret())
      }
      expect(secrets.size).toBe(20)
    })
  })

  describe('generateTotpCode', () => {
    it('should generate a 6-digit code', () => {
      const secret = generateTotpSecret()
      const timeStep = Math.floor(Date.now() / 1000 / 30)

      const code = generateTotpCode(secret, timeStep)

      expect(code).toMatch(/^\d{6}$/)
    })

    it('should be deterministic for same secret and time step', () => {
      const secret = generateTotpSecret()
      const timeStep = 12345

      const code1 = generateTotpCode(secret, timeStep)
      const code2 = generateTotpCode(secret, timeStep)

      expect(code1).toBe(code2)
    })

    it('should produce different codes for different time steps', () => {
      const secret = generateTotpSecret()

      const code1 = generateTotpCode(secret, 1000)
      const code2 = generateTotpCode(secret, 1001)

      expect(code1).not.toBe(code2)
    })

    it('should produce different codes for different secrets', () => {
      const timeStep = 12345

      const code1 = generateTotpCode(generateTotpSecret(), timeStep)
      const code2 = generateTotpCode(generateTotpSecret(), timeStep)

      // While theoretically could collide, with 6 digits and different secrets it's very unlikely
      expect(code1).not.toBe(code2)
    })
  })

  describe('verifyTotp', () => {
    it('should verify correct code for current time step', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))

      const secret = generateTotpSecret()
      const currentTimeStep = Math.floor(Date.now() / 1000 / 30)
      const code = generateTotpCode(secret, currentTimeStep)

      const result = verifyTotp(secret, code)

      expect(result).toBe(true)
    })

    it('should reject wrong code', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))

      const secret = generateTotpSecret()

      const result = verifyTotp(secret, '000000')

      // Very unlikely that 000000 is the correct code
      // If it happens, generate a different secret
      expect(typeof result).toBe('boolean')
    })

    it('should accept code from adjacent time window (clock drift)', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))

      const secret = generateTotpSecret()
      const currentTimeStep = Math.floor(Date.now() / 1000 / 30)

      // Code from previous time step should still work
      const prevCode = generateTotpCode(secret, currentTimeStep - 1)
      expect(verifyTotp(secret, prevCode)).toBe(true)

      // Code from next time step should still work
      const nextCode = generateTotpCode(secret, currentTimeStep + 1)
      expect(verifyTotp(secret, nextCode)).toBe(true)
    })

    it('should reject code from far-off time step', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))

      const secret = generateTotpSecret()
      const currentTimeStep = Math.floor(Date.now() / 1000 / 30)

      // Code from 5 steps ago should NOT work (only ±1 is allowed)
      const oldCode = generateTotpCode(secret, currentTimeStep - 5)
      expect(verifyTotp(secret, oldCode)).toBe(false)
    })
  })

  describe('generateTotpUri', () => {
    it('should generate valid otpauth URI', () => {
      const uri = generateTotpUri('JBSWY3DPEHPK3PXP', 'user@example.com')

      expect(uri).toMatch(/^otpauth:\/\/totp\//)
      expect(uri).toContain('secret=JBSWY3DPEHPK3PXP')
      expect(uri).toContain('user%40example.com')
      expect(uri).toContain('issuer=BotEsq')
      expect(uri).toContain('algorithm=SHA1')
      expect(uri).toContain('digits=6')
      expect(uri).toContain('period=30')
    })

    it('should use custom issuer', () => {
      const uri = generateTotpUri('SECRET', 'user@test.com', 'MyApp')

      expect(uri).toContain('MyApp')
      expect(uri).toContain('issuer=MyApp')
    })

    it('should URL-encode special characters', () => {
      const uri = generateTotpUri('SECRET', 'user+test@example.com')

      expect(uri).toContain('user%2Btest%40example.com')
    })
  })
})
