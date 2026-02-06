import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
vi.mock('@botesq/database', async () => {
  const actual = await vi.importActual('@botesq/database')
  return {
    ...actual,
    prisma: {
      providerRequest: {
        groupBy: vi.fn(),
        findMany: vi.fn(),
      },
      providerSettlement: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        aggregate: vi.fn(),
      },
    },
  }
})

// Mock stripe-connect service
vi.mock('../services/stripe-connect.service.js', () => ({
  createTransfer: vi.fn(),
  creditsToUsdCents: vi.fn((credits: number) => credits),
}))

import { prisma } from '@botesq/database'
import { createTransfer } from '../services/stripe-connect.service.js'
import {
  generateMonthlySettlements,
  processSettlement,
  retryFailedSettlement,
  listSettlements,
  getSettlementById,
  getSettlementStats,
} from '../services/settlement.service'

describe('settlement.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateMonthlySettlements', () => {
    it('should group requests by provider', async () => {
      vi.mocked(prisma.providerRequest.groupBy).mockResolvedValue([
        { providerId: 'prov_1' },
        { providerId: 'prov_2' },
      ] as never)
      vi.mocked(prisma.providerSettlement.findMany).mockResolvedValue([])
      vi.mocked(prisma.providerRequest.findMany).mockResolvedValue([
        { id: 'req_1', creditsCharged: 5000, providerEarnings: 3500 },
      ] as never)
      vi.mocked(prisma.providerSettlement.create).mockResolvedValue({} as never)

      const result = await generateMonthlySettlements(2025, 1)

      expect(result.generated).toBe(2)
      expect(result.skipped).toBe(0)
    })

    it('should skip providers with existing settlements', async () => {
      vi.mocked(prisma.providerRequest.groupBy).mockResolvedValue([
        { providerId: 'prov_1' },
        { providerId: 'prov_2' },
      ] as never)
      vi.mocked(prisma.providerSettlement.findMany).mockResolvedValue([
        { providerId: 'prov_1' },
      ] as never)
      vi.mocked(prisma.providerRequest.findMany).mockResolvedValue([
        { id: 'req_1', creditsCharged: 5000, providerEarnings: 3500 },
      ] as never)
      vi.mocked(prisma.providerSettlement.create).mockResolvedValue({} as never)

      const result = await generateMonthlySettlements(2025, 1)

      expect(result.generated).toBe(1)
      expect(result.skipped).toBe(1)
    })

    it('should continue processing when one provider fails', async () => {
      vi.mocked(prisma.providerRequest.groupBy).mockResolvedValue([
        { providerId: 'prov_1' },
        { providerId: 'prov_2' },
      ] as never)
      vi.mocked(prisma.providerSettlement.findMany).mockResolvedValue([])
      vi.mocked(prisma.providerRequest.findMany)
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce([
          { id: 'req_1', creditsCharged: 5000, providerEarnings: 3500 },
        ] as never)
      vi.mocked(prisma.providerSettlement.create).mockResolvedValue({} as never)

      const result = await generateMonthlySettlements(2025, 1)

      expect(result.generated).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.providerId).toBe('prov_1')
    })
  })

  describe('processSettlement', () => {
    const mockSettlement = {
      id: 'settle_123',
      providerId: 'prov_123',
      providerShare: 5000,
      periodStart: new Date('2025-01-01'),
      periodEnd: new Date('2025-02-01'),
      status: 'PENDING',
      provider: {
        id: 'prov_123',
        name: 'Test Provider',
        email: 'test@provider.com',
        stripeConnectId: 'acct_test123',
        status: 'ACTIVE',
      },
    }

    it('should return error when settlement not found', async () => {
      vi.mocked(prisma.providerSettlement.findUnique).mockResolvedValue(null)

      const result = await processSettlement('nonexistent')

      expect(result).toEqual({ success: false, error: 'Settlement not found' })
    })

    it('should reject non-PENDING settlements', async () => {
      vi.mocked(prisma.providerSettlement.findUnique).mockResolvedValue({
        ...mockSettlement,
        status: 'PAID',
      } as never)

      const result = await processSettlement('settle_123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('already paid')
    })

    it('should reject when provider has no Stripe Connect', async () => {
      vi.mocked(prisma.providerSettlement.findUnique).mockResolvedValue({
        ...mockSettlement,
        provider: { ...mockSettlement.provider, stripeConnectId: null },
      } as never)

      const result = await processSettlement('settle_123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Stripe Connect')
    })

    it('should reject when provider is not active', async () => {
      vi.mocked(prisma.providerSettlement.findUnique).mockResolvedValue({
        ...mockSettlement,
        provider: { ...mockSettlement.provider, status: 'SUSPENDED' },
      } as never)

      const result = await processSettlement('settle_123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not active')
    })

    it('should create Stripe transfer and mark as PAID on success', async () => {
      vi.mocked(prisma.providerSettlement.findUnique).mockResolvedValue(mockSettlement as never)
      vi.mocked(prisma.providerSettlement.update).mockResolvedValue({} as never)
      vi.mocked(createTransfer).mockResolvedValue({ transferId: 'tr_test123' })

      const result = await processSettlement('settle_123')

      expect(result).toEqual({ success: true, transferId: 'tr_test123' })
      expect(prisma.providerSettlement.update).toHaveBeenCalledWith({
        where: { id: 'settle_123' },
        data: {
          status: 'PAID',
          stripeTransferId: 'tr_test123',
          paidAt: expect.any(Date),
        },
      })
    })

    it('should mark as FAILED when Stripe transfer fails', async () => {
      vi.mocked(prisma.providerSettlement.findUnique).mockResolvedValue(mockSettlement as never)
      vi.mocked(prisma.providerSettlement.update).mockResolvedValue({} as never)
      vi.mocked(createTransfer).mockRejectedValue(new Error('Insufficient balance'))

      const result = await processSettlement('settle_123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Insufficient balance')
      expect(prisma.providerSettlement.update).toHaveBeenCalledWith({
        where: { id: 'settle_123' },
        data: { status: 'FAILED' },
      })
    })
  })

  describe('retryFailedSettlement', () => {
    it('should return error when settlement not found', async () => {
      vi.mocked(prisma.providerSettlement.findUnique).mockResolvedValue(null)

      const result = await retryFailedSettlement('nonexistent')

      expect(result).toEqual({ success: false, error: 'Settlement not found' })
    })

    it('should only retry FAILED settlements', async () => {
      vi.mocked(prisma.providerSettlement.findUnique).mockResolvedValue({
        id: 'settle_123',
        status: 'PAID',
      } as never)

      const result = await retryFailedSettlement('settle_123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Only failed settlements')
    })

    it('should reset to PENDING and reprocess', async () => {
      // First call for retryFailedSettlement
      vi.mocked(prisma.providerSettlement.findUnique)
        .mockResolvedValueOnce({
          id: 'settle_123',
          status: 'FAILED',
        } as never)
        // Second call for processSettlement
        .mockResolvedValueOnce({
          id: 'settle_123',
          status: 'PENDING',
          providerId: 'prov_123',
          providerShare: 5000,
          periodStart: new Date(),
          periodEnd: new Date(),
          provider: {
            id: 'prov_123',
            name: 'Test',
            email: 'test@test.com',
            stripeConnectId: 'acct_test',
            status: 'ACTIVE',
          },
        } as never)
      vi.mocked(prisma.providerSettlement.update).mockResolvedValue({} as never)
      vi.mocked(createTransfer).mockResolvedValue({ transferId: 'tr_retry123' })

      const result = await retryFailedSettlement('settle_123')

      expect(prisma.providerSettlement.update).toHaveBeenCalledWith({
        where: { id: 'settle_123' },
        data: { status: 'PENDING' },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('listSettlements', () => {
    it('should return paginated settlements with total', async () => {
      const mockSettlements = [
        {
          id: 'settle_1',
          providerId: 'prov_1',
          periodStart: new Date(),
          periodEnd: new Date(),
          totalRequests: 10,
          totalCredits: 50000,
          providerShare: 35000,
          platformShare: 15000,
          status: 'PAID',
          stripeTransferId: 'tr_1',
          paidAt: new Date(),
          createdAt: new Date(),
          provider: {
            id: 'prov_1',
            name: 'Provider 1',
            email: 'p1@test.com',
            stripeConnectId: 'acct_1',
          },
        },
      ]
      vi.mocked(prisma.providerSettlement.findMany).mockResolvedValue(mockSettlements as never)
      vi.mocked(prisma.providerSettlement.count).mockResolvedValue(1)

      const result = await listSettlements({ limit: 10, offset: 0 })

      expect(result.settlements).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should apply filters', async () => {
      vi.mocked(prisma.providerSettlement.findMany).mockResolvedValue([])
      vi.mocked(prisma.providerSettlement.count).mockResolvedValue(0)

      await listSettlements({ providerId: 'prov_1', status: 'PENDING' as never })

      expect(prisma.providerSettlement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            providerId: 'prov_1',
            status: 'PENDING',
          }),
        })
      )
    })
  })

  describe('getSettlementById', () => {
    it('should return null when not found', async () => {
      vi.mocked(prisma.providerSettlement.findUnique).mockResolvedValue(null)

      const result = await getSettlementById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getSettlementStats', () => {
    it('should aggregate stats across statuses', async () => {
      vi.mocked(prisma.providerSettlement.aggregate)
        .mockResolvedValueOnce({
          _count: 5,
          _sum: { providerShare: 25000 },
        } as never) // pending
        .mockResolvedValueOnce({
          _count: 20,
          _sum: { providerShare: 100000 },
        } as never) // paid
      vi.mocked(prisma.providerSettlement.count).mockResolvedValue(2)

      const result = await getSettlementStats()

      expect(result).toEqual({
        totalPending: 5,
        totalPendingAmount: 25000,
        totalPaid: 20,
        totalPaidAmount: 100000,
        totalFailed: 2,
      })
    })

    it('should handle null sums', async () => {
      vi.mocked(prisma.providerSettlement.aggregate)
        .mockResolvedValueOnce({
          _count: 0,
          _sum: { providerShare: null },
        } as never)
        .mockResolvedValueOnce({
          _count: 0,
          _sum: { providerShare: null },
        } as never)
      vi.mocked(prisma.providerSettlement.count).mockResolvedValue(0)

      const result = await getSettlementStats()

      expect(result).toEqual({
        totalPending: 0,
        totalPendingAmount: 0,
        totalPaid: 0,
        totalPaidAmount: 0,
        totalFailed: 0,
      })
    })
  })
})
