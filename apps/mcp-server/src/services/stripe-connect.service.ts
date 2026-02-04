import Stripe from 'stripe'
import { config } from '../config.js'
import { PaymentError } from '../types.js'
import { logger } from '../lib/logger.js'

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
 * Credit to USD cents conversion
 * 100 credits = $1 USD = 100 cents
 * So 1 credit = 1 cent
 */
export function creditsToUsdCents(credits: number): number {
  return credits
}

/**
 * USD cents to credits conversion
 */
export function usdCentsToCredits(cents: number): number {
  return cents
}

/**
 * Get Stripe Connect account status
 */
export async function getConnectAccountStatus(stripeConnectId: string): Promise<{
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
}> {
  const stripe = getStripe()

  try {
    const account = await stripe.accounts.retrieve(stripeConnectId)

    return {
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
    }
  } catch (error) {
    logger.error({ error, stripeConnectId }, 'Failed to retrieve Stripe Connect account')
    throw new PaymentError('CONNECT_ACCOUNT_ERROR', 'Failed to retrieve Connect account status')
  }
}

export interface TransferMetadata {
  settlementId: string
  providerId: string
  periodStart: string
  periodEnd: string
}

/**
 * Create a Stripe Connect transfer to pay a provider
 */
export async function createTransfer(
  stripeConnectId: string,
  amountCents: number,
  metadata: TransferMetadata
): Promise<{ transferId: string }> {
  const stripe = getStripe()

  if (amountCents <= 0) {
    throw new PaymentError('INVALID_AMOUNT', 'Transfer amount must be positive')
  }

  // Verify the Connect account can receive payouts
  const accountStatus = await getConnectAccountStatus(stripeConnectId)

  if (!accountStatus.payoutsEnabled) {
    throw new PaymentError(
      'PAYOUTS_NOT_ENABLED',
      'Provider Connect account does not have payouts enabled'
    )
  }

  try {
    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: 'usd',
      destination: stripeConnectId,
      metadata: {
        settlement_id: metadata.settlementId,
        provider_id: metadata.providerId,
        period_start: metadata.periodStart,
        period_end: metadata.periodEnd,
      },
    })

    logger.info(
      {
        transferId: transfer.id,
        amount: amountCents,
        destination: stripeConnectId,
        settlementId: metadata.settlementId,
      },
      'Stripe Connect transfer created'
    )

    return { transferId: transfer.id }
  } catch (error) {
    logger.error(
      { error, stripeConnectId, amountCents, settlementId: metadata.settlementId },
      'Failed to create Stripe Connect transfer'
    )

    if (error instanceof Stripe.errors.StripeError) {
      throw new PaymentError('TRANSFER_FAILED', error.message)
    }

    throw new PaymentError('TRANSFER_FAILED', 'Failed to create transfer')
  }
}

/**
 * Retrieve transfer details
 */
export async function getTransfer(transferId: string): Promise<{
  id: string
  amount: number
  currency: string
  destination: string
  created: Date
  reversed: boolean
}> {
  const stripe = getStripe()

  try {
    const transfer = await stripe.transfers.retrieve(transferId)

    return {
      id: transfer.id,
      amount: transfer.amount,
      currency: transfer.currency,
      destination: transfer.destination as string,
      created: new Date(transfer.created * 1000),
      reversed: transfer.reversed,
    }
  } catch (error) {
    logger.error({ error, transferId }, 'Failed to retrieve transfer')
    throw new PaymentError('TRANSFER_NOT_FOUND', 'Failed to retrieve transfer')
  }
}

/**
 * Check if Stripe Connect is configured and available
 */
export function isStripeConnectConfigured(): boolean {
  return !!config.stripe.secretKey
}
