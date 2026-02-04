import Stripe from 'stripe'
import { prisma } from '@botesq/database'
import { config } from '../config.js'
import { PaymentError } from '../types.js'
import {
  addCredits,
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

  // Save customer ID
  await prisma.operator.update({
    where: { id: operatorId },
    data: { stripeCustomerId: customer.id },
  })

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
    success_url: `${config.stripe.successUrl}&session_id={CHECKOUT_SESSION_ID}`,
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
      amountUsd: amountCents, // Store in cents
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
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const operatorId = session.metadata?.operator_id
  const credits = parseInt(session.metadata?.credits ?? '0', 10)

  if (!operatorId || !credits) {
    console.error('Missing metadata in checkout session:', session.id)
    return
  }

  // Check if already processed
  const payment = await prisma.payment.findUnique({
    where: { stripeCheckoutSessionId: session.id },
  })

  if (!payment) {
    console.error('Payment record not found for session:', session.id)
    return
  }

  if (payment.status === 'COMPLETED') {
    // Already processed, skip
    return
  }

  // Add credits to operator
  await addCredits(
    operatorId,
    credits,
    `Credit purchase: $${payment.amountUsd / 100}`,
    'payment',
    payment.id
  )

  // Update payment record
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'COMPLETED',
      stripePaymentIntentId: session.payment_intent as string | undefined,
      completedAt: new Date(),
    },
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
