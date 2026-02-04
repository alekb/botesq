import { describe, it, expect } from 'vitest'
import { generateSigningUrl } from '../services/retainer.service.js'

describe('retainer.service', () => {
  describe('generateSigningUrl', () => {
    it('should generate URL with retainer ID', () => {
      const url = generateSigningUrl('RET-ABC12345')

      expect(url).toBe('https://botesq.io/sign/RET-ABC12345')
    })

    it('should include base domain', () => {
      const url = generateSigningUrl('test-id')

      expect(url).toContain('botesq.io')
    })

    it('should use https protocol', () => {
      const url = generateSigningUrl('test-id')

      expect(url.startsWith('https://')).toBe(true)
    })

    it('should append retainer ID to path', () => {
      const url = generateSigningUrl('my-retainer')

      expect(url.endsWith('/my-retainer')).toBe(true)
    })

    it('should handle various retainer ID formats', () => {
      // Standard format
      expect(generateSigningUrl('RET-12345678')).toContain('RET-12345678')

      // UUID format
      expect(generateSigningUrl('550e8400-e29b-41d4-a716-446655440000')).toContain(
        '550e8400-e29b-41d4-a716-446655440000'
      )

      // Short ID
      expect(generateSigningUrl('abc')).toContain('abc')
    })

    it('should handle empty string', () => {
      const url = generateSigningUrl('')

      expect(url).toBe('https://botesq.io/sign/')
    })

    it('should not URL encode the retainer ID', () => {
      // The function currently doesn't URL encode, which may be intentional
      // for readability or may need to be addressed
      const url = generateSigningUrl('RET-TEST')

      expect(url).toBe('https://botesq.io/sign/RET-TEST')
    })
  })
})
