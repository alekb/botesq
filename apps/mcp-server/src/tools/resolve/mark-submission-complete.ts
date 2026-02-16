import { z } from 'zod'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { processArbitration } from '../../services/resolve-arbitration.service.js'
import { markSubmissionComplete } from '../../services/resolve-dispute.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const markSubmissionCompleteSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  dispute_id: z.string().min(1, 'Dispute ID is required'),
  agent_id: z.string().min(1, 'Agent ID is required'),
})

export type MarkSubmissionCompleteInput = z.infer<typeof markSubmissionCompleteSchema>

export interface MarkSubmissionCompleteOutput {
  dispute_id: string
  your_submission_complete: boolean
  other_party_complete: boolean
  message: string
  next_steps: string[]
}

export async function handleMarkSubmissionComplete(input: MarkSubmissionCompleteInput): Promise<{
  success: boolean
  data?: MarkSubmissionCompleteOutput
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

  const result = await markSubmissionComplete({
    disputeExternalId: input.dispute_id,
    agentId: agent.id,
  })

  logger.info(
    {
      operatorId: operator.id,
      disputeId: input.dispute_id,
      agentId: input.agent_id,
      bothComplete: result.bothComplete,
    },
    'Submission marked complete'
  )

  // Trigger arbitration immediately when both parties are done — no point waiting
  if (result.bothComplete) {
    processArbitration(result.internalDisputeId).catch((error) => {
      logger.error(
        { error, disputeId: input.dispute_id },
        'Failed to trigger automatic arbitration after both submissions complete'
      )
    })
  }

  const message = result.bothComplete
    ? 'Both parties have completed submissions. Arbitration is now in progress.'
    : 'Your submission is marked complete. Waiting for the other party to complete their submission.'

  const nextSteps = result.bothComplete
    ? [
        'The AI arbitrator is reviewing all evidence and will render a decision shortly.',
        'Use get_decision to retrieve the ruling.',
      ]
    : [
        'Check dispute status periodically with get_dispute.',
        'The decision will be rendered once both parties are ready, or after the review period expires.',
      ]

  return {
    success: true,
    data: {
      dispute_id: result.disputeId,
      your_submission_complete: result.yourSubmissionComplete,
      other_party_complete: result.otherPartyComplete,
      message,
      next_steps: nextSteps,
    },
  }
}

export const markSubmissionCompleteTool = {
  name: 'mark_submission_complete',
  description:
    'Signal that you are done submitting evidence for a dispute. ' +
    "Before calling this, use get_evidence to review the other party's submissions and submit rebuttals via submit_evidence. " +
    'Once both parties mark complete, the dispute proceeds to arbitration immediately. ' +
    'If neither party marks complete, arbitration begins automatically after a 24-hour review period.',
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
  handler: handleMarkSubmissionComplete,
}
