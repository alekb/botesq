import { z } from 'zod'
import { authenticateSession } from '../services/auth.service.js'
import { checkRateLimit } from '../services/rate-limit.service.js'
import { getRetainerForMatter, createRetainer } from '../services/retainer.service.js'
import { getMatter } from '../services/matter.service.js'
import { ApiError } from '../types.js'

export const getRetainerTermsSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  matter_id: z.string().min(1, 'Matter ID is required'),
})

export type GetRetainerTermsInput = z.infer<typeof getRetainerTermsSchema>

export interface GetRetainerTermsOutput {
  retainer_id: string
  matter_id: string
  terms: {
    scope: string
    fee_arrangement: string
    estimated_fee?: number
    engagement_terms: string
  }
  status: string
  expires_at: string
  can_accept_via_preauth: boolean
  manual_signing_url: string
}

export async function handleGetRetainerTerms(
  input: GetRetainerTermsInput
): Promise<{ success: boolean; data?: GetRetainerTermsOutput; error?: { code: string; message: string } }> {
  // Authenticate session
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  // Check rate limits
  checkRateLimit(input.session_token)

  // Get the matter first
  const matter = await getMatter(input.matter_id, operator.id)
  if (!matter) {
    throw new ApiError('MATTER_NOT_FOUND', 'Matter not found', 404)
  }

  // Get or create retainer for the matter
  let retainer = await getRetainerForMatter(input.matter_id, operator.id)

  if (!retainer) {
    // Create a retainer for this matter
    retainer = await createRetainer({
      operatorId: operator.id,
      matterId: matter.id,
      scope: `Legal services for: ${matter.title}`,
    })
  }

  // Check if operator has pre-auth configured
  const canAcceptViaPreauth = !!operator.preAuthToken

  return {
    success: true,
    data: {
      retainer_id: retainer.externalId,
      matter_id: matter.externalId,
      terms: {
        scope: retainer.scope,
        fee_arrangement: retainer.feeArrangement,
        estimated_fee: retainer.estimatedFee ?? undefined,
        engagement_terms: retainer.engagementTerms,
      },
      status: retainer.status,
      expires_at: retainer.expiresAt.toISOString(),
      can_accept_via_preauth: canAcceptViaPreauth,
      manual_signing_url: `https://botesq.io/sign/${retainer.externalId}`,
    },
  }
}

export const getRetainerTermsTool = {
  name: 'get_retainer_terms',
  description:
    'Get the retainer agreement terms for a matter. Returns the engagement terms that must be accepted before the matter can proceed.',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
      matter_id: {
        type: 'string',
        description: 'The matter ID to get retainer terms for',
      },
    },
    required: ['session_token', 'matter_id'],
  },
  handler: handleGetRetainerTerms,
}
