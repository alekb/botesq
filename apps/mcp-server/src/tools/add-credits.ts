import { z } from 'zod'
import { authenticateSession } from '../services/auth.service.js'
import { checkRateLimit } from '../services/rate-limit.service.js'
import { createCheckoutSession, isStripeConfigured } from '../services/stripe.service.js'
import { usdToCredits, MIN_PURCHASE_USD, MAX_PURCHASE_USD } from '../services/credit.service.js'
import type { ToolOutput, AddCreditsOutput } from '../types.js'
import { PaymentError } from '../types.js'

export const addCreditsSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  amount_usd: z
    .number()
    .min(MIN_PURCHASE_USD, `Minimum purchase is $${MIN_PURCHASE_USD}`)
    .max(MAX_PURCHASE_USD, `Maximum purchase is $${MAX_PURCHASE_USD}`),
})

export type AddCreditsInput = z.infer<typeof addCreditsSchema>

export async function handleAddCredits(input: AddCreditsInput): Promise<ToolOutput<AddCreditsOutput>> {
  // Authenticate session
  const session = await authenticateSession(input.session_token)

  // Check rate limits
  checkRateLimit(input.session_token)

  // Verify Stripe is configured
  if (!isStripeConfigured()) {
    throw new PaymentError(
      'PAYMENTS_UNAVAILABLE',
      'Payment processing is not currently available. Please contact support.'
    )
  }

  const operator = session.apiKey.operator

  // Create checkout session
  const { checkoutUrl, expiresAt } = await createCheckoutSession(operator.id, input.amount_usd)

  const creditsToAdd = usdToCredits(input.amount_usd)

  return {
    success: true,
    data: {
      payment_url: checkoutUrl,
      amount_usd: input.amount_usd,
      credits_to_add: creditsToAdd,
      expires_at: expiresAt.toISOString(),
      message: `Complete payment at the provided URL to add ${creditsToAdd.toLocaleString()} credits. Link expires in 30 minutes.`,
    },
  }
}

export const addCreditsTool = {
  name: 'add_credits',
  description:
    'Purchase additional credits for your account. Returns a payment URL to complete the transaction. ' +
    `Minimum purchase is $${MIN_PURCHASE_USD}, maximum is $${MAX_PURCHASE_USD}. Credits are added immediately upon successful payment.`,
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
      amount_usd: {
        type: 'number',
        description: `Amount in USD to purchase (min: $${MIN_PURCHASE_USD}, max: $${MAX_PURCHASE_USD})`,
        minimum: MIN_PURCHASE_USD,
        maximum: MAX_PURCHASE_USD,
      },
    },
    required: ['session_token', 'amount_usd'],
  },
  handler: handleAddCredits,
}
