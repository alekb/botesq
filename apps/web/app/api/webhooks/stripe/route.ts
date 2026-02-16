import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@botesq/database'
import { logger } from '@/lib/logger'

// Lazy initialization to avoid build-time errors
let stripeClient: Stripe | null = null

function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-01-28.clover',
    })
  }
  return stripeClient
}

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    logger.error('Webhook signature verification failed', { error: String(err) })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      // Credit purchase events
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      }

      case 'checkout.session.expired': {
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session)
        break
      }

      // Settlement transfer events
      case 'transfer.created': {
        await handleTransferCreated(event.data.object as Stripe.Transfer)
        break
      }

      case 'transfer.reversed': {
        await handleTransferReversed(event.data.object as Stripe.Transfer)
        break
      }

      case 'transfer.updated': {
        await handleTransferUpdated(event.data.object as Stripe.Transfer)
        break
      }

      default:
        logger.info('Unhandled Stripe event type', { eventType: event.type })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('Webhook handler error', { error: String(error) })
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

// ==================== Checkout Handlers ====================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const operatorId = session.metadata?.operator_id
  const credits = parseInt(session.metadata?.credits ?? '0', 10)

  if (!operatorId || !credits) {
    logger.error('Missing metadata in checkout session', { sessionId: session.id })
    return
  }

  // Find the payment record
  const payment = await prisma.payment.findUnique({
    where: { stripeCheckoutSessionId: session.id },
  })

  if (!payment) {
    logger.error('Payment record not found for session', { sessionId: session.id })
    return
  }

  if (payment.status === 'COMPLETED') {
    return // Already processed
  }

  // Add credits to operator using interactive transaction
  await prisma.$transaction(async (tx) => {
    // Get current balance
    const operator = await tx.operator.findUnique({
      where: { id: operatorId },
      select: { creditBalance: true },
    })

    const balanceBefore = operator?.creditBalance ?? 0
    const balanceAfter = balanceBefore + credits

    // Update operator credit balance
    await tx.operator.update({
      where: { id: operatorId },
      data: { creditBalance: balanceAfter },
    })

    // Create credit transaction
    await tx.creditTransaction.create({
      data: {
        operatorId,
        amount: credits,
        type: 'PURCHASE',
        description: `Credit purchase: $${payment.amountUsd / 100}`,
        referenceType: 'payment',
        referenceId: payment.id,
        balanceBefore,
        balanceAfter,
      },
    })

    // Update payment status
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        stripePaymentIntentId: session.payment_intent as string | undefined,
        completedAt: new Date(),
      },
    })
  })

  logger.info('Credits added to operator', { credits, operatorId })
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
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

// ==================== Transfer Handlers ====================

async function handleTransferCreated(transfer: Stripe.Transfer): Promise<void> {
  const settlementId = transfer.metadata?.settlement_id

  if (!settlementId) {
    return // Not a settlement transfer
  }

  // Update settlement if still in PROCESSING state
  await prisma.providerSettlement.updateMany({
    where: {
      id: settlementId,
      status: 'PROCESSING',
    },
    data: {
      status: 'PAID',
      stripeTransferId: transfer.id,
      paidAt: new Date(),
    },
  })

  logger.info('Settlement marked as PAID via webhook', { settlementId })
}

async function handleTransferReversed(transfer: Stripe.Transfer): Promise<void> {
  const settlementId = transfer.metadata?.settlement_id

  if (!settlementId) {
    return // Not a settlement transfer
  }

  // Mark settlement as failed if reversed
  await prisma.providerSettlement.updateMany({
    where: {
      id: settlementId,
      stripeTransferId: transfer.id,
    },
    data: {
      status: 'FAILED',
    },
  })

  logger.warn('Settlement marked as FAILED (transfer reversed)', { settlementId })
}

async function handleTransferUpdated(transfer: Stripe.Transfer): Promise<void> {
  const settlementId = transfer.metadata?.settlement_id

  if (!settlementId) {
    return // Not a settlement transfer
  }

  // If the transfer was reversed, mark settlement as failed
  if (transfer.reversed) {
    await prisma.providerSettlement.updateMany({
      where: {
        id: settlementId,
        stripeTransferId: transfer.id,
        status: 'PAID',
      },
      data: {
        status: 'FAILED',
      },
    })

    logger.warn('Settlement marked as FAILED (transfer update reversed)', { settlementId })
  }
}
