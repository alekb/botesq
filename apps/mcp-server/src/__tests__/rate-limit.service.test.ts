import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock config before importing the service
vi.mock('../config.js', () => ({
  config: {
    rateLimit: {
      requestsPerMinute: 5,
      requestsPerHour: 20,
    },
  },
}))

// Import after mocking
import {
  checkRateLimit,
  getRateLimitStatus,
  cleanupRateLimits,
} from '../services/rate-limit.service.js'
import { RateLimitError } from '../types.js'

describe('rate-limit.service', () => {
  beforeEach(() => {
    // Clean up rate limits before each test
    cleanupRateLimits()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('checkRateLimit', () => {
    it('should allow first request', () => {
      expect(() => checkRateLimit('session-1')).not.toThrow()
    })

    it('should allow requests within minute limit', () => {
      for (let i = 0; i < 5; i++) {
        expect(() => checkRateLimit('session-2')).not.toThrow()
      }
    })

    it('should throw RateLimitError when minute limit exceeded', () => {
      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        checkRateLimit('session-3')
      }

      // 6th request should fail
      expect(() => checkRateLimit('session-3')).toThrow(RateLimitError)
    })

    it('should include retryAfter in RateLimitError', () => {
      // Exhaust the minute limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit('session-4')
      }

      try {
        checkRateLimit('session-4')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError)
        const rateLimitError = error as RateLimitError
        const details = rateLimitError.details as { retry_after_seconds: number }
        expect(details.retry_after_seconds).toBeGreaterThan(0)
        expect(details.retry_after_seconds).toBeLessThanOrEqual(60)
      }
    })

    it('should reset minute window after 60 seconds', () => {
      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit('session-5')
      }

      expect(() => checkRateLimit('session-5')).toThrow(RateLimitError)

      // Advance time by 60 seconds
      vi.advanceTimersByTime(60001)

      // Should be able to make requests again
      expect(() => checkRateLimit('session-5')).not.toThrow()
    })

    it('should track different sessions independently', () => {
      // Exhaust limit for session-a
      for (let i = 0; i < 5; i++) {
        checkRateLimit('session-a')
      }

      // session-b should still be allowed
      expect(() => checkRateLimit('session-b')).not.toThrow()

      // session-a should be blocked
      expect(() => checkRateLimit('session-a')).toThrow(RateLimitError)
    })

    it('should throw RateLimitError when hour limit exceeded', () => {
      // Make requests over time to avoid minute limit
      for (let i = 0; i < 20; i++) {
        checkRateLimit('session-6')
        // Advance time to reset minute window (but stay within hour)
        vi.advanceTimersByTime(61000)
      }

      // 21st request should fail due to hour limit
      expect(() => checkRateLimit('session-6')).toThrow(RateLimitError)
    })

    it('should reset hour window after 1 hour', () => {
      // Exhaust hour limit
      for (let i = 0; i < 20; i++) {
        checkRateLimit('session-7')
        vi.advanceTimersByTime(61000) // Advance past minute window
      }

      expect(() => checkRateLimit('session-7')).toThrow(RateLimitError)

      // Advance time by remaining hour (we've advanced ~20 minutes)
      vi.advanceTimersByTime(3600001 - 20 * 61000)

      // Should be able to make requests again
      expect(() => checkRateLimit('session-7')).not.toThrow()
    })
  })

  describe('getRateLimitStatus', () => {
    it('should return full limits for new session', () => {
      const status = getRateLimitStatus('new-session')

      expect(status.minute.remaining).toBe(5)
      expect(status.hour.remaining).toBe(20)
    })

    it('should return correct remaining after requests', () => {
      checkRateLimit('session-status')
      checkRateLimit('session-status')

      const status = getRateLimitStatus('session-status')

      expect(status.minute.remaining).toBe(3)
      expect(status.hour.remaining).toBe(18)
    })

    it('should return 0 remaining when limit exhausted', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('session-exhausted')
      }

      const status = getRateLimitStatus('session-exhausted')

      expect(status.minute.remaining).toBe(0)
    })

    it('should include resetAt timestamps', () => {
      const now = Date.now()
      checkRateLimit('session-reset')

      const status = getRateLimitStatus('session-reset')

      expect(status.minute.resetAt).toBeGreaterThan(now)
      expect(status.minute.resetAt).toBeLessThanOrEqual(now + 60000)
      expect(status.hour.resetAt).toBeGreaterThan(now)
      expect(status.hour.resetAt).toBeLessThanOrEqual(now + 3600000)
    })

    it('should reset remaining after window expires', () => {
      // Make some requests
      checkRateLimit('session-window')
      checkRateLimit('session-window')

      let status = getRateLimitStatus('session-window')
      expect(status.minute.remaining).toBe(3)

      // Advance past minute window
      vi.advanceTimersByTime(60001)

      status = getRateLimitStatus('session-window')
      expect(status.minute.remaining).toBe(5)
    })
  })

  describe('cleanupRateLimits', () => {
    it('should remove expired entries', () => {
      // Create some entries
      checkRateLimit('cleanup-test-1')
      checkRateLimit('cleanup-test-2')

      // Advance time past minute window
      vi.advanceTimersByTime(60001)

      // Cleanup should remove expired entries
      cleanupRateLimits()

      // New requests should work without accumulated history
      const status = getRateLimitStatus('cleanup-test-1')
      expect(status.minute.remaining).toBe(5)
    })

    it('should not remove entries still within window', () => {
      checkRateLimit('cleanup-active')
      checkRateLimit('cleanup-active')

      // Advance time but stay within window
      vi.advanceTimersByTime(30000)

      cleanupRateLimits()

      // Should still have counted requests
      const status = getRateLimitStatus('cleanup-active')
      expect(status.minute.remaining).toBe(3)
    })
  })

  describe('edge cases', () => {
    it('should handle rapid sequential requests', () => {
      // Simulate rapid requests
      for (let i = 0; i < 4; i++) {
        checkRateLimit('rapid-session')
      }

      // Should still allow one more
      expect(() => checkRateLimit('rapid-session')).not.toThrow()

      // But not another
      expect(() => checkRateLimit('rapid-session')).toThrow(RateLimitError)
    })

    it('should handle empty session token', () => {
      // Should still work with empty string (though not recommended)
      expect(() => checkRateLimit('')).not.toThrow()
    })

    it('should handle special characters in session token', () => {
      const specialToken = 'sess_abc123!@#$%^&*()'
      expect(() => checkRateLimit(specialToken)).not.toThrow()
    })
  })
})
