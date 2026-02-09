import { z } from 'zod'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { rejectDecision } from '../../services/resolve-dispute.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

const REJECTION_REASONS = [
  'FACTUAL_ERROR',
  'EVIDENCE_IGNORED',
  'REASONING_FLAWED',
  'BIAS_DETECTED',
  'RULING_DISPROPORTIONATE',
  'OTHER',
] as const

export const rejectDecisionSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  dispute_id: z.string().min(1, 'Dispute ID is required'),
  agent_id: z.string().min(1, 'Agent ID is required'),
  rejection_reason: z.enum(REJECTION_REASONS).optional(),
  rejection_details: z.string().max(1000).optional(),
})

export type RejectDecisionInput = z.infer<typeof rejectDecisionSchema>

export interface RejectDecisionOutput {
  dispute_id: string
  status: string
  your_decision: 'rejected'
  can_escalate: boolean
  message: string
  next_steps: string
}

export async function handleRejectDecision(input: RejectDecisionInput): Promise<{
  success: boolean
  data?: RejectDecisionOutput
  error?: { code: string; message: string }
}> {
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  checkRateLimit(input.session_token)

  const agent = await getAgentTrust(operator.id, input.agent_id)
  if (!agent) {
    throw new ApiError('AGENT_NOT_FOUND', 'Agent not found or does not belong to your account', 404)
  }

  const dispute = await rejectDecision(
    input.dispute_id,
    agent.id,
    input.rejection_reason as never,
    input.rejection_details
  )

  logger.info(
    { operatorId: operator.id, disputeId: input.dispute_id, agentId: input.agent_id },
    'Decision rejected'
  )

  return {
    success: true,
    data: {
      dispute_id: dispute.externalId,
      status: dispute.status,
      your_decision: 'rejected',
      can_escalate: true,
      message:
        'You have rejected the AI ruling. You may now request escalation to a human arbitrator. ' +
        'Tip: providing a rejection_reason helps improve future rulings.',
      next_steps:
        'Use request_escalation to escalate this dispute to a human arbitrator. ' +
        'Escalation incurs an additional fee of 2000 credits. ' +
        'The human arbitrator decision is final.',
    },
  }
}

export const rejectDecisionTool = {
  name: 'reject_decision',
  description:
    'Reject the AI arbitration ruling on a dispute. ' +
    'After rejecting, you can request escalation to a human arbitrator using request_escalation. ' +
    'Escalation incurs an additional fee.',
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
      rejection_reason: {
        type: 'string',
        enum: [
          'FACTUAL_ERROR',
          'EVIDENCE_IGNORED',
          'REASONING_FLAWED',
          'BIAS_DETECTED',
          'RULING_DISPROPORTIONATE',
          'OTHER',
        ],
        description: 'Why you are rejecting the ruling. Helps improve future AI decisions.',
      },
      rejection_details: {
        type: 'string',
        description: 'Additional details about your rejection reason (max 1000 characters)',
      },
    },
    required: ['session_token', 'dispute_id', 'agent_id'],
  },
  handler: handleRejectDecision,
}
