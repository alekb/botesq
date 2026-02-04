import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { verifyProviderWebhook, generateWebhookSignature, WebhookError } from '../utils/webhook.js'

describe('webhook utilities', () => {
  const secret = 'test-webhook-secret'
  const payload = JSON.stringify({ event: 'test', data: { id: 123 } })

  describe('generateWebhookSignature', () => {
    it('should generate a valid signature', () => {
      const signature = generateWebhookSignature(payload, secret)

      expect(signature).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/)
    })

    it('should use provided timestamp', () => {
      const timestamp = 1700000000
      const signature = generateWebhookSignature(payload, secret, timestamp)

      expect(signature.startsWith(`t=${timestamp},`)).toBe(true)
    })

    it('should produce consistent signatures for same inputs', () => {
      const timestamp = 1700000000
      const sig1 = generateWebhookSignature(payload, secret, timestamp)
      const sig2 = generateWebhookSignature(payload, secret, timestamp)

      expect(sig1).toBe(sig2)
    })

    it('should handle Buffer payloads', () => {
      const bufferPayload = Buffer.from(payload)
      const timestamp = 1700000000

      const stringSig = generateWebhookSignature(payload, secret, timestamp)
      const bufferSig = generateWebhookSignature(bufferPayload, secret, timestamp)

      expect(stringSig).toBe(bufferSig)
    })
  })

  describe('verifyProviderWebhook', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should verify a valid signature', () => {
      const now = 1700000000000
      vi.setSystemTime(now)

      const timestamp = Math.floor(now / 1000)
      const signature = generateWebhookSignature(payload, secret, timestamp)

      const result = verifyProviderWebhook(payload, signature, secret)

      expect(result.verified).toBe(true)
      expect(result.timestamp).toBe(timestamp)
    })

    it('should reject invalid signature format', () => {
      expect(() => {
        verifyProviderWebhook(payload, 'invalid-format', secret)
      }).toThrow(WebhookError)
    })

    it('should reject missing timestamp', () => {
      expect(() => {
        verifyProviderWebhook(payload, 'v1=abc123', secret)
      }).toThrow(WebhookError)
    })

    it('should reject missing signature', () => {
      expect(() => {
        verifyProviderWebhook(payload, 't=1700000000', secret)
      }).toThrow(WebhookError)
    })

    it('should reject expired webhooks (too old)', () => {
      const now = 1700000000000
      vi.setSystemTime(now)

      // Timestamp from 10 minutes ago (beyond 5 min tolerance)
      const oldTimestamp = Math.floor(now / 1000) - 600
      const signature = generateWebhookSignature(payload, secret, oldTimestamp)

      expect(() => {
        verifyProviderWebhook(payload, signature, secret)
      }).toThrow('too old')
    })

    it('should reject webhooks from the future', () => {
      const now = 1700000000000
      vi.setSystemTime(now)

      // Timestamp from 10 minutes in the future
      const futureTimestamp = Math.floor(now / 1000) + 600
      const signature = generateWebhookSignature(payload, secret, futureTimestamp)

      expect(() => {
        verifyProviderWebhook(payload, signature, secret)
      }).toThrow('too far in the future')
    })

    it('should accept webhooks within tolerance window', () => {
      const now = 1700000000000
      vi.setSystemTime(now)

      // Timestamp from 4 minutes ago (within 5 min tolerance)
      const recentTimestamp = Math.floor(now / 1000) - 240
      const signature = generateWebhookSignature(payload, secret, recentTimestamp)

      const result = verifyProviderWebhook(payload, signature, secret)
      expect(result.verified).toBe(true)
    })

    it('should reject wrong secret', () => {
      const now = 1700000000000
      vi.setSystemTime(now)

      const timestamp = Math.floor(now / 1000)
      const signature = generateWebhookSignature(payload, secret, timestamp)

      expect(() => {
        verifyProviderWebhook(payload, signature, 'wrong-secret')
      }).toThrow('Invalid webhook signature')
    })

    it('should reject tampered payload', () => {
      const now = 1700000000000
      vi.setSystemTime(now)

      const timestamp = Math.floor(now / 1000)
      const signature = generateWebhookSignature(payload, secret, timestamp)
      const tamperedPayload = JSON.stringify({ event: 'tampered' })

      expect(() => {
        verifyProviderWebhook(tamperedPayload, signature, secret)
      }).toThrow('Invalid webhook signature')
    })
  })
})
