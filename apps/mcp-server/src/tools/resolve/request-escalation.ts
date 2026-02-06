import { z } from 'zod'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { requestEscalation } from '../../services/resolve-dispute.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const requestEscalationSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  dispute_id: z.string().min(1, 'Dispute ID is required'),
  agent_id: z.string().min(1, 'Agent ID is required'),
  reason: z
    .string()
    .min(20, 'Escalation reason must be at least 20 characters')
    .max(2000, 'Escalation reason must be at most 2000 characters'),
})

export type RequestEscalationInput = z.infer<typeof requestEscalationSchema>

export interface RequestEscalationOutput {
  escalation_id: string
  dispute_id: string
  status: string
  reason: string
  credits_charged: number
  requested_at: string
  message: string
  next_steps: string
}

export async function handleRequestEscalation(input: RequestEscalationInput): Promise<{
  success: boolean
  data?: RequestEscalationOutput
  error?: { code: string; message: string }
}> {
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  checkRateLimit(input.session_token)

  const agent = await getAgentTrust(operator.id, input.agent_id)
  if (!agent) {
    throw new ApiError('AGENT_NOT_FOUND', 'Agent not found or does not belong to your account', 404)
  }

  const result = await requestEscalation({
    disputeExternalId: input.dispute_id,
    agentId: agent.id,
    reason: input.reason,
    operatorId: operator.id,
  })

  logger.info(
    {
      operatorId: operator.id,
      escalationId: result.escalation_id,
      disputeId: input.dispute_id,
      creditsCharged: result.credits_charged,
    },
    'Escalation requested'
  )

  return {
    success: true,
    data: {
      escalation_id: result.escalation_id,
      dispute_id: result.dispute_id,
      status: result.status,
      reason: result.reason,
      credits_charged: result.credits_charged,
      requested_at: result.requested_at.toISOString(),
      message:
        `Escalation requested successfully. ${result.credits_charged} credits were charged. ` +
        'A human arbitrator will review this dispute.',
      next_steps:
        'Use get_escalation_status to check the progress of your escalation. ' +
        'A human arbitrator will be assigned and will review all evidence and the AI ruling. ' +
        'The human arbitrator decision is final.',
    },
  }
}

export const requestEscalationTool = {
  name: 'request_escalation',
  description:
    'Request escalation of a dispute to a human arbitrator. ' +
    'You must have first rejected the AI ruling using reject_decision. ' +
    'Escalation costs 2000 credits. The human arbitrator decision is final.',
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
        description: 'Your agent ID (must be the party that rejected the ruling)',
      },
      reason: {
        type: 'string',
        description:
          'Why you are requesting escalation and what you believe the AI ruling got wrong (20-2000 characters)',
      },
    },
    required: ['session_token', 'dispute_id', 'agent_id', 'reason'],
  },
  handler: handleRequestEscalation,
}
