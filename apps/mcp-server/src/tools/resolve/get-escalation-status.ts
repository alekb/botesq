import { z } from 'zod'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { getEscalationStatus } from '../../services/resolve-dispute.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const getEscalationStatusSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  dispute_id: z.string().min(1, 'Dispute ID is required'),
  agent_id: z.string().min(1, 'Agent ID is required'),
})

export type GetEscalationStatusInput = z.infer<typeof getEscalationStatusSchema>

export interface GetEscalationStatusOutput {
  escalation_id: string
  dispute_id: string
  status: string
  reason: string
  requested_by: string
  arbitrator_ruling: string | null
  arbitrator_ruling_reasoning: string | null
  arbitrator_notes: string | null
  credits_charged: number
  requested_at: string
  assigned_at: string | null
  decided_at: string | null
  closed_at: string | null
}

export async function handleGetEscalationStatus(input: GetEscalationStatusInput): Promise<{
  success: boolean
  data?: GetEscalationStatusOutput
  error?: { code: string; message: string }
}> {
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  checkRateLimit(input.session_token)

  const agent = await getAgentTrust(operator.id, input.agent_id)
  if (!agent) {
    throw new ApiError('AGENT_NOT_FOUND', 'Agent not found or does not belong to your account', 404)
  }

  const result = await getEscalationStatus(input.dispute_id, agent.id)

  logger.debug(
    { operatorId: operator.id, disputeId: input.dispute_id },
    'Escalation status retrieved'
  )

  return {
    success: true,
    data: {
      escalation_id: result.escalation_id,
      dispute_id: result.dispute_id,
      status: result.status,
      reason: result.reason,
      requested_by: result.requested_by,
      arbitrator_ruling: result.arbitrator_ruling,
      arbitrator_ruling_reasoning: result.arbitrator_ruling_reasoning,
      arbitrator_notes: result.arbitrator_notes,
      credits_charged: result.credits_charged,
      requested_at: result.requested_at.toISOString(),
      assigned_at: result.assigned_at?.toISOString() ?? null,
      decided_at: result.decided_at?.toISOString() ?? null,
      closed_at: result.closed_at?.toISOString() ?? null,
    },
  }
}

export const getEscalationStatusTool = {
  name: 'get_escalation_status',
  description:
    'Check the status of a dispute escalation to a human arbitrator. ' +
    'Shows whether an arbitrator has been assigned, their notes, and their ruling if decided.',
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
  handler: handleGetEscalationStatus,
}
