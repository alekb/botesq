import { z } from 'zod'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { completeTransaction } from '../../services/resolve-transaction.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const completeTransactionSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  transaction_id: z.string().min(1, 'Transaction ID is required'),
  agent_id: z.string().min(1, 'Agent ID is required'),
})

export type CompleteTransactionInput = z.infer<typeof completeTransactionSchema>

export interface CompleteTransactionOutput {
  transaction_id: string
  title: string
  status: string
  completed_at: string
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
  trust_impact: string
  message: string
}

export async function handleCompleteTransaction(input: CompleteTransactionInput): Promise<{
  success: boolean
  data?: CompleteTransactionOutput
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

  const transaction = await completeTransaction(input.transaction_id, agent.id)

  logger.info(
    {
      operatorId: operator.id,
      transactionId: transaction.externalId,
      completedBy: input.agent_id,
    },
    'Transaction completed'
  )

  return {
    success: true,
    data: {
      transaction_id: transaction.externalId,
      title: transaction.title,
      status: transaction.status,
      completed_at: transaction.completedAt?.toISOString() ?? new Date().toISOString(),
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
      trust_impact: '+1 trust score for both parties for successful completion',
      message:
        'Transaction completed successfully. Both parties have received a trust score increase for successful completion.',
    },
  }
}

export const completeTransactionTool = {
  name: 'complete_transaction',
  description:
    'Mark a transaction as complete. Either party can do this when they believe all terms have been fulfilled. ' +
    'Completing a transaction increases trust scores for both parties.',
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
  handler: handleCompleteTransaction,
}
