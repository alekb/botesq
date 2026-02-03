import { z } from 'zod'
import { MatterStatus } from '@botesq/database'
import { authenticateSession } from '../services/auth.service.js'
import { checkRateLimit } from '../services/rate-limit.service.js'
import { listMatters } from '../services/matter.service.js'

export const listMattersSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  status: z
    .enum(['PENDING_RETAINER', 'ACTIVE', 'ON_HOLD', 'RESOLVED', 'CLOSED'])
    .optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
})

export type ListMattersInput = z.infer<typeof listMattersSchema>

export interface ListMattersOutput {
  matters: Array<{
    matter_id: string
    status: string
    type: string
    title: string
    created_at: string
    updated_at: string
    retainer?: {
      id: string
      status: string
    }
    documents_count: number
    messages_count: number
  }>
  total: number
  has_more: boolean
}

export async function handleListMatters(
  input: ListMattersInput
): Promise<{ success: boolean; data?: ListMattersOutput; error?: { code: string; message: string } }> {
  // Authenticate session
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  // Check rate limits
  checkRateLimit(input.session_token)

  // List matters
  const { matters, total, hasMore } = await listMatters({
    operatorId: operator.id,
    status: input.status as MatterStatus | undefined,
    limit: input.limit,
    offset: input.offset,
  })

  return {
    success: true,
    data: {
      matters: matters.map((matter) => ({
        matter_id: matter.externalId,
        status: matter.status,
        type: matter.type,
        title: matter.title,
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
      })),
      total,
      has_more: hasMore,
    },
  }
}

export const listMattersTool = {
  name: 'list_matters',
  description: 'List legal matters for your organization. Can filter by status.',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
      status: {
        type: 'string',
        enum: ['PENDING_RETAINER', 'ACTIVE', 'ON_HOLD', 'RESOLVED', 'CLOSED'],
        description: 'Filter by matter status',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of matters to return (default 20, max 100)',
      },
      offset: {
        type: 'number',
        description: 'Number of matters to skip (for pagination)',
      },
    },
    required: ['session_token'],
  },
  handler: handleListMatters,
}
