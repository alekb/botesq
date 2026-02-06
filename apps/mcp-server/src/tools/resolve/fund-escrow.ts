import { z } from 'zod'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { fundEscrow } from '../../services/resolve-transaction.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const fundEscrowSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  transaction_id: z.string().min(1, 'Transaction ID is required'),
  agent_id: z.string().min(1, 'Agent ID is required'),
  amount: z.number().int().positive('Amount must be a positive integer (in cents)'),
  currency: z.string().length(3).default('USD'),
})

export type FundEscrowInput = z.infer<typeof fundEscrowSchema>

export interface FundEscrowOutput {
  transaction_id: string
  escrow_amount: number
  escrow_currency: string
  escrow_status: string
  escrow_funded_at: string
  transaction_status: string
  message: string
}

export async function handleFundEscrow(input: FundEscrowInput): Promise<{
  success: boolean
  data?: FundEscrowOutput
  error?: { code: string; message: string }
}> {
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  checkRateLimit(input.session_token)

  const agent = await getAgentTrust(operator.id, input.agent_id)
  if (!agent) {
    throw new ApiError('AGENT_NOT_FOUND', 'Agent not found or does not belong to your account', 404)
  }

  const transaction = await fundEscrow(
    input.transaction_id,
    agent.id,
    input.amount,
    input.currency ?? 'USD'
  )

  logger.info(
    {
      operatorId: operator.id,
      transactionId: input.transaction_id,
      amount: input.amount,
      currency: input.currency,
    },
    'Escrow funded'
  )

  return {
    success: true,
    data: {
      transaction_id: transaction.externalId,
      escrow_amount: transaction.escrow.amount!,
      escrow_currency: transaction.escrow.currency,
      escrow_status: transaction.escrow.status,
      escrow_funded_at: transaction.escrow.funded_at!.toISOString(),
      transaction_status: transaction.status,
      message:
        `Escrow of ${input.amount} ${input.currency ?? 'USD'} cents funded successfully. ` +
        'Funds are held in escrow until the transaction is completed or a dispute is resolved. ' +
        'Use release_escrow to release funds to the other party.',
    },
  }
}

export const fundEscrowTool = {
  name: 'fund_escrow',
  description:
    'Fund escrow for a transaction. ' +
    'Places funds in a held state until the transaction completes or a dispute is resolved. ' +
    'Only available for ACCEPTED or IN_PROGRESS transactions. ' +
    'Amount is in cents (e.g., 10000 = $100.00).',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
      transaction_id: {
        type: 'string',
        description: 'Transaction ID (RTXN-XXXX format)',
      },
      agent_id: {
        type: 'string',
        description: 'Your agent ID (must be a party to the transaction)',
      },
      amount: {
        type: 'integer',
        description: 'Escrow amount in cents (e.g., 10000 = $100.00)',
      },
      currency: {
        type: 'string',
        description: 'Currency code (default: USD)',
        default: 'USD',
      },
    },
    required: ['session_token', 'transaction_id', 'agent_id', 'amount'],
  },
  handler: handleFundEscrow,
}
