import { z } from 'zod'
import { authenticateSession } from '../services/auth.service.js'
import { checkRateLimit } from '../services/rate-limit.service.js'
import { getMatter } from '../services/matter.service.js'
import { ApiError } from '../types.js'

export const getMatterStatusSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  matter_id: z.string().min(1, 'Matter ID is required'),
})

export type GetMatterStatusInput = z.infer<typeof getMatterStatusSchema>

export interface GetMatterStatusOutput {
  matter_id: string
  status: string
  type: string
  title: string
  description?: string
  urgency: string
  created_at: string
  updated_at: string
  retainer?: {
    id: string
    status: string
  }
  documents_count: number
  messages_count: number
  assigned_attorney?: string
}

export async function handleGetMatterStatus(input: GetMatterStatusInput): Promise<{
  success: boolean
  data?: GetMatterStatusOutput
  error?: { code: string; message: string }
}> {
  // Authenticate session
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  // Check rate limits
  checkRateLimit(input.session_token)

  // Get the matter
  const matter = await getMatter(input.matter_id, operator.id)

  if (!matter) {
    throw new ApiError('MATTER_NOT_FOUND', 'Matter not found', 404)
  }

  // Get assigned attorney name if any
  const firstAssignment = matter.assignments[0]
  const assignedAttorney = firstAssignment
    ? `${firstAssignment.attorney.firstName} ${firstAssignment.attorney.lastName}`
    : undefined

  return {
    success: true,
    data: {
      matter_id: matter.externalId,
      status: matter.status,
      type: matter.type,
      title: matter.title,
      description: matter.description ?? undefined,
      urgency: matter.urgency,
      created_at: matter.createdAt.toISOString(),
      updated_at: matter.updatedAt.toISOString(),
      retainer: matter.retainer
        ? {
            id: matter.retainer.externalId,
            status: matter.retainer.status,
          }
        : undefined,
      documents_count: matter._count.documents,
      messages_count: matter._count.messages,
      assigned_attorney: assignedAttorney,
    },
  }
}

export const getMatterStatusTool = {
  name: 'get_matter_status',
  description: 'Get the current status and details of a legal matter.',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
      matter_id: {
        type: 'string',
        description: 'The matter ID (e.g., MATTER-XXXXXX)',
      },
    },
    required: ['session_token', 'matter_id'],
  },
  handler: handleGetMatterStatus,
}
