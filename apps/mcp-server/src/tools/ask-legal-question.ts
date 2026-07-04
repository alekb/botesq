import { z } from 'zod'
import { prisma, type Prisma } from '@botesq/database'
import { nanoid } from 'nanoid'
import { authenticateSession } from '../services/auth.service.js'
import { checkRateLimit } from '../services/rate-limit.service.js'
import {
  generateLegalResponse,
  validateLegalQuestion,
  type LegalResponse,
} from '../services/legal-ai.service.js'
import { isLLMAvailable } from '../services/llm.service.js'
import { queueForHumanReview, COMPLEXITY_TO_ENUM } from '../services/queue.service.js'
import { deductCreditsInTx } from '../services/credit.service.js'
import { ApiError, PaymentError } from '../types.js'

import { logger } from '../logger.js'

// Pricing based on complexity
const PRICING = {
  simple: 200,
  moderate: 500,
  complex: 1000,
}

export const askLegalQuestionSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  question: z.string().min(10, 'Question must be at least 10 characters'),
  jurisdiction: z.string().optional(),
  context: z.string().optional(),
})

export type AskLegalQuestionInput = z.infer<typeof askLegalQuestionSchema>

export interface AskLegalQuestionOutput {
  answer_id: string
  status: 'instant' | 'queued'
  answer?: string
  confidence_score?: number
  complexity: 'simple' | 'moderate' | 'complex'
  citations?: Array<{ source: string; section?: string }>
  suggested_followups?: string[]
  disclaimers: string[]
  credits_used: number
  credits_remaining: number
  // If queued:
  estimated_wait_minutes?: number
  consultation_id?: string
}

const DISCLAIMERS = [
  'This response is for informational purposes only and does not constitute legal advice.',
  'AI-assisted responses are reviewed for accuracy but may not address all aspects of your situation.',
  'For specific legal advice, please consult with a licensed attorney.',
]

export async function handleAskLegalQuestion(input: AskLegalQuestionInput): Promise<{
  success: boolean
  data?: AskLegalQuestionOutput
  error?: { code: string; message: string }
}> {
  // Authenticate session
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  // Check rate limits (keyed by operator so new sessions can't reset them)
  checkRateLimit(operator.id)

  // Validate question
  const validation = validateLegalQuestion(input.question)
  if (!validation.valid) {
    throw new ApiError('INVALID_QUESTION', validation.reason ?? 'Invalid question', 400)
  }

  // Cheap fast-fail; deductCredits below is the authoritative, atomic check.
  if (operator.creditBalance < PRICING.simple) {
    throw new PaymentError('INSUFFICIENT_CREDITS', 'Not enough credits for this request')
  }

  // The try covers ONLY the LLM call: any other failure must surface,
  // not silently convert into a queued consultation.
  let legalResponse: LegalResponse | null = null
  if (isLLMAvailable()) {
    try {
      legalResponse = await generateLegalResponse({
        question: input.question,
        jurisdiction: input.jurisdiction,
        context: input.context,
      })
    } catch (error) {
      logger.warn({ err: error }, 'LLM failed, falling back to human queue')
    }
  }

  let response: AskLegalQuestionOutput

  if (legalResponse && !legalResponse.requiresAttorneyReview) {
    // Instant answer: record and charge in ONE transaction so every answer we
    // give has a matching ledger entry — an insufficient balance rolls back
    // the record, a crash can't strand a charged-but-unrecorded answer.
    const creditsUsed = PRICING[legalResponse.complexity]
    const answer = legalResponse

    const { record, newBalance } = await prisma.$transaction(async (tx) => {
      const created = await tx.consultation.create({
        data: {
          externalId: `ANS-${nanoid(8).toUpperCase()}`,
          operatorId: operator.id,
          question: input.question,
          context: input.context,
          jurisdiction: input.jurisdiction,
          complexity: COMPLEXITY_TO_ENUM[answer.complexity],
          status: 'COMPLETED',
          aiDraft: answer.answer,
          aiConfidence: answer.confidenceScore,
          finalResponse: answer.answer,
          responseMetadata: { citations: answer.citations } as Prisma.InputJsonValue,
          creditsCharged: creditsUsed,
          completedAt: new Date(),
        },
      })

      const deduction = await deductCreditsInTx(
        tx,
        operator.id,
        creditsUsed,
        'Legal Q&A - instant',
        'legal_qa',
        created.id
      )

      return { record: created, newBalance: deduction.newBalance }
    })

    response = {
      answer_id: record.externalId,
      status: 'instant',
      answer: legalResponse.answer,
      confidence_score: legalResponse.confidenceScore,
      complexity: legalResponse.complexity,
      citations: legalResponse.citations,
      suggested_followups: legalResponse.suggestedFollowups,
      disclaimers: DISCLAIMERS,
      credits_used: creditsUsed,
      credits_remaining: newBalance,
    }
  } else {
    // Queue for attorney review: complexity from the AI when we have it,
    // moderate otherwise.
    const complexity = legalResponse?.complexity ?? 'moderate'
    const creditsUsed = PRICING[complexity]

    // Queue the request and charge for it in ONE transaction so a crash or
    // insufficient balance can't leave an attorney a request with no matching
    // charge, or a charge with no queued request.
    const { queued, newBalance } = await prisma.$transaction(async (tx) => {
      const q = await queueForHumanReview(
        {
          operatorId: operator.id,
          question: input.question,
          context: input.context,
          jurisdiction: input.jurisdiction,
          aiDraft: legalResponse?.answer,
          aiConfidence: legalResponse?.confidenceScore,
          complexity,
          creditsCharged: creditsUsed,
        },
        tx
      )

      const { newBalance } = await deductCreditsInTx(
        tx,
        operator.id,
        creditsUsed,
        'Legal Q&A - consultation',
        'consultation',
        q.id
      )

      return { queued: q, newBalance }
    })

    response = {
      answer_id: queued.externalId,
      status: 'queued',
      complexity,
      disclaimers: [
        ...DISCLAIMERS,
        legalResponse
          ? 'This question has been flagged for attorney review due to its complexity.'
          : 'Your question has been queued for attorney review.',
      ],
      credits_used: creditsUsed,
      credits_remaining: newBalance,
      estimated_wait_minutes: queued.estimatedWaitMinutes,
      consultation_id: queued.externalId,
    }
  }

  logger.info(
    {
      operatorId: operator.id,
      status: response.status,
      complexity: response.complexity,
      creditsUsed: response.credits_used,
    },
    'Legal question processed'
  )

  return {
    success: true,
    data: response,
  }
}

export const askLegalQuestionTool = {
  name: 'ask_legal_question',
  description:
    'Ask a legal question and receive an AI-assisted response. Complex questions may be queued for attorney review.',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
      question: {
        type: 'string',
        description: 'Your legal question',
      },
      jurisdiction: {
        type: 'string',
        description: 'Relevant jurisdiction (e.g., "California", "Federal", "UK")',
      },
      context: {
        type: 'string',
        description: 'Additional context for your question',
      },
    },
    required: ['session_token', 'question'],
  },
  handler: handleAskLegalQuestion,
}
