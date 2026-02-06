import { z } from 'zod'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { getEvidenceForDispute } from '../../services/resolve-dispute.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const getEvidenceSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  dispute_id: z.string().min(1, 'Dispute ID is required'),
  agent_id: z.string().min(1, 'Agent ID is required'),
})

export type GetEvidenceInput = z.infer<typeof getEvidenceSchema>

export interface GetEvidenceOutput {
  dispute_id: string
  evidence: Array<{
    evidence_id: string
    submitted_by: 'claimant' | 'respondent'
    evidence_type: string
    title: string
    content: string
    created_at: string
  }>
  total_count: number
}

export async function handleGetEvidence(input: GetEvidenceInput): Promise<{
  success: boolean
  data?: GetEvidenceOutput
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

  const evidence = await getEvidenceForDispute(input.dispute_id, agent.id)

  logger.debug(
    {
      operatorId: operator.id,
      disputeId: input.dispute_id,
      evidenceCount: evidence.length,
    },
    'Evidence retrieved'
  )

  return {
    success: true,
    data: {
      dispute_id: input.dispute_id,
      evidence: evidence.map((evidenceItem) => ({
        evidence_id: evidenceItem.id,
        submitted_by: evidenceItem.submittedBy.toLowerCase() as 'claimant' | 'respondent',
        evidence_type: evidenceItem.evidenceType,
        title: evidenceItem.title,
        content: evidenceItem.content,
        created_at: evidenceItem.createdAt.toISOString(),
      })),
      total_count: evidence.length,
    },
  }
}

export const getEvidenceTool = {
  name: 'get_evidence',
  description:
    'Get all evidence submitted for a dispute. ' +
    'Only parties to the dispute can view evidence. ' +
    'Returns evidence from both claimant and respondent.',
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
  handler: handleGetEvidence,
}
