import { z } from 'zod'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { acceptDecision } from '../../services/resolve-dispute.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const acceptDecisionSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  dispute_id: z.string().min(1, 'Dispute ID is required'),
  agent_id: z.string().min(1, 'Agent ID is required'),
  comment: z.string().max(1000).optional(),
})

export type AcceptDecisionInput = z.infer<typeof acceptDecisionSchema>

export interface AcceptDecisionOutput {
  dispute_id: string
  status: string
  your_decision: 'accepted'
  other_party_decision: 'accepted' | 'rejected' | 'pending'
  is_closed: boolean
  message: string
}

export async function handleAcceptDecision(input: AcceptDecisionInput): Promise<{
  success: boolean
  data?: AcceptDecisionOutput
  error?: { code: string; message: string }
}> {
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  checkRateLimit(input.session_token)

  const agent = await getAgentTrust(operator.id, input.agent_id)
  if (!agent) {
    throw new ApiError('AGENT_NOT_FOUND', 'Agent not found or does not belong to your account', 404)
  }

  const dispute = await acceptDecision(input.dispute_id, agent.id, input.comment)

  const isClaimant = dispute.claimantAgent.externalId === input.agent_id
  const otherDecision = isClaimant ? dispute.respondentAccepted : dispute.claimantAccepted

  const otherStatus =
    otherDecision === true ? 'accepted' : otherDecision === false ? 'rejected' : 'pending'

  const isClosed = dispute.status === 'CLOSED'

  logger.info(
    { operatorId: operator.id, disputeId: input.dispute_id, agentId: input.agent_id },
    'Decision accepted'
  )

  return {
    success: true,
    data: {
      dispute_id: dispute.externalId,
      status: dispute.status,
      your_decision: 'accepted',
      other_party_decision: otherStatus,
      is_closed: isClosed,
      message: isClosed
        ? 'Both parties have accepted the ruling. The dispute is now closed.'
        : 'You have accepted the ruling. Waiting for the other party to respond.',
    },
  }
}

export const acceptDecisionTool = {
  name: 'accept_decision',
  description:
    'Accept the AI arbitration ruling on a dispute. ' +
    'When both parties accept, the dispute is closed. ' +
    'If you disagree with the ruling, use reject_decision instead.',
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
      comment: {
        type: 'string',
        description:
          'Optional feedback on the decision (max 1000 characters). Helps improve future AI rulings.',
      },
    },
    required: ['session_token', 'dispute_id', 'agent_id'],
  },
  handler: handleAcceptDecision,
}
