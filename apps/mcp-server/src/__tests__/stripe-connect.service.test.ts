import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock config
vi.mock('../config.js', () => ({
  config: {
    stripe: {
      secretKey: 'sk_test_123',
    },
  },
}))

// Mock Stripe
const mockStripeAccounts = {
  retrieve: vi.fn(),
}
const mockStripeTransfers = {
  create: vi.fn(),
  retrieve: vi.fn(),
}

vi.mock('stripe', () => {
  const MockStripe = vi.fn(() => ({
    accounts: mockStripeAccounts,
    transfers: mockStripeTransfers,
  }))
  MockStripe.errors = { StripeError: class StripeError extends Error {} }
  return { default: MockStripe }
})

import {
  creditsToUsdCents,
  usdCentsToCredits,
  getConnectAccountStatus,
  createTransfer,
  getTransfer,
  isStripeConnectConfigured,
} from '../services/stripe-connect.service'

describe('stripe-connect.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('creditsToUsdCents', () => {
    it('should convert credits to USD cents (1:1)', () => {
      expect(creditsToUsdCents(100)).toBe(100)
      expect(creditsToUsdCents(5000)).toBe(5000)
    })

    it('should handle zero', () => {
      expect(creditsToUsdCents(0)).toBe(0)
    })
  })

  describe('usdCentsToCredits', () => {
    it('should convert USD cents to credits (1:1)', () => {
      expect(usdCentsToCredits(100)).toBe(100)
      expect(usdCentsToCredits(5000)).toBe(5000)
    })

    it('should handle zero', () => {
      expect(usdCentsToCredits(0)).toBe(0)
    })
  })

  describe('isStripeConnectConfigured', () => {
    it('should return true when secret key is set', () => {
      expect(isStripeConnectConfigured()).toBe(true)
    })
  })

  describe('getConnectAccountStatus', () => {
    it('should return account status', async () => {
      mockStripeAccounts.retrieve.mockResolvedValue({
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      })

      const result = await getConnectAccountStatus('acct_test123')

      expect(result).toEqual({
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
      })
      expect(mockStripeAccounts.retrieve).toHaveBeenCalledWith('acct_test123')
    })

    it('should handle null values from Stripe', async () => {
      mockStripeAccounts.retrieve.mockResolvedValue({
        charges_enabled: undefined,
        payouts_enabled: undefined,
        details_submitted: undefined,
      })

      const result = await getConnectAccountStatus('acct_test123')

      expect(result).toEqual({
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      })
    })

    it('should throw PaymentError on Stripe error', async () => {
      mockStripeAccounts.retrieve.mockRejectedValue(new Error('Account not found'))

      await expect(getConnectAccountStatus('acct_invalid')).rejects.toThrow(
        'Failed to retrieve Connect account status'
      )
    })
  })

  describe('createTransfer', () => {
    const metadata = {
      settlementId: 'settle_123',
      providerId: 'prov_123',
      periodStart: '2025-01-01',
      periodEnd: '2025-02-01',
    }

    it('should reject non-positive amounts', async () => {
      await expect(createTransfer('acct_test', 0, metadata)).rejects.toThrow(
        'Transfer amount must be positive'
      )
      await expect(createTransfer('acct_test', -100, metadata)).rejects.toThrow(
        'Transfer amount must be positive'
      )
    })

    it('should reject when payouts not enabled', async () => {
      mockStripeAccounts.retrieve.mockResolvedValue({
        charges_enabled: true,
        payouts_enabled: false,
        details_submitted: true,
      })

      await expect(createTransfer('acct_test', 5000, metadata)).rejects.toThrow('payouts enabled')
    })

    it('should create transfer successfully', async () => {
      mockStripeAccounts.retrieve.mockResolvedValue({
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      })
      mockStripeTransfers.create.mockResolvedValue({ id: 'tr_test123' })

      const result = await createTransfer('acct_test', 5000, metadata)

      expect(result).toEqual({ transferId: 'tr_test123' })
      expect(mockStripeTransfers.create).toHaveBeenCalledWith({
        amount: 5000,
        currency: 'usd',
        destination: 'acct_test',
        metadata: {
          settlement_id: 'settle_123',
          provider_id: 'prov_123',
          period_start: '2025-01-01',
          period_end: '2025-02-01',
        },
      })
    })

    it('should throw PaymentError on Stripe transfer error', async () => {
      mockStripeAccounts.retrieve.mockResolvedValue({
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      })
      mockStripeTransfers.create.mockRejectedValue(new Error('Insufficient funds'))

      await expect(createTransfer('acct_test', 5000, metadata)).rejects.toThrow(
        'Failed to create transfer'
      )
    })
  })

  describe('getTransfer', () => {
    it('should return transfer details', async () => {
      mockStripeTransfers.retrieve.mockResolvedValue({
        id: 'tr_test123',
        amount: 5000,
        currency: 'usd',
        destination: 'acct_test',
        created: 1705363200, // 2025-01-16T00:00:00Z
        reversed: false,
      })

      const result = await getTransfer('tr_test123')

      expect(result).toEqual({
        id: 'tr_test123',
        amount: 5000,
        currency: 'usd',
        destination: 'acct_test',
        created: expect.any(Date),
        reversed: false,
      })
    })

    it('should throw PaymentError when transfer not found', async () => {
      mockStripeTransfers.retrieve.mockRejectedValue(new Error('Not found'))

      await expect(getTransfer('tr_nonexistent')).rejects.toThrow('Failed to retrieve transfer')
    })
  })
})
