import { z } from 'zod'
import { prisma } from '@botesq/database'
import { authenticateSession } from '../services/auth.service.js'
import { checkRateLimit } from '../services/rate-limit.service.js'
import { createConsultation, CONSULTATION_PRICING } from '../services/consultation.service.js'
import { PaymentError } from '../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const requestConsultationSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  matter_id: z.string().optional(),
  question: z.string().min(20, 'Question must be at least 20 characters'),
  context: z.string().max(5000).optional(),
  jurisdiction: z.string().optional(),
  urgency: z.enum(['standard', 'urgent']).default('standard'),
})

export type RequestConsultationInput = z.infer<typeof requestConsultationSchema>

export interface RequestConsultationOutput {
  consultation_id: string
  status: 'queued'
  estimated_wait_minutes: number
  sla_deadline: string
  credits_used: number
  credits_remaining: number
}

export async function handleRequestConsultation(
  input: RequestConsultationInput
): Promise<{ success: boolean; data?: RequestConsultationOutput; error?: { code: string; message: string } }> {
  // Authenticate session
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  // Check rate limits
  checkRateLimit(input.session_token)

  // Calculate credits needed
  const creditsNeeded = CONSULTATION_PRICING[input.urgency]

  // Check credits
  if (operator.creditBalance < creditsNeeded) {
    throw new PaymentError('INSUFFICIENT_CREDITS', `Not enough credits. Need ${creditsNeeded}, have ${operator.creditBalance}`)
  }

  // Create consultation
  const { consultation, creditsUsed } = await createConsultation({
    operatorId: operator.id,
    matterId: input.matter_id,
    question: input.question,
    context: input.context,
    jurisdiction: input.jurisdiction,
    urgency: input.urgency,
  })

  // Deduct credits
  await prisma.$transaction(async (tx) => {
    await tx.operator.update({
      where: { id: operator.id },
      data: { creditBalance: { decrement: creditsUsed } },
    })

    await tx.creditTransaction.create({
      data: {
        operatorId: operator.id,
        type: 'DEDUCTION',
        amount: -creditsUsed,
        balanceBefore: operator.creditBalance,
        balanceAfter: operator.creditBalance - creditsUsed,
        description: `Consultation request: ${consultation.externalId}`,
        referenceType: 'consultation',
        referenceId: consultation.id,
      },
    })

    // Update consultation with credits charged
    await tx.consultation.update({
      where: { id: consultation.id },
      data: { creditsCharged: creditsUsed },
    })
  })

  logger.info(
    {
      operatorId: operator.id,
      consultationId: consultation.externalId,
      urgency: input.urgency,
      creditsUsed,
    },
    'Consultation request submitted'
  )

  return {
    success: true,
    data: {
      consultation_id: consultation.externalId,
      status: 'queued',
      estimated_wait_minutes: consultation.estimatedWaitMinutes ?? 30,
      sla_deadline: consultation.slaDeadline.toISOString(),
      credits_used: creditsUsed,
      credits_remaining: operator.creditBalance - creditsUsed,
    },
  }
}

export const requestConsultationTool = {
  name: 'request_consultation',
  description:
    'Request an async consultation with a licensed attorney. Questions are queued for review and response. ' +
    `Standard consultations cost ${CONSULTATION_PRICING.standard} credits (24hr SLA), urgent consultations cost ${CONSULTATION_PRICING.urgent} credits (4hr SLA).`,
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
      matter_id: {
        type: 'string',
        description: 'Optional matter ID to associate the consultation with',
      },
      question: {
        type: 'string',
        description: 'Your legal question (minimum 20 characters)',
      },
      context: {
        type: 'string',
        description: 'Additional context for your question (max 5000 characters)',
      },
      jurisdiction: {
        type: 'string',
        description: 'Relevant jurisdiction (e.g., "California", "Federal", "UK")',
      },
      urgency: {
        type: 'string',
        enum: ['standard', 'urgent'],
        description: 'Urgency level. Standard: 24hr SLA, Urgent: 4hr SLA (higher cost)',
      },
    },
    required: ['session_token', 'question'],
  },
  handler: handleRequestConsultation,
}
