import { prisma } from '@botesq/database'
import { generateConsultationId } from '../utils/secure-id.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export interface QueuedConsultation {
  id: string
  externalId: string
  status: 'QUEUED' | 'AI_PROCESSING' | 'PENDING_REVIEW'
  estimatedWaitMinutes: number
  slaDeadline: Date
}

/**
 * Queue a question for human attorney review
 */
export async function queueForHumanReview(params: {
  operatorId: string
  matterId?: string
  question: string
  context?: string
  jurisdiction?: string
  aiDraft?: string
  aiConfidence?: number
  complexity: 'simple' | 'moderate' | 'complex'
}): Promise<QueuedConsultation> {
  const {
    operatorId,
    matterId,
    question,
    context,
    jurisdiction,
    aiDraft,
    aiConfidence,
    complexity,
  } = params

  // Calculate SLA based on complexity
  const slaHours = complexity === 'complex' ? 48 : complexity === 'moderate' ? 24 : 4
  const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000)

  // Estimate wait time based on queue depth
  const queueDepth = await prisma.consultation.count({
    where: {
      status: { in: ['QUEUED', 'AI_PROCESSING', 'PENDING_REVIEW'] },
    },
  })

  // Rough estimate: 15 min per item in queue, minimum 5 minutes
  const estimatedWaitMinutes = Math.max(5, Math.min(queueDepth * 15, slaHours * 60))

  const consultation = await prisma.consultation.create({
    data: {
      externalId: generateConsultationId(),
      operatorId,
      matterId,
      question,
      context,
      jurisdiction,
      complexity: complexity.toUpperCase() as 'SIMPLE' | 'STANDARD' | 'COMPLEX',
      status: aiDraft ? 'PENDING_REVIEW' : 'QUEUED',
      aiDraft,
      aiConfidence,
      slaDeadline,
    },
  })

  logger.info(
    {
      consultationId: consultation.externalId,
      complexity,
      slaDeadline,
      estimatedWaitMinutes,
    },
    'Question queued for human review'
  )

  return {
    id: consultation.id,
    externalId: consultation.externalId,
    status: consultation.status as QueuedConsultation['status'],
    estimatedWaitMinutes,
    slaDeadline,
  }
}

/**
 * Get consultation status
 */
export async function getConsultationStatus(consultationId: string) {
  const consultation = await prisma.consultation.findFirst({
    where: {
      OR: [{ id: consultationId }, { externalId: consultationId }],
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

  return {
    id: consultation.id,
    externalId: consultation.externalId,
    status: consultation.status,
    question: consultation.question,
    response: consultation.finalResponse,
    aiDraft: consultation.aiDraft,
    attorney: consultation.attorney
      ? `${consultation.attorney.firstName} ${consultation.attorney.lastName}`
      : null,
    slaDeadline: consultation.slaDeadline,
    completedAt: consultation.completedAt,
  }
}
