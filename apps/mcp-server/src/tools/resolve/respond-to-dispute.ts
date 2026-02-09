import { z } from 'zod'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { respondToDispute } from '../../services/resolve-dispute.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const respondToDisputeSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  dispute_id: z.string().min(1, 'Dispute ID is required'),
  respondent_agent_id: z.string().min(1, 'Respondent agent ID is required'),
  response_summary: z.string().min(10, 'Response summary must be at least 10 characters').max(500),
  response_details: z.string().max(5000).optional(),
})

export type RespondToDisputeInput = z.infer<typeof respondToDisputeSchema>

export interface RespondToDisputeOutput {
  dispute_id: string
  status: string
  response_submitted_at: string
  claimant: {
    agent_id: string
    display_name: string | null
  }
  respondent: {
    agent_id: string
    display_name: string | null
  }
  message: string
  next_steps: string
}

export async function handleRespondToDispute(input: RespondToDisputeInput): Promise<{
  success: boolean
  data?: RespondToDisputeOutput
  error?: { code: string; message: string }
}> {
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  checkRateLimit(input.session_token)

  // Verify agent belongs to this operator
  const agent = await getAgentTrust(operator.id, input.respondent_agent_id)
  if (!agent) {
    throw new ApiError('AGENT_NOT_FOUND', 'Agent not found or does not belong to your account', 404)
  }

  const dispute = await respondToDispute({
    disputeExternalId: input.dispute_id,
    respondentAgentId: agent.id,
    responseSummary: input.response_summary,
    responseDetails: input.response_details,
  })

  logger.info(
    {
      operatorId: operator.id,
      disputeId: dispute.externalId,
      respondentAgentId: input.respondent_agent_id,
    },
    'Dispute response submitted'
  )

  return {
    success: true,
    data: {
      dispute_id: dispute.externalId,
      status: dispute.status,
      response_submitted_at: dispute.responseSubmittedAt?.toISOString() ?? new Date().toISOString(),
      claimant: {
        agent_id: dispute.claimantAgent.externalId,
        display_name: dispute.claimantAgent.displayName,
      },
      respondent: {
        agent_id: dispute.respondentAgent.externalId,
        display_name: dispute.respondentAgent.displayName,
      },
      message: 'Response submitted successfully.',
      next_steps:
        "Use get_evidence to review the claimant's evidence submissions and submit your own via submit_evidence. " +
        'Both parties can see all evidence — review and rebut before arbitration begins. ' +
        "The AI arbitrator will review all evidence and render a ruling that affects both parties' trust scores.",
    },
  }
}

export const respondToDisputeTool = {
  name: 'respond_to_dispute',
  description:
    'Submit a response to a dispute filed against you. ' +
    'You must respond before the deadline or the dispute will proceed to arbitration without your input. ' +
    'After responding, you can still submit additional evidence.',
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
      respondent_agent_id: {
        type: 'string',
        description: 'Your agent ID (must be the respondent of the dispute)',
      },
      response_summary: {
        type: 'string',
        description: 'Brief summary of your response/defense (10-500 characters)',
      },
      response_details: {
        type: 'string',
        description: 'Detailed explanation with supporting facts (up to 5000 characters)',
      },
    },
    required: ['session_token', 'dispute_id', 'respondent_agent_id', 'response_summary'],
  },
  handler: handleRespondToDispute,
}
