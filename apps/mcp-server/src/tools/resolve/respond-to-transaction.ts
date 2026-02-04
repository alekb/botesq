import { z } from 'zod'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { respondToTransaction } from '../../services/resolve-transaction.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const respondToTransactionSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  transaction_id: z.string().min(1, 'Transaction ID is required'),
  agent_id: z.string().min(1, 'Agent ID is required'),
  response: z.enum(['accept', 'reject']),
})

export type RespondToTransactionInput = z.infer<typeof respondToTransactionSchema>

export interface RespondToTransactionOutput {
  transaction_id: string
  title: string
  status: string
  response: 'accept' | 'reject'
  proposer: {
    agent_id: string
    display_name: string | null
    trust_score: number
  }
  receiver: {
    agent_id: string
    display_name: string | null
    trust_score: number
  }
  responded_at: string
  message: string
}

export async function handleRespondToTransaction(input: RespondToTransactionInput): Promise<{
  success: boolean
  data?: RespondToTransactionOutput
  error?: { code: string; message: string }
}> {
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  checkRateLimit(input.session_token)

  // Verify agent belongs to this operator
  const agent = await getAgentTrust(operator.id, input.agent_id)
  if (!agent) {
    throw new ApiError('AGENT_NOT_FOUND', 'Agent not found or does not belong to your account', 404)
  }

  const transaction = await respondToTransaction(input.transaction_id, agent.id, input.response)

  logger.info(
    {
      operatorId: operator.id,
      transactionId: transaction.externalId,
      response: input.response,
    },
    'Transaction response submitted'
  )

  const messageMap = {
    accept:
      'Transaction accepted. Both parties should now fulfill the agreed terms. ' +
      'Either party can mark the transaction complete when finished, or file a dispute if issues arise.',
    reject: 'Transaction rejected. The proposal has been declined and no agreement was formed.',
  }

  return {
    success: true,
    data: {
      transaction_id: transaction.externalId,
      title: transaction.title,
      status: transaction.status,
      response: input.response,
      proposer: {
        agent_id: transaction.proposerAgent.externalId,
        display_name: transaction.proposerAgent.displayName,
        trust_score: transaction.proposerAgent.trustScore,
      },
      receiver: {
        agent_id: transaction.receiverAgent.externalId,
        display_name: transaction.receiverAgent.displayName,
        trust_score: transaction.receiverAgent.trustScore,
      },
      responded_at: transaction.respondedAt?.toISOString() ?? new Date().toISOString(),
      message: messageMap[input.response],
    },
  }
}

export const respondToTransactionTool = {
  name: 'respond_to_transaction',
  description:
    'Accept or reject a transaction proposal. Only the receiving agent can respond. ' +
    'Once accepted, both parties are expected to fulfill the agreed terms.',
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
        description: 'Your agent ID (must be the receiver of the transaction)',
      },
      response: {
        type: 'string',
        enum: ['accept', 'reject'],
        description: 'Whether to accept or reject the transaction proposal',
      },
    },
    required: ['session_token', 'transaction_id', 'agent_id', 'response'],
  },
  handler: handleRespondToTransaction,
}
