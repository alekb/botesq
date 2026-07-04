import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Stripe from 'stripe'

const mocks = vi.hoisted(() => {
  const tx = {
    payment: { updateMany: vi.fn() },
    operator: { updateMany: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
    creditTransaction: { create: vi.fn() },
  }
  const prisma = {
    payment: { findUnique: vi.fn() },
    $transaction: (fn: (t: unknown) => unknown) => fn(tx),
  }
  return { tx, prisma }
})

vi.mock('@botesq/database', () => ({ prisma: mocks.prisma }))

import { handleCheckoutCompleted } from '../services/stripe.service.js'

const PAYMENT = {
  id: 'pay_1',
  operatorId: 'op_1',
  credits: 5000,
  amountCents: 5000,
  status: 'PENDING',
}

function checkoutSession(overrides: Record<string, unknown> = {}): Stripe.Checkout.Session {
  return {
    id: 'cs_1',
    amount_total: 5000,
    payment_intent: 'pi_1',
    ...overrides,
  } as unknown as Stripe.Checkout.Session
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('handleCheckoutCompleted', () => {
  it('claims the payment atomically and credits from our own record', async () => {
    mocks.prisma.payment.findUnique.mockResolvedValue(PAYMENT)
    mocks.tx.payment.updateMany.mockResolvedValue({ count: 1 })
    mocks.tx.operator.updateMany.mockResolvedValue({ count: 1 })
    mocks.tx.operator.findUniqueOrThrow.mockResolvedValue({ creditBalance: 15000 })
    mocks.tx.creditTransaction.create.mockResolvedValue({})

    await handleCheckoutCompleted(checkoutSession())

    expect(mocks.tx.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'pay_1', status: 'PENDING' } })
    )
    expect(mocks.tx.operator.updateMany).toHaveBeenCalledWith({
      where: { id: 'op_1' },
      data: { creditBalance: { increment: 5000 } },
    })
    expect(mocks.tx.creditTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'PURCHASE', amount: 5000, referenceId: 'pay_1' }),
    })
  })

  it('does not credit when another delivery already claimed the payment', async () => {
    mocks.prisma.payment.findUnique.mockResolvedValue(PAYMENT)
    mocks.tx.payment.updateMany.mockResolvedValue({ count: 0 })

    await handleCheckoutCompleted(checkoutSession())

    expect(mocks.tx.operator.updateMany).not.toHaveBeenCalled()
    expect(mocks.tx.creditTransaction.create).not.toHaveBeenCalled()
  })

  it('throws AMOUNT_MISMATCH and credits nothing when Stripe total differs', async () => {
    mocks.prisma.payment.findUnique.mockResolvedValue(PAYMENT)

    await expect(
      handleCheckoutCompleted(checkoutSession({ amount_total: 9999 }))
    ).rejects.toMatchObject({ code: 'AMOUNT_MISMATCH' })

    expect(mocks.tx.payment.updateMany).not.toHaveBeenCalled()
    expect(mocks.tx.operator.updateMany).not.toHaveBeenCalled()
  })

  it('ignores sessions with no matching payment record', async () => {
    mocks.prisma.payment.findUnique.mockResolvedValue(null)

    await handleCheckoutCompleted(checkoutSession())

    expect(mocks.tx.payment.updateMany).not.toHaveBeenCalled()
  })
})
