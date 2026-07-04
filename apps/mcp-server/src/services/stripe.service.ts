import Stripe from 'stripe'
import { prisma } from '@botesq/database'
import { config } from '../config.js'
import { PaymentError } from '../types.js'
import {
  addCreditsInTx,
  usdToCredits,
  CREDITS_PER_DOLLAR,
  MIN_PURCHASE_USD,
  MAX_PURCHASE_USD,
} from './credit.service.js'

// Initialize Stripe client (lazy, throws if used without config)
let stripeClient: Stripe | null = null

function getStripe(): Stripe {
  if (!config.stripe.secretKey) {
    throw new PaymentError('STRIPE_NOT_CONFIGURED', 'Stripe is not configured')
  }

  if (!stripeClient) {
    stripeClient = new Stripe(config.stripe.secretKey, {
      apiVersion: '2026-01-28.clover',
    })
  }

  return stripeClient
}

/**
 * Create or get a Stripe customer for an operator
 */
export async function getOrCreateStripeCustomer(operatorId: string): Promise<string> {
  const stripe = getStripe()

  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: { id: true, email: true, companyName: true, stripeCustomerId: true },
  })

  if (!operator) {
    throw new PaymentError('OPERATOR_NOT_FOUND', 'Operator not found')
  }

  // Return existing customer ID if available
  if (operator.stripeCustomerId) {
    return operator.stripeCustomerId
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: operator.email,
    name: operator.companyName,
    metadata: {
      operator_id: operator.id,
    },
  })

  // Claim the id only if still unset — two concurrent first purchases both
  // create a Stripe customer, but only one is persisted; the loser deletes its
  // duplicate and reuses the winner's.
  const claimed = await prisma.operator.updateMany({
    where: { id: operatorId, stripeCustomerId: null },
    data: { stripeCustomerId: customer.id },
  })

  if (claimed.count === 0) {
    const winner = await prisma.operator.findUniqueOrThrow({
      where: { id: operatorId },
      select: { stripeCustomerId: true },
    })
    await stripe.customers.del(customer.id).catch(() => undefined)
    return winner.stripeCustomerId!
  }

  return customer.id
}

/**
 * Create a Stripe checkout session for credit purchase
 */
export async function createCheckoutSession(
  operatorId: string,
  amountUsd: number
): Promise<{ checkoutUrl: string; sessionId: string; expiresAt: Date }> {
  const stripe = getStripe()

  // Validate amount
  if (amountUsd < MIN_PURCHASE_USD) {
    throw new PaymentError('AMOUNT_TOO_LOW', `Minimum purchase is $${MIN_PURCHASE_USD}`)
  }

  if (amountUsd > MAX_PURCHASE_USD) {
    throw new PaymentError('AMOUNT_TOO_HIGH', `Maximum purchase is $${MAX_PURCHASE_USD}`)
  }

  const customerId = await getOrCreateStripeCustomer(operatorId)
  const credits = usdToCredits(amountUsd)
  const amountCents = Math.round(amountUsd * 100)

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'BotEsq Credits',
            description: `${credits.toLocaleString()} credits (${CREDITS_PER_DOLLAR} credits per $1)`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${config.stripe.successUrl}${config.stripe.successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: config.stripe.cancelUrl,
    metadata: {
      operator_id: operatorId,
      credits: credits.toString(),
      amount_usd: amountUsd.toString(),
    },
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
  })

  // Create pending payment record
  await prisma.payment.create({
    data: {
      operatorId,
      stripeCheckoutSessionId: session.id,
      amountCents,
      credits,
      status: 'PENDING',
    },
  })

  const expiresAt = new Date(session.expires_at! * 1000)

  return {
    checkoutUrl: session.url!,
    sessionId: session.id,
    expiresAt,
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<{ handled: boolean; event?: string }> {
  const stripe = getStripe()

  if (!config.stripe.webhookSecret) {
    throw new PaymentError('WEBHOOK_NOT_CONFIGURED', 'Stripe webhook secret not configured')
  }

  // Verify webhook signature
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret)
  } catch (err) {
    throw new PaymentError('INVALID_SIGNATURE', 'Invalid webhook signature')
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      return { handled: true, event: event.type }
    }

    case 'checkout.session.expired': {
      await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session)
      return { handled: true, event: event.type }
    }

    default:
      // Unhandled event type
      return { handled: false, event: event.type }
  }
}

/**
 * Handle successful checkout completion
 * (exported for tests)
 */
export async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { stripeCheckoutSessionId: session.id },
  })

  if (!payment) {
    console.error('Payment record not found for session:', session.id)
    return
  }

  // Reconcile the charged amount against our own record before crediting.
  // Throwing (rather than silently returning) makes the webhook delivery fail
  // so Stripe retries and the discrepancy stays visible for manual review.
  if (session.amount_total !== null && session.amount_total !== payment.amountCents) {
    throw new PaymentError(
      'AMOUNT_MISMATCH',
      `Checkout amount mismatch for session ${session.id}: charged ${session.amount_total}, expected ${payment.amountCents}`
    )
  }

  // Claim and credit atomically: the conditional update guarantees exactly one
  // concurrent webhook delivery wins, and the credit lands in the same
  // transaction so a crash can't strand a claimed-but-uncredited payment.
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: {
        status: 'COMPLETED',
        stripePaymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
        completedAt: new Date(),
      },
    })

    if (claimed.count === 0) {
      // Already processed (or failed/expired) — nothing to credit.
      return
    }

    await addCreditsInTx(
      tx,
      payment.operatorId,
      payment.credits,
      'PURCHASE',
      `Credit purchase: $${payment.amountCents / 100}`,
      'payment',
      payment.id
    )
  })
}

/**
 * Handle expired checkout session
 */
async function handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
  // Mark payment as failed
  await prisma.payment.updateMany({
    where: {
      stripeCheckoutSessionId: session.id,
      status: 'PENDING',
    },
    data: {
      status: 'FAILED',
    },
  })
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!config.stripe.secretKey
}
