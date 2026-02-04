import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma for transactional functions
vi.mock('@botesq/database', () => ({
  prisma: {
    operator: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '@botesq/database'
import {
  usdToCredits,
  creditsToUsd,
  addCredits,
  deductCredits,
  refundCredits,
  hasCredits,
  CREDITS_PER_DOLLAR,
  MIN_PURCHASE_USD,
  MAX_PURCHASE_USD,
} from '../services/credit.service.js'
import { PaymentError } from '../types.js'

describe('credit.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
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

    it('floors fractional credits', () => {
      // $1.005 = 100.5 credits -> floors to 100
      expect(usdToCredits(1.005)).toBe(100)
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

  describe('addCredits', () => {
    it('should add credits to operator balance', async () => {
      const mockTx = {
        operator: {
          findUnique: vi.fn().mockResolvedValue({ creditBalance: 5000 }),
          update: vi.fn().mockResolvedValue({ creditBalance: 6000 }),
        },
        creditTransaction: {
          create: vi.fn().mockResolvedValue({}),
        },
      }
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return callback(mockTx as never)
      })

      const result = await addCredits('op_123', 1000, 'Test credit', 'payment', 'pay_123')

      expect(result.newBalance).toBe(6000)
    })

    it('should create transaction record with correct values', async () => {
      const mockTx = {
        operator: {
          findUnique: vi.fn().mockResolvedValue({ creditBalance: 5000 }),
          update: vi.fn().mockResolvedValue({ creditBalance: 6000 }),
        },
        creditTransaction: {
          create: vi.fn().mockResolvedValue({}),
        },
      }
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return callback(mockTx as never)
      })

      await addCredits('op_123', 1000, 'Test credit', 'payment', 'pay_123')

      expect(mockTx.creditTransaction.create).toHaveBeenCalledWith({
        data: {
          operatorId: 'op_123',
          type: 'PURCHASE',
          amount: 1000,
          balanceBefore: 5000,
          balanceAfter: 6000,
          description: 'Test credit',
          referenceType: 'payment',
          referenceId: 'pay_123',
        },
      })
    })

    it('should throw PaymentError if operator not found', async () => {
      const mockTx = {
        operator: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      }
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return callback(mockTx as never)
      })

      await expect(addCredits('nonexistent', 1000, 'Test')).rejects.toThrow(PaymentError)
      await expect(addCredits('nonexistent', 1000, 'Test')).rejects.toThrow('Operator not found')
    })

    it('should use atomic transaction for balance update', async () => {
      const mockTx = {
        operator: {
          findUnique: vi.fn().mockResolvedValue({ creditBalance: 5000 }),
          update: vi.fn().mockResolvedValue({ creditBalance: 6000 }),
        },
        creditTransaction: {
          create: vi.fn().mockResolvedValue({}),
        },
      }
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return callback(mockTx as never)
      })

      await addCredits('op_123', 1000, 'Test')

      expect(prisma.$transaction).toHaveBeenCalled()
    })
  })

  describe('deductCredits', () => {
    it('should deduct credits from operator balance', async () => {
      const mockTx = {
        operator: {
          findUnique: vi.fn().mockResolvedValue({ creditBalance: 5000 }),
          update: vi.fn().mockResolvedValue({ creditBalance: 4000 }),
        },
        creditTransaction: {
          create: vi.fn().mockResolvedValue({}),
        },
      }
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return callback(mockTx as never)
      })

      const result = await deductCredits('op_123', 1000, 'Service usage')

      expect(result.newBalance).toBe(4000)
    })

    it('should throw PaymentError for insufficient credits', async () => {
      const mockTx = {
        operator: {
          findUnique: vi.fn().mockResolvedValue({ creditBalance: 500 }),
        },
      }
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return callback(mockTx as never)
      })

      await expect(deductCredits('op_123', 1000, 'Service usage')).rejects.toThrow(PaymentError)
      await expect(deductCredits('op_123', 1000, 'Service usage')).rejects.toThrow(
        'Not enough credits'
      )
    })

    it('should create transaction record with negative amount', async () => {
      const mockTx = {
        operator: {
          findUnique: vi.fn().mockResolvedValue({ creditBalance: 5000 }),
          update: vi.fn().mockResolvedValue({ creditBalance: 4000 }),
        },
        creditTransaction: {
          create: vi.fn().mockResolvedValue({}),
        },
      }
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return callback(mockTx as never)
      })

      await deductCredits('op_123', 1000, 'Service usage', 'legal_question', 'lq_123')

      expect(mockTx.creditTransaction.create).toHaveBeenCalledWith({
        data: {
          operatorId: 'op_123',
          type: 'DEDUCTION',
          amount: -1000, // Negative for deduction
          balanceBefore: 5000,
          balanceAfter: 4000,
          description: 'Service usage',
          referenceType: 'legal_question',
          referenceId: 'lq_123',
        },
      })
    })

    it('should throw PaymentError if operator not found', async () => {
      const mockTx = {
        operator: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      }
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return callback(mockTx as never)
      })

      await expect(deductCredits('nonexistent', 1000, 'Test')).rejects.toThrow(PaymentError)
    })

    it('should allow deduction when balance equals amount', async () => {
      const mockTx = {
        operator: {
          findUnique: vi.fn().mockResolvedValue({ creditBalance: 1000 }),
          update: vi.fn().mockResolvedValue({ creditBalance: 0 }),
        },
        creditTransaction: {
          create: vi.fn().mockResolvedValue({}),
        },
      }
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return callback(mockTx as never)
      })

      const result = await deductCredits('op_123', 1000, 'Full deduction')

      expect(result.newBalance).toBe(0)
    })
  })

  describe('refundCredits', () => {
    it('should refund credits to operator balance', async () => {
      const mockTx = {
        operator: {
          findUnique: vi.fn().mockResolvedValue({ creditBalance: 5000 }),
          update: vi.fn().mockResolvedValue({ creditBalance: 6000 }),
        },
        creditTransaction: {
          create: vi.fn().mockResolvedValue({}),
        },
      }
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return callback(mockTx as never)
      })

      const result = await refundCredits('op_123', 1000, 'Service failure refund')

      expect(result.newBalance).toBe(6000)
    })

    it('should create transaction record with REFUND type', async () => {
      const mockTx = {
        operator: {
          findUnique: vi.fn().mockResolvedValue({ creditBalance: 5000 }),
          update: vi.fn().mockResolvedValue({ creditBalance: 6000 }),
        },
        creditTransaction: {
          create: vi.fn().mockResolvedValue({}),
        },
      }
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return callback(mockTx as never)
      })

      await refundCredits('op_123', 1000, 'Refund', 'legal_question', 'lq_123')

      expect(mockTx.creditTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'REFUND',
          amount: 1000, // Positive for refund
        }),
      })
    })

    it('should throw PaymentError if operator not found', async () => {
      const mockTx = {
        operator: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      }
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return callback(mockTx as never)
      })

      await expect(refundCredits('nonexistent', 1000, 'Test')).rejects.toThrow(PaymentError)
    })
  })

  describe('hasCredits', () => {
    it('should return true when balance is sufficient', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({ creditBalance: 5000 } as never)

      const result = await hasCredits('op_123', 1000)

      expect(result).toBe(true)
    })

    it('should return false when balance is insufficient', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({ creditBalance: 500 } as never)

      const result = await hasCredits('op_123', 1000)

      expect(result).toBe(false)
    })

    it('should return true when balance equals required amount', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({ creditBalance: 1000 } as never)

      const result = await hasCredits('op_123', 1000)

      expect(result).toBe(true)
    })

    it('should return false for non-existent operator', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue(null)

      const result = await hasCredits('nonexistent', 1000)

      expect(result).toBe(false)
    })

    it('should return true for zero amount check', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({ creditBalance: 0 } as never)

      const result = await hasCredits('op_123', 0)

      expect(result).toBe(true)
    })
  })
})
