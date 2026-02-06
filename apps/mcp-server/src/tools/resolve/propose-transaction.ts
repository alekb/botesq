import { z } from 'zod'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { proposeTransaction } from '../../services/resolve-transaction.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const proposeTransactionSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  proposer_agent_id: z.string().min(1, 'Proposer agent ID is required'),
  receiver_agent_id: z.string().min(1, 'Receiver agent ID is required'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  terms: z.record(z.unknown()).describe('Transaction terms as key-value pairs'),
  stated_value_cents: z.number().int().positive().optional(),
  stated_value_currency: z.string().length(3).default('USD'),
  expires_in_days: z.number().int().min(1).max(30).default(7),
  metadata: z.record(z.unknown()).optional(),
})

export type ProposeTransactionInput = z.infer<typeof proposeTransactionSchema>

export interface ProposeTransactionOutput {
  transaction_id: string
  title: string
  status: string
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
  stated_value_cents: number | null
  stated_value_currency: string
  expires_at: string
  created_at: string
  message: string
}

export async function handleProposeTransaction(input: ProposeTransactionInput): Promise<{
  success: boolean
  data?: ProposeTransactionOutput
  error?: { code: string; message: string }
}> {
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  checkRateLimit(input.session_token)

  // Verify proposer agent belongs to this operator
  const proposerAgent = await getAgentTrust(operator.id, input.proposer_agent_id)
  if (!proposerAgent) {
    throw new ApiError(
      'PROPOSER_NOT_FOUND',
      'Proposer agent not found or does not belong to your account',
      404
    )
  }

  const transaction = await proposeTransaction({
    proposerAgentId: proposerAgent.id,
    receiverAgentExternalId: input.receiver_agent_id,
    title: input.title,
    description: input.description,
    terms: input.terms,
    statedValue: input.stated_value_cents,
    statedValueCurrency: input.stated_value_currency,
    expiresInDays: input.expires_in_days,
    metadata: input.metadata,
  })

  logger.info(
    {
      operatorId: operator.id,
      transactionId: transaction.externalId,
      proposerAgentId: transaction.proposerAgent.externalId,
      receiverAgentId: transaction.receiverAgent.externalId,
    },
    'Transaction proposed'
  )

  return {
    success: true,
    data: {
      transaction_id: transaction.externalId,
      title: transaction.title,
      status: transaction.status,
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
      stated_value_cents: transaction.statedValue,
      stated_value_currency: transaction.statedValueCurrency,
      expires_at: transaction.expiresAt.toISOString(),
      created_at: transaction.proposedAt.toISOString(),
      message:
        'Transaction proposed successfully. The receiver must accept or reject within the expiration period.',
    },
  }
}

export const proposeTransactionTool = {
  name: 'propose_transaction',
  description:
    'Propose a transaction between two agents. ' +
    'This creates an agreement that the receiver must accept before it becomes active. ' +
    'Transactions can be disputed if either party fails to fulfill the terms.',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
      proposer_agent_id: {
        type: 'string',
        description: 'Your agent ID (must belong to your operator account)',
      },
      receiver_agent_id: {
        type: 'string',
        description: "The other agent's ID (RAGENT-XXXX format)",
      },
      title: {
        type: 'string',
        description: 'Brief title describing the transaction',
      },
      description: {
        type: 'string',
        description: 'Detailed description of what the transaction involves',
      },
      terms: {
        type: 'object',
        description:
          'Transaction terms as key-value pairs (e.g., {"deliverable": "API integration", "deadline": "2024-12-31"})',
      },
      stated_value_cents: {
        type: 'integer',
        description:
          'Value of the transaction in cents (e.g., 10000 = $100). Used for dispute cost calculation.',
      },
      stated_value_currency: {
        type: 'string',
        description: 'Currency code (default: USD)',
      },
      expires_in_days: {
        type: 'integer',
        description: 'Days until the proposal expires if not accepted (1-30, default: 7)',
      },
      metadata: {
        type: 'object',
        description: 'Optional metadata about the transaction',
      },
    },
    required: ['session_token', 'proposer_agent_id', 'receiver_agent_id', 'title', 'terms'],
  },
  handler: handleProposeTransaction,
}
