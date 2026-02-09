import { z } from 'zod'
import { ResolveDisputeClaimType } from '@botesq/database'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { canFileDispute, fileDispute } from '../../services/resolve-dispute.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const fileDisputeSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  transaction_id: z.string().min(1, 'Transaction ID is required'),
  claimant_agent_id: z.string().min(1, 'Claimant agent ID is required'),
  claim_type: z.enum([
    'NON_PERFORMANCE',
    'PARTIAL_PERFORMANCE',
    'QUALITY_ISSUE',
    'PAYMENT_DISPUTE',
    'MISREPRESENTATION',
    'BREACH_OF_TERMS',
    'OTHER',
  ]),
  claim_summary: z.string().min(10, 'Claim summary must be at least 10 characters').max(500),
  claim_details: z.string().max(5000).optional(),
  requested_resolution: z
    .string()
    .min(10, 'Requested resolution must be at least 10 characters')
    .max(1000),
})

export type FileDisputeInput = z.infer<typeof fileDisputeSchema>

export interface FileDisputeOutput {
  dispute_id: string
  transaction_id: string
  status: string
  claim_type: string
  claimant: {
    agent_id: string
    display_name: string | null
    trust_score: number
  }
  respondent: {
    agent_id: string
    display_name: string | null
    trust_score: number
  }
  response_deadline: string
  credits_charged: number
  was_free: boolean
  created_at: string
  message: string
}

export async function handleFileDispute(input: FileDisputeInput): Promise<{
  success: boolean
  data?: FileDisputeOutput
  error?: { code: string; message: string }
}> {
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  checkRateLimit(input.session_token)

  // Verify agent belongs to this operator
  const agent = await getAgentTrust(operator.id, input.claimant_agent_id)
  if (!agent) {
    throw new ApiError('AGENT_NOT_FOUND', 'Agent not found or does not belong to your account', 404)
  }

  // Check if can file and get cost estimate
  const canFile = await canFileDispute(input.transaction_id, agent.id)
  if (!canFile.canFile) {
    throw new ApiError('CANNOT_FILE_DISPUTE', canFile.reason ?? 'Cannot file dispute', 400)
  }

  const dispute = await fileDispute({
    transactionExternalId: input.transaction_id,
    claimantAgentId: agent.id,
    claimType: input.claim_type as ResolveDisputeClaimType,
    claimSummary: input.claim_summary,
    claimDetails: input.claim_details,
    requestedResolution: input.requested_resolution,
    operatorId: operator.id,
  })

  logger.info(
    {
      operatorId: operator.id,
      disputeId: dispute.externalId,
      transactionId: input.transaction_id,
      claimType: input.claim_type,
    },
    'Dispute filed'
  )

  const freeMessage = dispute.wasFree
    ? 'This dispute was filed for free (low value transaction or under monthly limit).'
    : `${dispute.creditsCharged} credits were charged for this dispute.`

  return {
    success: true,
    data: {
      dispute_id: dispute.externalId,
      transaction_id: dispute.transaction.externalId,
      status: dispute.status,
      claim_type: dispute.claimType,
      claimant: {
        agent_id: dispute.claimantAgent.externalId,
        display_name: dispute.claimantAgent.displayName,
        trust_score: dispute.claimantAgent.trustScore,
      },
      respondent: {
        agent_id: dispute.respondentAgent.externalId,
        display_name: dispute.respondentAgent.displayName,
        trust_score: dispute.respondentAgent.trustScore,
      },
      response_deadline: dispute.responseDeadline.toISOString(),
      credits_charged: dispute.creditsCharged,
      was_free: dispute.wasFree,
      created_at: dispute.createdAt.toISOString(),
      message:
        `Dispute filed successfully. ${freeMessage} ` +
        `The respondent has until ${dispute.responseDeadline.toISOString()} to submit their response. ` +
        'You can strengthen your case by submitting evidence using submit_evidence. ' +
        'Use get_evidence to review all submissions from both parties and submit rebuttals if needed. ' +
        'Once both parties are ready, the dispute proceeds to AI arbitration.',
    },
  }
}

export const fileDisputeTool = {
  name: 'file_dispute',
  description:
    'File a dispute against another party in a transaction. ' +
    'Disputes are resolved by AI arbitration. ' +
    'Filing is free for transactions under $100 or if you have filed fewer than 5 disputes this month. ' +
    'Otherwise, a credit fee applies based on the transaction value.',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
      transaction_id: {
        type: 'string',
        description: 'Transaction ID (RTXN-XXXX format)',
      },
      claimant_agent_id: {
        type: 'string',
        description: 'Your agent ID (must be a party to the transaction)',
      },
      claim_type: {
        type: 'string',
        enum: [
          'NON_PERFORMANCE',
          'PARTIAL_PERFORMANCE',
          'QUALITY_ISSUE',
          'PAYMENT_DISPUTE',
          'MISREPRESENTATION',
          'BREACH_OF_TERMS',
          'OTHER',
        ],
        description: 'Type of claim being made',
      },
      claim_summary: {
        type: 'string',
        description: 'Brief summary of the claim (10-500 characters)',
      },
      claim_details: {
        type: 'string',
        description:
          'Detailed explanation of the claim with supporting facts (up to 5000 characters)',
      },
      requested_resolution: {
        type: 'string',
        description: 'What resolution you are seeking (10-1000 characters)',
      },
    },
    required: [
      'session_token',
      'transaction_id',
      'claimant_agent_id',
      'claim_type',
      'claim_summary',
      'requested_resolution',
    ],
  },
  handler: handleFileDispute,
}
