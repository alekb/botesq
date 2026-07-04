import { describe, it, expect } from 'vitest'
import {
  usdToCredits,
  creditsToUsd,
  CREDITS_PER_DOLLAR,
  MIN_PURCHASE_USD,
  MAX_PURCHASE_USD,
} from '../services/credit.service.js'

describe('credit.service', () => {
  describe('constants', () => {
    it('has correct credits per dollar rate', () => {
      expect(CREDITS_PER_DOLLAR).toBe(100)
    })

    it('has valid purchase limits', () => {
      expect(MIN_PURCHASE_USD).toBe(10)
      expect(MAX_PURCHASE_USD).toBe(10000)
      expect(MIN_PURCHASE_USD).toBeLessThan(MAX_PURCHASE_USD)
    })
  })

  describe('usdToCredits', () => {
    it('converts $1 to 100 credits', () => {
      expect(usdToCredits(1)).toBe(100)
    })

    it('converts $10 to 1000 credits', () => {
      expect(usdToCredits(10)).toBe(1000)
    })

    it('converts $0 to 0 credits', () => {
      expect(usdToCredits(0)).toBe(0)
    })

    it('rounds to the nearest credit (avoids float short-changing)', () => {
      // 29.99 * 100 is 2998.9999999999995 in float; must round to 2999, not 2998
      expect(usdToCredits(29.99)).toBe(2999)
      // 0.125 * 100 = 12.5 exactly; rounds up to 13
      expect(usdToCredits(0.125)).toBe(13)
    })

    it('handles decimal USD amounts', () => {
      expect(usdToCredits(0.5)).toBe(50)
      expect(usdToCredits(0.01)).toBe(1)
    })

    it('handles large amounts', () => {
      expect(usdToCredits(10000)).toBe(1000000)
    })
  })

  describe('creditsToUsd', () => {
    it('converts 100 credits to $1', () => {
      expect(creditsToUsd(100)).toBe(1)
    })

    it('converts 1000 credits to $10', () => {
      expect(creditsToUsd(1000)).toBe(10)
    })

    it('converts 0 credits to $0', () => {
      expect(creditsToUsd(0)).toBe(0)
    })

    it('handles fractional dollar results', () => {
      expect(creditsToUsd(50)).toBe(0.5)
      expect(creditsToUsd(1)).toBe(0.01)
    })

    it('handles large amounts', () => {
      expect(creditsToUsd(1000000)).toBe(10000)
    })
  })

  describe('usdToCredits and creditsToUsd inverse', () => {
    it('round-trips whole dollar amounts', () => {
      const usd = 100
      expect(creditsToUsd(usdToCredits(usd))).toBe(usd)
    })

    it('round-trips credit amounts', () => {
      const credits = 5000
      expect(usdToCredits(creditsToUsd(credits))).toBe(credits)
    })
  })
})
