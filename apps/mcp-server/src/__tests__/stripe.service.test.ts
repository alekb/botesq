import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type Stripe from 'stripe'

// Mock config
vi.mock('../config.js', () => ({
  config: {
    stripe: {
      secretKey: 'sk_test_mock_key',
      webhookSecret: 'whsec_mock_secret',
      successUrl: 'https://example.com/success?status=success',
      cancelUrl: 'https://example.com/cancel',
    },
  },
}))

// Mock prisma
vi.mock('@botesq/database', () => ({
  prisma: {
    operator: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

// Mock credit service
vi.mock('../services/credit.service.js', () => ({
  addCredits: vi.fn(),
  usdToCredits: vi.fn((usd: number) => Math.floor(usd * 100)),
  CREDITS_PER_DOLLAR: 100,
  MIN_PURCHASE_USD: 10,
  MAX_PURCHASE_USD: 10000,
}))

// Mock Stripe
const mockStripeCheckoutSessions = {
  create: vi.fn(),
}

const mockStripeCustomers = {
  create: vi.fn(),
}

const mockStripeWebhooks = {
  constructEvent: vi.fn(),
}

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: mockStripeCheckoutSessions,
      },
      customers: mockStripeCustomers,
      webhooks: mockStripeWebhooks,
    })),
  }
})

import { prisma } from '@botesq/database'
import { addCredits, MIN_PURCHASE_USD, MAX_PURCHASE_USD } from '../services/credit.service.js'
import {
  getOrCreateStripeCustomer,
  createCheckoutSession,
  handleWebhookEvent,
  isStripeConfigured,
} from '../services/stripe.service.js'
import { PaymentError } from '../types.js'

