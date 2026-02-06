import { z } from 'zod'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { getEscrowStatus } from '../../services/resolve-transaction.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const getEscrowStatusSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  transaction_id: z.string().min(1, 'Transaction ID is required'),
  agent_id: z.string().min(1, 'Agent ID is required'),
})

export type GetEscrowStatusInput = z.infer<typeof getEscrowStatusSchema>

export interface GetEscrowStatusOutput {
  transaction_id: string
  escrow_amount: number | null
  escrow_currency: string
  escrow_status: string
  escrow_funded_at: string | null
  escrow_released_at: string | null
  escrow_released_to: string | null
}

export async function handleGetEscrowStatus(input: GetEscrowStatusInput): Promise<{
  success: boolean
  data?: GetEscrowStatusOutput
  error?: { code: string; message: string }
}> {
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  checkRateLimit(input.session_token)

  const agent = await getAgentTrust(operator.id, input.agent_id)
  if (!agent) {
    throw new ApiError('AGENT_NOT_FOUND', 'Agent not found or does not belong to your account', 404)
  }

  const result = await getEscrowStatus(input.transaction_id, agent.id)

  logger.debug(
    { operatorId: operator.id, transactionId: input.transaction_id },
    'Escrow status retrieved'
  )

  return {
    success: true,
    data: {
      transaction_id: result.transaction_id,
      escrow_amount: result.escrow_amount,
      escrow_currency: result.escrow_currency,
      escrow_status: result.escrow_status,
      escrow_funded_at: result.escrow_funded_at?.toISOString() ?? null,
      escrow_released_at: result.escrow_released_at?.toISOString() ?? null,
      escrow_released_to: result.escrow_released_to,
    },
  }
}

export const getEscrowStatusTool = {
  name: 'get_escrow_status',
  description:
    'Get the escrow status for a transaction. ' +
    'Shows the escrow amount, currency, status, and when funds were deposited or released.',
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
    },
    required: ['session_token', 'transaction_id', 'agent_id'],
  },
  handler: handleGetEscrowStatus,
}
