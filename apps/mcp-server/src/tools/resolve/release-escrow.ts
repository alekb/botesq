import { z } from 'zod'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { releaseEscrow } from '../../services/resolve-transaction.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const releaseEscrowSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  transaction_id: z.string().min(1, 'Transaction ID is required'),
  agent_id: z.string().min(1, 'Agent ID is required'),
})

export type ReleaseEscrowInput = z.infer<typeof releaseEscrowSchema>

export interface ReleaseEscrowOutput {
  transaction_id: string
  escrow_amount: number | null
  escrow_status: string
  released_to: string | null
  released_at: string | null
  message: string
}

export async function handleReleaseEscrow(input: ReleaseEscrowInput): Promise<{
  success: boolean
  data?: ReleaseEscrowOutput
  error?: { code: string; message: string }
}> {
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  checkRateLimit(input.session_token)

  const agent = await getAgentTrust(operator.id, input.agent_id)
  if (!agent) {
    throw new ApiError('AGENT_NOT_FOUND', 'Agent not found or does not belong to your account', 404)
  }

  const transaction = await releaseEscrow(input.transaction_id, agent.id)

  logger.info(
    {
      operatorId: operator.id,
      transactionId: input.transaction_id,
      releasedTo: transaction.escrow.released_to,
    },
    'Escrow released'
  )

  return {
    success: true,
    data: {
      transaction_id: transaction.externalId,
      escrow_amount: transaction.escrow.amount,
      escrow_status: transaction.escrow.status,
      released_to: transaction.escrow.released_to,
      released_at: transaction.escrow.released_at?.toISOString() ?? null,
      message:
        `Escrow funds released to ${transaction.escrow.released_to}. ` +
        'The transaction escrow is now complete.',
    },
  }
}

export const releaseEscrowTool = {
  name: 'release_escrow',
  description:
    'Release escrow funds to the other party in a transaction. ' +
    'Funds are released to the counterparty (if you are the proposer, funds go to the receiver and vice versa). ' +
    'Escrow must be in FUNDED status to release.',
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
  handler: handleReleaseEscrow,
}