describe('stripe.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('isStripeConfigured', () => {
    it('should return true when secret key is configured', () => {
      expect(isStripeConfigured()).toBe(true)
    })
  })

  describe('getOrCreateStripeCustomer', () => {
    it('should return existing stripe customer ID if operator has one', async () => {
      const mockOperator = {
        id: 'op_123',
        email: 'test@example.com',
        companyName: 'Test Company',
        stripeCustomerId: 'cus_existing_123',
      }

      vi.mocked(prisma.operator.findUnique).mockResolvedValue(mockOperator as never)

      const result = await getOrCreateStripeCustomer('op_123')

      expect(result).toBe('cus_existing_123')
      expect(prisma.operator.findUnique).toHaveBeenCalledWith({
        where: { id: 'op_123' },
        select: { id: true, email: true, companyName: true, stripeCustomerId: true },
      })
      expect(mockStripeCustomers.create).not.toHaveBeenCalled()
    })

    it('should create new stripe customer if operator does not have one', async () => {
      const mockOperator = {
        id: 'op_123',
        email: 'test@example.com',
        companyName: 'Test Company',
        stripeCustomerId: null,
      }

      const mockStripeCustomer = {
        id: 'cus_new_456',
      }

      vi.mocked(prisma.operator.findUnique).mockResolvedValue(mockOperator as never)
      mockStripeCustomers.create.mockResolvedValue(mockStripeCustomer)
      vi.mocked(prisma.operator.update).mockResolvedValue({
        ...mockOperator,
        stripeCustomerId: 'cus_new_456',
      } as never)

      const result = await getOrCreateStripeCustomer('op_123')

      expect(result).toBe('cus_new_456')
      expect(mockStripeCustomers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test Company',
        metadata: {
          operator_id: 'op_123',
        },
      })
      expect(prisma.operator.update).toHaveBeenCalledWith({
        where: { id: 'op_123' },
        data: { stripeCustomerId: 'cus_new_456' },
      })
    })

    it('should throw PaymentError if operator not found', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue(null)

      await expect(getOrCreateStripeCustomer('op_nonexistent')).rejects.toThrow(PaymentError)
      await expect(getOrCreateStripeCustomer('op_nonexistent')).rejects.toThrow(
        'Operator not found'
      )
    })
  })

  describe('createCheckoutSession', () => {
    const mockOperator = {
      id: 'op_123',
      email: 'test@example.com',
      companyName: 'Test Company',
      stripeCustomerId: 'cus_existing_123',
    }

    beforeEach(() => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue(mockOperator as never)
    })

    it('should reject amount below minimum ($10)', async () => {
      await expect(createCheckoutSession('op_123', 5)).rejects.toThrow(PaymentError)
      await expect(createCheckoutSession('op_123', 5)).rejects.toThrow(
        `Minimum purchase is $${MIN_PURCHASE_USD}`
      )
    })

    it('should reject amount above maximum ($10000)', async () => {
      await expect(createCheckoutSession('op_123', 15000)).rejects.toThrow(PaymentError)
      await expect(createCheckoutSession('op_123', 15000)).rejects.toThrow(
        `Maximum purchase is $${MAX_PURCHASE_USD}`
      )
    })

    it('should reject amount at $0', async () => {
      await expect(createCheckoutSession('op_123', 0)).rejects.toThrow(PaymentError)
    })

    it('should reject negative amounts', async () => {
      await expect(createCheckoutSession('op_123', -50)).rejects.toThrow(PaymentError)
    })

    it('should create checkout session with valid amount', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
        expires_at: Math.floor(Date.now() / 1000) + 1800,
      }

      mockStripeCheckoutSessions.create.mockResolvedValue(mockSession)
      vi.mocked(prisma.payment.create).mockResolvedValue({
        id: 'pay_123',
        operatorId: 'op_123',
        stripeCheckoutSessionId: 'cs_test_123',
        amountUsd: 5000,
        credits: 5000,
        status: 'PENDING',
      } as never)

      const result = await createCheckoutSession('op_123', 50)

      expect(result.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test_123')
      expect(result.sessionId).toBe('cs_test_123')
      expect(result.expiresAt).toBeInstanceOf(Date)
    })

    it('should create checkout session with correct Stripe parameters', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
        expires_at: Math.floor(Date.now() / 1000) + 1800,
      }

      mockStripeCheckoutSessions.create.mockResolvedValue(mockSession)
      vi.mocked(prisma.payment.create).mockResolvedValue({} as never)

      await createCheckoutSession('op_123', 100)

      expect(mockStripeCheckoutSessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing_123',
          mode: 'payment',
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: 'BotEsq Credits',
                  description: expect.stringContaining('credits'),
                },
                unit_amount: 10000, // $100 in cents
              },
              quantity: 1,
            },
          ],
          metadata: {
            operator_id: 'op_123',
            credits: '10000', // $100 * 100 credits/dollar
            amount_usd: '100',
          },
        })
      )
    })

    it('should create PENDING payment record', async () => {
      const mockSession = {
        id: 'cs_test_456',
        url: 'https://checkout.stripe.com/pay/cs_test_456',
        expires_at: Math.floor(Date.now() / 1000) + 1800,
      }

      mockStripeCheckoutSessions.create.mockResolvedValue(mockSession)
      vi.mocked(prisma.payment.create).mockResolvedValue({} as never)

      await createCheckoutSession('op_123', 25)

      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          operatorId: 'op_123',
          stripeCheckoutSessionId: 'cs_test_456',
          amountUsd: 2500, // $25 in cents
          credits: 2500, // $25 * 100 credits/dollar
          status: 'PENDING',
        },
      })
    })

    it('should handle exact minimum amount ($10)', async () => {
      const mockSession = {
        id: 'cs_test_min',
        url: 'https://checkout.stripe.com/pay/cs_test_min',
        expires_at: Math.floor(Date.now() / 1000) + 1800,
      }

      mockStripeCheckoutSessions.create.mockResolvedValue(mockSession)
      vi.mocked(prisma.payment.create).mockResolvedValue({} as never)

      const result = await createCheckoutSession('op_123', 10)

      expect(result.sessionId).toBe('cs_test_min')
    })

    it('should handle exact maximum amount ($10000)', async () => {
      const mockSession = {
        id: 'cs_test_max',
        url: 'https://checkout.stripe.com/pay/cs_test_max',
        expires_at: Math.floor(Date.now() / 1000) + 1800,
      }

      mockStripeCheckoutSessions.create.mockResolvedValue(mockSession)
      vi.mocked(prisma.payment.create).mockResolvedValue({} as never)

      const result = await createCheckoutSession('op_123', 10000)

      expect(result.sessionId).toBe('cs_test_max')
    })

    it('should handle decimal amounts correctly', async () => {
      const mockSession = {
        id: 'cs_test_decimal',
        url: 'https://checkout.stripe.com/pay/cs_test_decimal',
        expires_at: Math.floor(Date.now() / 1000) + 1800,
      }

      mockStripeCheckoutSessions.create.mockResolvedValue(mockSession)
      vi.mocked(prisma.payment.create).mockResolvedValue({} as never)

      await createCheckoutSession('op_123', 49.99)

      expect(mockStripeCheckoutSessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 4999, // $49.99 in cents
              }),
            }),
          ],
        })
      )
    })
  })

  describe('handleWebhookEvent', () => {
    it('should reject invalid webhook signature', async () => {
      mockStripeWebhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      await expect(handleWebhookEvent('payload', 'bad_sig')).rejects.toThrow(PaymentError)
      await expect(handleWebhookEvent('payload', 'bad_sig')).rejects.toThrow(
        'Invalid webhook signature'
      )
    })

    it('should handle checkout.session.completed event', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            metadata: {
              operator_id: 'op_123',
              credits: '5000',
            },
            payment_intent: 'pi_123',
          } as unknown as Stripe.Checkout.Session,
        },
      }

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent)

      const mockPayment = {
        id: 'pay_123',
        operatorId: 'op_123',
        stripeCheckoutSessionId: 'cs_test_123',
        amountUsd: 5000,
        credits: 5000,
        status: 'PENDING',
      }

      vi.mocked(prisma.payment.findUnique).mockResolvedValue(mockPayment as never)
      vi.mocked(prisma.payment.update).mockResolvedValue({
        ...mockPayment,
        status: 'COMPLETED',
      } as never)
      vi.mocked(addCredits).mockResolvedValue({ newBalance: 10000 })

      const result = await handleWebhookEvent('payload', 'valid_sig')

      expect(result.handled).toBe(true)
      expect(result.event).toBe('checkout.session.completed')
      expect(addCredits).toHaveBeenCalledWith(
        'op_123',
        5000,
        'Credit purchase: $50',
        'payment',
        'pay_123'
      )
    })

    it('should NOT double-add credits if webhook is replayed (idempotency)', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            metadata: {
              operator_id: 'op_123',
              credits: '5000',
            },
          } as unknown as Stripe.Checkout.Session,
        },
      }

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent)

      // Payment already COMPLETED
      const mockPayment = {
        id: 'pay_123',
        operatorId: 'op_123',
        stripeCheckoutSessionId: 'cs_test_123',
        amountUsd: 5000,
        credits: 5000,
        status: 'COMPLETED',
      }

      vi.mocked(prisma.payment.findUnique).mockResolvedValue(mockPayment as never)

      const result = await handleWebhookEvent('payload', 'valid_sig')

      expect(result.handled).toBe(true)
      expect(addCredits).not.toHaveBeenCalled()
      expect(prisma.payment.update).not.toHaveBeenCalled()
    })

    it('should handle checkout.session.expired event', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        type: 'checkout.session.expired',
        data: {
          object: {
            id: 'cs_test_expired',
          } as unknown as Stripe.Checkout.Session,
        },
      }

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent)
      vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 1 })

      const result = await handleWebhookEvent('payload', 'valid_sig')

      expect(result.handled).toBe(true)
      expect(result.event).toBe('checkout.session.expired')
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: {
          stripeCheckoutSessionId: 'cs_test_expired',
          status: 'PENDING',
        },
        data: {
          status: 'FAILED',
        },
      })
    })

    it('should return handled=false for unhandled event types', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        type: 'customer.created',
        data: {
          object: {} as Stripe.Customer,
        },
      }

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent)

      const result = await handleWebhookEvent('payload', 'valid_sig')

      expect(result.handled).toBe(false)
      expect(result.event).toBe('customer.created')
    })

    it('should handle missing metadata gracefully', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_no_meta',
            metadata: {},
          } as unknown as Stripe.Checkout.Session,
        },
      }

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent)

      // Should not throw, just return
      const result = await handleWebhookEvent('payload', 'valid_sig')

      expect(result.handled).toBe(true)
      expect(addCredits).not.toHaveBeenCalled()
    })

    it('should handle missing payment record gracefully', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_no_payment',
            metadata: {
              operator_id: 'op_123',
              credits: '5000',
            },
          } as unknown as Stripe.Checkout.Session,
        },
      }

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent)
      vi.mocked(prisma.payment.findUnique).mockResolvedValue(null)

      // Should not throw, just return
      const result = await handleWebhookEvent('payload', 'valid_sig')

      expect(result.handled).toBe(true)
      expect(addCredits).not.toHaveBeenCalled()
    })

    it('should update payment record with payment intent ID on completion', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            metadata: {
              operator_id: 'op_123',
              credits: '5000',
            },
            payment_intent: 'pi_intent_abc123',
          } as unknown as Stripe.Checkout.Session,
        },
      }

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent)

      const mockPayment = {
        id: 'pay_123',
        operatorId: 'op_123',
        stripeCheckoutSessionId: 'cs_test_123',
        amountUsd: 5000,
        credits: 5000,
        status: 'PENDING',
      }

      vi.mocked(prisma.payment.findUnique).mockResolvedValue(mockPayment as never)
      vi.mocked(prisma.payment.update).mockResolvedValue({
        ...mockPayment,
        status: 'COMPLETED',
      } as never)
      vi.mocked(addCredits).mockResolvedValue({ newBalance: 10000 })

      await handleWebhookEvent('payload', 'valid_sig')

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay_123' },
        data: {
          status: 'COMPLETED',
          stripePaymentIntentId: 'pi_intent_abc123',
          completedAt: expect.any(Date),
        },
      })
    })
  })
})

describe('stripe.service without configuration', () => {
  beforeEach(async () => {
    vi.resetModules()

    // Re-mock with no config
    vi.doMock('../config.js', () => ({
      config: {
        stripe: {
          secretKey: '',
          webhookSecret: '',
          successUrl: '',
          cancelUrl: '',
        },
      },
    }))
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('should return false for isStripeConfigured when not configured', async () => {
    const { isStripeConfigured: isConfigured } = await import('../services/stripe.service.js')
    expect(isConfigured()).toBe(false)
  })
})
