import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PaymentError } from '../types.js'

const mocks = vi.hoisted(() => {
  const tx = {
    operator: {
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    creditTransaction: {
      create: vi.fn(),
    },
  }
  return { tx }
})

vi.mock('@botesq/database', () => ({
  prisma: {
    $transaction: (fn: (tx: unknown) => unknown) => fn(mocks.tx),
  },
}))

import { deductCredits, addCredits, refundCredits } from '../services/credit.service.js'

const OP = 'op_123'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('deductCredits', () => {
  it('guards the decrement with an atomic balance condition', async () => {
    mocks.tx.operator.updateMany.mockResolvedValue({ count: 1 })
    mocks.tx.operator.findUniqueOrThrow.mockResolvedValue({ creditBalance: 400 })
    mocks.tx.creditTransaction.create.mockResolvedValue({})

    await deductCredits(OP, 600, 'test')

    expect(mocks.tx.operator.updateMany).toHaveBeenCalledWith({
      where: { id: OP, creditBalance: { gte: 600 } },
      data: { creditBalance: { decrement: 600 } },
    })
  })

  it('returns the post-deduction balance and writes a consistent ledger row', async () => {
    mocks.tx.operator.updateMany.mockResolvedValue({ count: 1 })
    mocks.tx.operator.findUniqueOrThrow.mockResolvedValue({ creditBalance: 400 })
    mocks.tx.creditTransaction.create.mockResolvedValue({})

    const result = await deductCredits(OP, 600, 'test', 'legal_qa', 'ref_1')

    expect(result.newBalance).toBe(400)
    expect(mocks.tx.creditTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'DEDUCTION',
        amount: -600,
        balanceBefore: 1000,
        balanceAfter: 400,
        referenceType: 'legal_qa',
        referenceId: 'ref_1',
      }),
    })
  })

  it('throws INSUFFICIENT_CREDITS when the conditional update matches no row', async () => {
    mocks.tx.operator.updateMany.mockResolvedValue({ count: 0 })
    mocks.tx.operator.findUnique.mockResolvedValue({ id: OP })

    await expect(deductCredits(OP, 600, 'test')).rejects.toMatchObject({
      code: 'INSUFFICIENT_CREDITS',
    })
    expect(mocks.tx.creditTransaction.create).not.toHaveBeenCalled()
  })

  it('throws OPERATOR_NOT_FOUND when the operator does not exist', async () => {
    mocks.tx.operator.updateMany.mockResolvedValue({ count: 0 })
    mocks.tx.operator.findUnique.mockResolvedValue(null)

    await expect(deductCredits(OP, 600, 'test')).rejects.toMatchObject({
      code: 'OPERATOR_NOT_FOUND',
    })
  })

  it.each([[-5], [0], [1.5], [Number.NaN]])('rejects invalid amount %s', async (amount) => {
    await expect(deductCredits(OP, amount as number, 'test')).rejects.toBeInstanceOf(PaymentError)
    expect(mocks.tx.operator.updateMany).not.toHaveBeenCalled()
  })
})

describe('addCredits / refundCredits', () => {
  it('uses an atomic increment and records the correct ledger balances', async () => {
    mocks.tx.operator.updateMany.mockResolvedValue({ count: 1 })
    mocks.tx.operator.findUniqueOrThrow.mockResolvedValue({ creditBalance: 1500 })
    mocks.tx.creditTransaction.create.mockResolvedValue({})

    const result = await addCredits(OP, 500, 'purchase', 'payment', 'pay_1')

    expect(result.newBalance).toBe(1500)
    expect(mocks.tx.operator.updateMany).toHaveBeenCalledWith({
      where: { id: OP },
      data: { creditBalance: { increment: 500 } },
    })
    expect(mocks.tx.creditTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'PURCHASE',
        amount: 500,
        balanceBefore: 1000,
        balanceAfter: 1500,
      }),
    })
  })

  it('records refunds with the REFUND transaction type', async () => {
    mocks.tx.operator.updateMany.mockResolvedValue({ count: 1 })
    mocks.tx.operator.findUniqueOrThrow.mockResolvedValue({ creditBalance: 700 })
    mocks.tx.creditTransaction.create.mockResolvedValue({})

    await refundCredits(OP, 200, 'refund')

    expect(mocks.tx.creditTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'REFUND', amount: 200 }),
    })
  })

  it('throws OPERATOR_NOT_FOUND when the operator does not exist', async () => {
    mocks.tx.operator.updateMany.mockResolvedValue({ count: 0 })

    await expect(addCredits(OP, 500, 'purchase')).rejects.toMatchObject({
      code: 'OPERATOR_NOT_FOUND',
    })
  })
})
