import { z } from 'zod'
import { MatterType, MatterUrgency } from '@botesq/database'
import { authenticateSession } from '../services/auth.service.js'
import { checkRateLimit } from '../services/rate-limit.service.js'
import { createMatter } from '../services/matter.service.js'
import { PaymentError } from '../types.js'
import { prisma } from '@botesq/database'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

// Cost to create a matter
const CREATE_MATTER_COST = 10000

export const createMatterSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  matter_type: z.enum([
    'CONTRACT_REVIEW',
    'ENTITY_FORMATION',
    'COMPLIANCE',
    'IP_TRADEMARK',
    'IP_COPYRIGHT',
    'IP_PATENT',
    'EMPLOYMENT',
    'LITIGATION_CONSULTATION',
  ]),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  urgency: z.enum(['low', 'standard', 'high', 'urgent']).optional(),
})

export type CreateMatterInput = z.infer<typeof createMatterSchema>

export interface CreateMatterOutput {
  matter_id: string
  status: string
  type: string
  title: string
  retainer_required: boolean
  retainer?: {
    id: string
    status: string
  }
  created_at: string
  credits_used: number
  credits_remaining: number
}

/**
 * Map input urgency to enum
 */
function mapUrgency(urgency?: string): MatterUrgency | undefined {
  if (!urgency) return undefined
  const map: Record<string, MatterUrgency> = {
    low: MatterUrgency.LOW,
    standard: MatterUrgency.STANDARD,
    high: MatterUrgency.HIGH,
    urgent: MatterUrgency.URGENT,
  }
  return map[urgency]
}

export async function handleCreateMatter(input: CreateMatterInput): Promise<{
  success: boolean
  data?: CreateMatterOutput
  error?: { code: string; message: string }
}> {
  // Authenticate session
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  // Check rate limits
  checkRateLimit(input.session_token)

  // Check credits
  if (operator.creditBalance < CREATE_MATTER_COST) {
    throw new PaymentError('INSUFFICIENT_CREDITS', 'Not enough credits to create a matter')
  }

  // Create the matter
  const { matter, retainerRequired } = await createMatter({
    operatorId: operator.id,
    agentId: session.agentId ?? undefined,
    type: input.matter_type as MatterType,
    title: input.title,
    description: input.description,
    urgency: mapUrgency(input.urgency),
  })

  // Deduct credits
  await prisma.$transaction(async (tx) => {
    await tx.operator.update({
      where: { id: operator.id },
      data: { creditBalance: { decrement: CREATE_MATTER_COST } },
    })

    await tx.creditTransaction.create({
      data: {
        operatorId: operator.id,
        type: 'DEDUCTION',
        amount: -CREATE_MATTER_COST,
        balanceBefore: operator.creditBalance,
        balanceAfter: operator.creditBalance - CREATE_MATTER_COST,
        description: `Create matter: ${matter.externalId}`,
        referenceType: 'matter',
        referenceId: matter.id,
      },
    })
  })

  logger.info(
    {
      operatorId: operator.id,
      matterId: matter.externalId,
      type: matter.type,
      creditsUsed: CREATE_MATTER_COST,
    },
    'Matter created successfully'
  )

  return {
    success: true,
    data: {
      matter_id: matter.externalId,
      status: matter.status,
      type: matter.type,
      title: matter.title,
      retainer_required: retainerRequired,
      retainer: matter.retainer
        ? {
            id: matter.retainer.externalId,
            status: matter.retainer.status,
          }
        : undefined,
      created_at: matter.createdAt.toISOString(),
      credits_used: CREATE_MATTER_COST,
      credits_remaining: operator.creditBalance - CREATE_MATTER_COST,
    },
  }
}

export const createMatterTool = {
  name: 'create_matter',
  description:
    'Create a new legal matter. Matters organize related legal work and require a retainer agreement before becoming active.',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
      matter_type: {
        type: 'string',
        enum: [
          'CONTRACT_REVIEW',
          'ENTITY_FORMATION',
          'COMPLIANCE',
          'IP_TRADEMARK',
          'IP_COPYRIGHT',
          'IP_PATENT',
          'EMPLOYMENT',
          'LITIGATION_CONSULTATION',
        ],
        description: 'Type of legal matter',
      },
      title: {
        type: 'string',
        description: 'Brief title for the matter',
      },
      description: {
        type: 'string',
        description: 'Detailed description of the legal matter',
      },
      urgency: {
        type: 'string',
        enum: ['low', 'standard', 'high', 'urgent'],
        description: 'Urgency level (affects prioritization)',
      },
    },
    required: ['session_token', 'matter_type', 'title'],
  },
  handler: handleCreateMatter,
}
