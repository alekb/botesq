import { z } from 'zod'
import { authenticateSession } from '../services/auth.service.js'
import { checkRateLimit } from '../services/rate-limit.service.js'
import { acceptRetainer, getRetainer, generateSigningUrl } from '../services/retainer.service.js'
import { ApiError } from '../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const acceptRetainerSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  retainer_id: z.string().min(1, 'Retainer ID is required'),
  pre_auth_token: z.string().optional(),
})

export type AcceptRetainerInput = z.infer<typeof acceptRetainerSchema>

export interface AcceptRetainerOutput {
  retainer_id: string
  status: 'accepted' | 'pending_manual'
  accepted_at?: string
  accepted_by?: string
  matter: {
    id: string
    status: string
  }
  manual_signing_url?: string
  message: string
  next_steps: string[]
}

export async function handleAcceptRetainer(input: AcceptRetainerInput): Promise<{
  success: boolean
  data?: AcceptRetainerOutput
  error?: { code: string; message: string }
}> {
  // Authenticate session
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  // Check rate limits
  checkRateLimit(input.session_token)

  // Get the retainer first to validate it exists
  const existingRetainer = await getRetainer(input.retainer_id, operator.id)
  if (!existingRetainer) {
    throw new ApiError('RETAINER_NOT_FOUND', 'Retainer not found', 404)
  }

  // Check if pre-auth is available and required
  const hasPreAuth = !!operator.preAuthToken
  const providedPreAuth = input.pre_auth_token

  // If no pre-auth token provided and operator doesn't have pre-auth, require manual signing
  if (!providedPreAuth && !hasPreAuth) {
    return {
      success: true,
      data: {
        retainer_id: existingRetainer.externalId,
        status: 'pending_manual',
        matter: existingRetainer.matter
          ? {
              id: existingRetainer.matter.externalId,
              status: existingRetainer.matter.status,
            }
          : { id: '', status: 'UNKNOWN' },
        manual_signing_url: generateSigningUrl(existingRetainer.externalId),
        message:
          'Manual signature required. Please have an authorized representative sign the retainer agreement.',
        next_steps: [
          'Visit the manual signing URL to review and sign the retainer',
          'Once signed, the matter will be automatically activated',
          'You will receive a confirmation when the retainer is accepted',
        ],
      },
    }
  }

  // Determine signature method and acceptedBy
  let signatureMethod: string
  let acceptedBy: string

  if (providedPreAuth) {
    signatureMethod = 'agent_preauth'
    acceptedBy = `agent:${session.agentId ?? 'unknown'}`
  } else if (hasPreAuth) {
    // Operator has pre-auth configured but agent didn't provide token
    // This means the agent is authorized to accept on behalf of operator
    signatureMethod = 'agent_preauth'
    acceptedBy = `agent:${session.agentId ?? 'unknown'}`
  } else {
    signatureMethod = 'manual'
    acceptedBy = 'operator'
  }

  try {
    const { retainer, matterActivated } = await acceptRetainer({
      retainerId: input.retainer_id,
      operatorId: operator.id,
      acceptedBy,
      signatureMethod,
      preAuthToken: providedPreAuth,
    })

    logger.info(
      {
        retainerId: retainer.externalId,
        matterId: retainer.matter?.externalId,
        acceptedBy,
        matterActivated,
      },
      'Retainer accepted via API'
    )

    return {
      success: true,
      data: {
        retainer_id: retainer.externalId,
        status: 'accepted',
        accepted_at: retainer.acceptedAt?.toISOString(),
        accepted_by: acceptedBy,
        matter: retainer.matter
          ? {
              id: retainer.matter.externalId,
              status: retainer.matter.status,
            }
          : { id: '', status: 'UNKNOWN' },
        message: matterActivated
          ? 'Retainer accepted. Matter is now active and ready for legal services.'
          : 'Retainer accepted.',
        next_steps: matterActivated
          ? [
              'Your matter is now active',
              'You can submit documents using submit_document',
              'You can ask legal questions using ask_legal_question',
              'You can request consultations using request_consultation',
            ]
          : ['Retainer accepted. Matter will be activated shortly.'],
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to accept retainer'

    if (message.includes('expired')) {
      throw new ApiError('RETAINER_EXPIRED', 'Retainer has expired. Please request new terms.', 400)
    }

    if (message.includes('Invalid pre-authorization')) {
      throw new ApiError('INVALID_PREAUTH', 'Invalid pre-authorization token', 403)
    }

    throw new ApiError('RETAINER_ERROR', message, 400)
  }
}

export const acceptRetainerTool = {
  name: 'accept_retainer',
  description:
    'Accept a retainer agreement to activate a matter. Requires either a pre-authorization token or will return a manual signing URL.',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
      retainer_id: {
        type: 'string',
        description: 'The retainer ID to accept',
      },
      pre_auth_token: {
        type: 'string',
        description:
          'Pre-authorization token if the operator has authorized agent acceptance. If not provided and operator has pre-auth configured, acceptance will proceed automatically.',
      },
    },
    required: ['session_token', 'retainer_id'],
  },
  handler: handleAcceptRetainer,
}
