import Stripe from 'stripe'

// Lazy initialize Stripe client
let stripeClient: Stripe | null = null

function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2026-01-28.clover',
    })
  }

  return stripeClient
}

export interface ConnectAccountStatus {
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
}

/**
 * Get Stripe Connect account status
 */
export async function getConnectAccountStatus(
  stripeConnectId: string
): Promise<ConnectAccountStatus> {
  const stripe = getStripe()

  const account = await stripe.accounts.retrieve(stripeConnectId)

  return {
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
  }
}
