import { z } from 'zod'
import { prisma } from '@botesq/database'
import { authenticateSession } from '../services/auth.service.js'
import { checkRateLimit } from '../services/rate-limit.service.js'
import { createConsultation, CONSULTATION_PRICING } from '../services/consultation.service.js'
import { deductCreditsInTx } from '../services/credit.service.js'
import { PaymentError } from '../types.js'

import { logger } from '../logger.js'

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

export async function handleRequestConsultation(input: RequestConsultationInput): Promise<{
  success: boolean
  data?: RequestConsultationOutput
  error?: { code: string; message: string }
}> {
  // Authenticate session
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  // Check rate limits (keyed by operator so new sessions can't reset them)
  checkRateLimit(operator.id)

  // Calculate credits needed
  const creditsNeeded = CONSULTATION_PRICING[input.urgency]

  // Cheap fast-fail; deductCredits below is the authoritative, atomic check.
  if (operator.creditBalance < creditsNeeded) {
    throw new PaymentError(
      'INSUFFICIENT_CREDITS',
      `Not enough credits. Need ${creditsNeeded}, have ${operator.creditBalance}`
    )
  }

  // Create the consultation and charge for it in ONE transaction, so a crash
  // or insufficient balance can never leave a queued request without a matching
  // charge (an attorney working unpaid) or a charge without a request.
  const { consultation, creditsUsed, newBalance } = await prisma.$transaction(async (tx) => {
    const created = await createConsultation(
      {
        operatorId: operator.id,
        matterId: input.matter_id,
        question: input.question,
        context: input.context,
        jurisdiction: input.jurisdiction,
        urgency: input.urgency,
      },
      tx
    )

    const { newBalance } = await deductCreditsInTx(
      tx,
      operator.id,
      created.creditsUsed,
      `Consultation request: ${created.consultation.externalId}`,
      'consultation',
      created.consultation.id
    )

    return { consultation: created.consultation, creditsUsed: created.creditsUsed, newBalance }
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
      credits_remaining: newBalance,
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
