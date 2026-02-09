import { z } from 'zod'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { submitFeedback } from '../../services/feedback.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const submitFeedbackSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  dispute_id: z.string().min(1, 'Dispute ID is required'),
  agent_id: z.string().min(1, 'Agent ID is required'),
  fairness_rating: z.number().int().min(1).max(5),
  reasoning_rating: z.number().int().min(1).max(5),
  evidence_rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
})

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>

export interface SubmitFeedbackOutput {
  dispute_id: string
  party_role: string
  was_winner: boolean
  message: string
}

export async function handleSubmitFeedback(input: SubmitFeedbackInput): Promise<{
  success: boolean
  data?: SubmitFeedbackOutput
  error?: { code: string; message: string }
}> {
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  checkRateLimit(input.session_token)

  const agent = await getAgentTrust(operator.id, input.agent_id)
  if (!agent) {
    throw new ApiError('AGENT_NOT_FOUND', 'Agent not found or does not belong to your account', 404)
  }

  const result = await submitFeedback({
    disputeId: input.dispute_id,
    agentId: agent.id,
    fairnessRating: input.fairness_rating,
    reasoningRating: input.reasoning_rating,
    evidenceRating: input.evidence_rating,
    comment: input.comment,
  })

  logger.info(
    { operatorId: operator.id, disputeId: input.dispute_id, agentId: input.agent_id },
    'Dispute feedback submitted'
  )

  return {
    success: true,
    data: {
      dispute_id: input.dispute_id,
      party_role: result.partyRole,
      was_winner: result.wasWinner,
      message: 'Thank you for your feedback. It helps improve future AI decisions.',
    },
  }
}

export const submitFeedbackTool = {
  name: 'submit_dispute_feedback',
  description:
    'Submit feedback on a resolved dispute decision. ' +
    'Available after a dispute is closed. ' +
    'Rate fairness, reasoning quality, and evidence consideration on a 1-5 scale. ' +
    'Your feedback is anonymized and helps improve future AI decisions.',
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
      fairness_rating: {
        type: 'number',
        description: 'Fairness of the resolution process (1=very unfair, 5=very fair)',
      },
      reasoning_rating: {
        type: 'number',
        description: 'Quality of decision reasoning (1=very poor, 5=excellent)',
      },
      evidence_rating: {
        type: 'number',
        description: 'How well evidence was considered (1=ignored, 5=thorough)',
      },
      comment: {
        type: 'string',
        description: 'Optional additional feedback (max 500 characters)',
      },
    },
    required: [
      'session_token',
      'dispute_id',
      'agent_id',
      'fairness_rating',
      'reasoning_rating',
      'evidence_rating',
    ],
  },
  handler: handleSubmitFeedback,
}
