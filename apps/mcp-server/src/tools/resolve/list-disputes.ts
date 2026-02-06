import { z } from 'zod'
import { ResolveDisputeStatus } from '@botesq/database'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { listDisputesForAgent } from '../../services/resolve-dispute.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const listDisputesSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  agent_id: z.string().min(1, 'Agent ID is required'),
  status: z
    .enum(['FILED', 'AWAITING_RESPONSE', 'RESPONSE_RECEIVED', 'IN_ARBITRATION', 'RULED', 'CLOSED'])
    .optional(),
  role: z.enum(['claimant', 'respondent', 'any']).optional().default('any'),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
})

export type ListDisputesInput = z.infer<typeof listDisputesSchema>

export interface ListDisputesOutput {
  disputes: Array<{
    dispute_id: string
    transaction_id: string
    status: string
    claim_type: string
    claim_summary: string
    your_role: 'claimant' | 'respondent'
    counterparty: {
      agent_id: string
      display_name: string | null
      trust_score: number
    }
    response_deadline: string
    ruling: string | null
    evidence_count: number
    created_at: string
  }>
  pagination: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
}

export async function handleListDisputes(input: ListDisputesInput): Promise<{
  success: boolean
  data?: ListDisputesOutput
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

  const result = await listDisputesForAgent(agent.id, {
    status: input.status as ResolveDisputeStatus | undefined,
    role: input.role,
    limit: input.limit,
    offset: input.offset,
  })

  logger.debug(
    {
      operatorId: operator.id,
      agentId: agent.externalId,
      disputeCount: result.disputes.length,
    },
    'Disputes listed'
  )

  const disputes = result.disputes.map((d) => {
    const isClaimant = d.claimantAgent.externalId === agent.externalId
    const yourRole = isClaimant ? 'claimant' : 'respondent'
    const counterparty = isClaimant ? d.respondentAgent : d.claimantAgent

    return {
      dispute_id: d.externalId,
      transaction_id: d.transaction.externalId,
      status: d.status,
      claim_type: d.claimType,
      claim_summary: d.claimSummary,
      your_role: yourRole as 'claimant' | 'respondent',
      counterparty: {
        agent_id: counterparty.externalId,
        display_name: counterparty.displayName,
        trust_score: counterparty.trustScore,
      },
      response_deadline: d.responseDeadline.toISOString(),
      ruling: d.ruling,
      evidence_count: d.evidenceCount,
      created_at: d.createdAt.toISOString(),
    }
  })

  return {
    success: true,
    data: {
      disputes,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        has_more: result.offset + result.disputes.length < result.total,
      },
    },
  }
}

export const listDisputesTool = {
  name: 'list_disputes',
  description:
    'List disputes for an agent. ' +
    'Filter by status (FILED, AWAITING_RESPONSE, etc.) and role (claimant, respondent, or any). ' +
    'Returns paginated results sorted by creation date (newest first).',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
      agent_id: {
        type: 'string',
        description: 'Your agent ID',
      },
      status: {
        type: 'string',
        enum: [
          'FILED',
          'AWAITING_RESPONSE',
          'RESPONSE_RECEIVED',
          'IN_ARBITRATION',
          'RULED',
          'CLOSED',
        ],
        description: 'Filter by dispute status (optional)',
      },
      role: {
        type: 'string',
        enum: ['claimant', 'respondent', 'any'],
        description: 'Filter by your role in the dispute (default: any)',
      },
      limit: {
        type: 'integer',
        description: 'Number of results per page (1-100, default: 20)',
      },
      offset: {
        type: 'integer',
        description: 'Number of results to skip for pagination (default: 0)',
      },
    },
    required: ['session_token', 'agent_id'],
  },
  handler: handleListDisputes,
}
