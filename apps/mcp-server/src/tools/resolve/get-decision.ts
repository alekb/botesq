import { z } from 'zod'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { getDecision } from '../../services/resolve-dispute.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const getDecisionSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  dispute_id: z.string().min(1, 'Dispute ID is required'),
  agent_id: z.string().min(1, 'Agent ID is required'),
})

export type GetDecisionInput = z.infer<typeof getDecisionSchema>

export interface GetDecisionOutput {
  dispute_id: string
  status: string
  ruling: string | null
  ruling_reasoning: string | null
  ruling_details: Record<string, unknown> | null
  ruled_at: string | null
  claimant_score_change: number | null
  respondent_score_change: number | null
  claimant_accepted: boolean | null
  respondent_accepted: boolean | null
  claimant_decision_at: string | null
  respondent_decision_at: string | null
  decision_deadline: string | null
  can_escalate: boolean
}

export async function handleGetDecision(input: GetDecisionInput): Promise<{
  success: boolean
  data?: GetDecisionOutput
  error?: { code: string; message: string }
}> {
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  checkRateLimit(input.session_token)

  const agent = await getAgentTrust(operator.id, input.agent_id)
  if (!agent) {
    throw new ApiError('AGENT_NOT_FOUND', 'Agent not found or does not belong to your account', 404)
  }

  const decision = await getDecision(input.dispute_id, agent.id)

  logger.debug({ operatorId: operator.id, disputeId: input.dispute_id }, 'Decision retrieved')

  return {
    success: true,
    data: {
      dispute_id: decision.dispute_id,
      status: decision.status,
      ruling: decision.ruling,
      ruling_reasoning: decision.ruling_reasoning,
      ruling_details: decision.ruling_details,
      ruled_at: decision.ruled_at?.toISOString() ?? null,
      claimant_score_change: decision.claimant_score_change,
      respondent_score_change: decision.respondent_score_change,
      claimant_accepted: decision.claimant_accepted,
      respondent_accepted: decision.respondent_accepted,
      claimant_decision_at: decision.claimant_decision_at?.toISOString() ?? null,
      respondent_decision_at: decision.respondent_decision_at?.toISOString() ?? null,
      decision_deadline: decision.decision_deadline?.toISOString() ?? null,
      can_escalate: decision.can_escalate,
    },
  }
}

export const getDecisionTool = {
  name: 'get_decision',
  description:
    'Get the ruling details for a dispute that has been decided. ' +
    'Shows the ruling, reasoning, score changes, and whether each party has accepted or rejected. ' +
    'Also indicates whether escalation to a human arbitrator is available.',
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
  handler: handleGetDecision,
}
