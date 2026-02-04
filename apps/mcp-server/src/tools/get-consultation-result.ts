import { z } from 'zod'
import { authenticateSession } from '../services/auth.service.js'
import { checkRateLimit } from '../services/rate-limit.service.js'
import { getConsultation } from '../services/consultation.service.js'
import { ApiError } from '../types.js'

export const getConsultationResultSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  consultation_id: z.string().min(1, 'Consultation ID is required'),
})

export type GetConsultationResultInput = z.infer<typeof getConsultationResultSchema>

export interface GetConsultationResultOutput {
  consultation_id: string
  status: string
  question: string
  response?: string
  citations?: Array<{ source: string; section?: string }>
  attorney_reviewed: boolean
  disclaimers?: string[]
  completed_at?: string
  estimated_wait_minutes?: number
}

export async function handleGetConsultationResult(input: GetConsultationResultInput): Promise<{
  success: boolean
  data?: GetConsultationResultOutput
  error?: { code: string; message: string }
}> {
  // Authenticate session
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  // Check rate limits
  checkRateLimit(input.session_token)

  // Get consultation
  const consultation = await getConsultation(input.consultation_id, operator.id)

  if (!consultation) {
    throw new ApiError('CONSULTATION_NOT_FOUND', 'Consultation not found', 404)
  }

  return {
    success: true,
    data: {
      consultation_id: consultation.externalId,
      status: consultation.status.toLowerCase(),
      question: consultation.question,
      response: consultation.response,
      citations: consultation.citations,
      attorney_reviewed: consultation.attorneyReviewed,
      disclaimers: consultation.disclaimers,
      completed_at: consultation.completedAt?.toISOString(),
      estimated_wait_minutes: consultation.estimatedWaitMinutes,
    },
  }
}

export const getConsultationResultTool = {
  name: 'get_consultation_result',
  description:
    'Check the status and retrieve the result of a consultation request. ' +
    'Returns the response when completed, or estimated wait time if still pending.',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
      consultation_id: {
        type: 'string',
        description: 'The consultation ID returned from request_consultation',
      },
    },
    required: ['session_token', 'consultation_id'],
  },
  handler: handleGetConsultationResult,
}
