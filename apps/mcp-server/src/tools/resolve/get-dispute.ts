import { z } from 'zod'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { getDispute } from '../../services/resolve-dispute.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const getDisputeSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  dispute_id: z.string().min(1, 'Dispute ID is required'),
  agent_id: z.string().min(1, 'Agent ID is required'),
})

export type GetDisputeInput = z.infer<typeof getDisputeSchema>

export interface GetDisputeOutput {
  dispute_id: string
  transaction: {
    transaction_id: string
    title: string
    stated_value_cents: number | null
  }
  status: string
  claim: {
    type: string
    summary: string
    details: string | null
    requested_resolution: string
  }
  response: {
    summary: string | null
    details: string | null
    submitted_at: string | null
    deadline: string
  }
  claimant: {
    agent_id: string
    display_name: string | null
    trust_score: number
  }
  respondent: {
    agent_id: string
    display_name: string | null
    trust_score: number
  }
  ruling: {
    decision: string | null
    reasoning: string | null
    details: Record<string, unknown> | null
    ruled_at: string | null
    claimant_score_change: number | null
    respondent_score_change: number | null
  }
  evidence_count: number
  credits_charged: number
  was_free: boolean
  created_at: string
}

export async function handleGetDispute(input: GetDisputeInput): Promise<{
  success: boolean
  data?: GetDisputeOutput
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

  const dispute = await getDispute(input.dispute_id, agent.id)

  if (!dispute) {
    throw new ApiError('DISPUTE_NOT_FOUND', 'Dispute not found', 404)
  }

  logger.debug(
    {
      operatorId: operator.id,
      disputeId: dispute.externalId,
    },
    'Dispute retrieved'
  )

  return {
    success: true,
    data: {
      dispute_id: dispute.externalId,
      transaction: {
        transaction_id: dispute.transaction.externalId,
        title: dispute.transaction.title,
        stated_value_cents: dispute.transaction.statedValue,
      },
      status: dispute.status,
      claim: {
        type: dispute.claimType,
        summary: dispute.claimSummary,
        details: dispute.claimDetails,
        requested_resolution: dispute.requestedResolution,
      },
      response: {
        summary: dispute.responseSummary,
        details: dispute.responseDetails,
        submitted_at: dispute.responseSubmittedAt?.toISOString() ?? null,
        deadline: dispute.responseDeadline.toISOString(),
      },
      claimant: {
        agent_id: dispute.claimantAgent.externalId,
        display_name: dispute.claimantAgent.displayName,
        trust_score: dispute.claimantAgent.trustScore,
      },
      respondent: {
        agent_id: dispute.respondentAgent.externalId,
        display_name: dispute.respondentAgent.displayName,
        trust_score: dispute.respondentAgent.trustScore,
      },
      ruling: {
        decision: dispute.ruling,
        reasoning: dispute.rulingReasoning,
        details: dispute.rulingDetails,
        ruled_at: dispute.ruledAt?.toISOString() ?? null,
        claimant_score_change: dispute.claimantScoreChange,
        respondent_score_change: dispute.respondentScoreChange,
      },
      evidence_count: dispute.evidenceCount,
      credits_charged: dispute.creditsCharged,
      was_free: dispute.wasFree,
      created_at: dispute.createdAt.toISOString(),
    },
  }
}

export const getDisputeTool = {
  name: 'get_dispute',
  description:
    'Get the current status and details of a dispute. ' +
    'Only parties to the dispute can view it.',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
      dispute_id: {
        type: 'string',
        description: 'Dispute ID (RDISP-XXXX format)',
      },
      agent_id: {
        type: 'string',
        description: 'Your agent ID (must be a party to the dispute)',
      },
    },
    required: ['session_token', 'dispute_id', 'agent_id'],
  },
  handler: handleGetDispute,
}
