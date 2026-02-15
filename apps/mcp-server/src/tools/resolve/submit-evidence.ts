import { z } from 'zod'
import { ResolveEvidenceType } from '@botesq/database'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { addEvidence } from '../../services/resolve-dispute.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const submitEvidenceSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  dispute_id: z.string().min(1, 'Dispute ID is required'),
  agent_id: z.string().min(1, 'Agent ID is required'),
  evidence_type: z.enum([
    'TEXT_STATEMENT',
    'COMMUNICATION_LOG',
    'AGREEMENT_EXCERPT',
    'TIMELINE',
    'OTHER',
  ]),
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(10, 'Content must be at least 10 characters').max(10000),
})

export type SubmitEvidenceInput = z.infer<typeof submitEvidenceSchema>

export interface SubmitEvidenceOutput {
  evidence_id: string
  dispute_id: string
  evidence_type: string
  title: string
  submitted_by_role: 'claimant' | 'respondent'
  message: string
}

export async function handleSubmitEvidence(input: SubmitEvidenceInput): Promise<{
  success: boolean
  data?: SubmitEvidenceOutput
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

  const result = await addEvidence({
    disputeExternalId: input.dispute_id,
    submittingAgentId: agent.id,
    evidenceType: input.evidence_type as ResolveEvidenceType,
    title: input.title,
    content: input.content,
  })

  logger.info(
    {
      operatorId: operator.id,
      disputeId: input.dispute_id,
      evidenceId: result.evidenceId,
      agentId: agent.externalId,
    },
    'Evidence submitted'
  )

  return {
    success: true,
    data: {
      evidence_id: result.evidenceId,
      dispute_id: input.dispute_id,
      evidence_type: input.evidence_type,
      title: input.title,
      submitted_by_role: 'claimant', // The service determines this from agent ID
      message:
        'Evidence submitted successfully. Use get_evidence to review all submissions from both parties. ' +
        "You can submit additional evidence to rebut the other party's claims. " +
        'When you are done submitting evidence, call mark_submission_complete. ' +
        'Arbitration begins once both parties mark complete, or after a 24-hour review period.',
    },
  }
}

export const submitEvidenceTool = {
  name: 'submit_evidence',
  description:
    'Submit evidence to support your position in a dispute. ' +
    'Evidence can be submitted by either party until arbitration begins. ' +
    'Types include TEXT_STATEMENT, COMMUNICATION_LOG, AGREEMENT_EXCERPT, TIMELINE, or OTHER.',
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
      evidence_type: {
        type: 'string',
        enum: ['TEXT_STATEMENT', 'COMMUNICATION_LOG', 'AGREEMENT_EXCERPT', 'TIMELINE', 'OTHER'],
        description: 'Type of evidence being submitted',
      },
      title: {
        type: 'string',
        description: 'Brief title for this evidence (up to 200 characters)',
      },
      content: {
        type: 'string',
        description: 'The evidence content (10-10000 characters)',
      },
    },
    required: ['session_token', 'dispute_id', 'agent_id', 'evidence_type', 'title', 'content'],
  },
  handler: handleSubmitEvidence,
}
