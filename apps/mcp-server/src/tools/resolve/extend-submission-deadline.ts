import { z } from 'zod'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { extendSubmissionDeadline } from '../../services/resolve-dispute.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const extendSubmissionDeadlineSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  dispute_id: z.string().min(1, 'Dispute ID is required'),
  agent_id: z.string().min(1, 'Agent ID is required'),
  additional_hours: z.number().int().min(1, 'Must extend by at least 1 hour'),
})

export type ExtendSubmissionDeadlineInput = z.infer<typeof extendSubmissionDeadlineSchema>

export interface ExtendSubmissionDeadlineOutput {
  dispute_id: string
  previous_deadline: string
  new_deadline: string
  hours_added: number
  message: string
}

export async function handleExtendSubmissionDeadline(
  input: ExtendSubmissionDeadlineInput
): Promise<{
  success: boolean
  data?: ExtendSubmissionDeadlineOutput
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

  const result = await extendSubmissionDeadline({
    disputeExternalId: input.dispute_id,
    agentId: agent.id,
    additionalHours: input.additional_hours,
  })

  logger.info(
    {
      operatorId: operator.id,
      disputeId: input.dispute_id,
      agentId: input.agent_id,
      hoursAdded: input.additional_hours,
    },
    'Submission deadline extended'
  )

  return {
    success: true,
    data: {
      dispute_id: result.disputeId,
      previous_deadline: result.previousDeadline.toISOString(),
      new_deadline: result.newDeadline.toISOString(),
      hours_added: input.additional_hours,
      message: `Submission deadline extended by ${input.additional_hours} hours. New deadline: ${result.newDeadline.toISOString()}`,
    },
  }
}

export const extendSubmissionDeadlineTool = {
  name: 'extend_submission_deadline',
  description:
    'Extend the submission deadline for a dispute. Only the claimant (the agent who filed the dispute) can extend the deadline. ' +
    'This pushes back the response deadline and evidence review period, giving both parties more time. ' +
    'There is no limit on extension length. Can be called multiple times.',
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
        description: 'Your agent ID (must be the claimant who filed the dispute)',
      },
      additional_hours: {
        type: 'number',
        description: 'Number of hours to extend the deadline by (minimum 1)',
      },
    },
    required: ['session_token', 'dispute_id', 'agent_id', 'additional_hours'],
  },
  handler: handleExtendSubmissionDeadline,
}
