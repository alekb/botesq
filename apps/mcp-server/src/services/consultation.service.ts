import { prisma, ConsultationComplexity, ConsultationStatus } from '@botesq/database'
import { nanoid } from 'nanoid'
import { ApiError } from '../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

// Pricing for consultations
export const CONSULTATION_PRICING = {
  standard: 5000,
  urgent: 10000,
}

// SLA hours by urgency
const SLA_HOURS = {
  standard: 24,
  urgent: 4,
}

/**
 * Generate a consultation external ID
 */
function generateConsultationId(): string {
  return `CONS-${nanoid(8).toUpperCase()}`
}

export interface CreateConsultationParams {
  operatorId: string
  matterId?: string
  question: string
  context?: string
  jurisdiction?: string
  urgency: 'standard' | 'urgent'
}

export interface ConsultationResult {
  id: string
  externalId: string
  status: string
  question: string
  response?: string
  citations?: Array<{ source: string; section?: string }>
  attorneyReviewed: boolean
  disclaimers?: string[]
  completedAt?: Date
  estimatedWaitMinutes?: number
  slaDeadline: Date
}

/**
 * Create a new async consultation request
 */
export async function createConsultation(
  params: CreateConsultationParams
): Promise<{ consultation: ConsultationResult; creditsUsed: number }> {
  const { operatorId, matterId, question, context, jurisdiction, urgency } = params

  // Validate matter exists and belongs to operator if provided
  let internalMatterId: string | undefined
  if (matterId) {
    const matter = await prisma.matter.findFirst({
      where: {
        OR: [{ id: matterId }, { externalId: matterId }],
        operatorId,
      },
    })

    if (!matter) {
      throw new ApiError('MATTER_NOT_FOUND', 'Matter not found or does not belong to this operator', 404)
    }
    internalMatterId = matter.id
  }

  // Calculate SLA deadline
  const slaHours = SLA_HOURS[urgency]
  const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000)

  // Estimate wait time based on queue depth and urgency
  const queueDepth = await prisma.consultation.count({
    where: {
      status: { in: ['QUEUED', 'AI_PROCESSING', 'PENDING_REVIEW'] },
    },
  })

  // Urgent requests get priority, so shorter wait estimate
  const baseWaitPerItem = urgency === 'urgent' ? 5 : 15
  const estimatedWaitMinutes = Math.max(5, Math.min(queueDepth * baseWaitPerItem, slaHours * 60))

  // Determine complexity (default to STANDARD for manual requests)
  const complexity: ConsultationComplexity = urgency === 'urgent' ? 'URGENT' : 'STANDARD'

  const consultation = await prisma.consultation.create({
    data: {
      externalId: generateConsultationId(),
      operatorId,
      matterId: internalMatterId,
      question,
      context,
      jurisdiction,
      complexity,
      status: 'QUEUED',
      slaDeadline,
    },
  })

  logger.info(
    {
      consultationId: consultation.externalId,
      operatorId,
      urgency,
      slaDeadline,
      estimatedWaitMinutes,
    },
    'Consultation request created'
  )

  return {
    consultation: {
      id: consultation.id,
      externalId: consultation.externalId,
      status: consultation.status,
      question: consultation.question,
      attorneyReviewed: false,
      slaDeadline: consultation.slaDeadline!,
      estimatedWaitMinutes,
    },
    creditsUsed: CONSULTATION_PRICING[urgency],
  }
}

/**
 * Get consultation by ID (internal or external)
 */
export async function getConsultation(
  consultationId: string,
  operatorId: string
): Promise<ConsultationResult | null> {
  const consultation = await prisma.consultation.findFirst({
    where: {
      OR: [{ id: consultationId }, { externalId: consultationId }],
      operatorId,
    },
    include: {
      attorney: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  if (!consultation) {
    return null
  }

  // Parse citations from response metadata if available
  let citations: Array<{ source: string; section?: string }> | undefined
  if (consultation.responseMetadata && typeof consultation.responseMetadata === 'object') {
    const metadata = consultation.responseMetadata as Record<string, unknown>
    if (Array.isArray(metadata.citations)) {
      citations = metadata.citations as Array<{ source: string; section?: string }>
    }
  }

  // Estimate remaining wait time for pending consultations
  let estimatedWaitMinutes: number | undefined
  if (!consultation.completedAt && consultation.slaDeadline) {
    const remainingMs = consultation.slaDeadline.getTime() - Date.now()
    if (remainingMs > 0) {
      estimatedWaitMinutes = Math.ceil(remainingMs / (60 * 1000) / 2) // Assume halfway through SLA
    }
  }

  return {
    id: consultation.id,
    externalId: consultation.externalId,
    status: consultation.status,
    question: consultation.question,
    response: consultation.finalResponse ?? undefined,
    citations,
    attorneyReviewed: !!consultation.attorneyId,
    completedAt: consultation.completedAt ?? undefined,
    slaDeadline: consultation.slaDeadline!,
    estimatedWaitMinutes,
    disclaimers:
      consultation.status === 'COMPLETED'
        ? [
            'This response has been reviewed by a licensed attorney.',
            'This constitutes legal information, not legal advice for your specific situation.',
            'Attorney-client privilege may apply to communications within your matter.',
          ]
        : undefined,
  }
}

/**
 * List consultations for an operator
 */
export async function listConsultations(
  operatorId: string,
  options: {
    status?: ConsultationStatus
    matterId?: string
    limit?: number
    offset?: number
  } = {}
): Promise<{ consultations: ConsultationResult[]; total: number }> {
  const { status, matterId, limit = 20, offset = 0 } = options

  // Get internal matter ID if external ID provided
  let internalMatterId: string | undefined
  if (matterId) {
    if (matterId.startsWith('MATTER-')) {
      const matter = await prisma.matter.findUnique({
        where: { externalId: matterId },
        select: { id: true },
      })
      internalMatterId = matter?.id
    } else {
      internalMatterId = matterId
    }
  }

  const where = {
    operatorId,
    ...(status && { status }),
    ...(internalMatterId && { matterId: internalMatterId }),
  }

  const [consultations, total] = await Promise.all([
    prisma.consultation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        attorney: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.consultation.count({ where }),
  ])

  return {
    consultations: consultations.map((c) => ({
      id: c.id,
      externalId: c.externalId,
      status: c.status,
      question: c.question,
      response: c.finalResponse ?? undefined,
      attorneyReviewed: !!c.attorneyId,
      completedAt: c.completedAt ?? undefined,
      slaDeadline: c.slaDeadline!,
    })),
    total,
  }
}
