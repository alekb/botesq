import { z } from 'zod'
import { authenticateSession } from '../services/auth.service.js'
import { checkRateLimit } from '../services/rate-limit.service.js'
import {
  generateLegalResponse,
  validateLegalQuestion,
} from '../services/legal-ai.service.js'
import { isLLMAvailable } from '../services/llm.service.js'
import { queueForHumanReview } from '../services/queue.service.js'
import { prisma } from '@moltlaw/database'
import { ApiError, PaymentError } from '../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

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

export async function handleAskLegalQuestion(
  input: AskLegalQuestionInput
): Promise<{ success: boolean; data?: AskLegalQuestionOutput; error?: { code: string; message: string } }> {
  // Authenticate session
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  // Check rate limits
  checkRateLimit(input.session_token)

  // Validate question
  const validation = validateLegalQuestion(input.question)
  if (!validation.valid) {
    throw new ApiError('INVALID_QUESTION', validation.reason ?? 'Invalid question', 400)
  }

  // Check minimum credits (use simple pricing as minimum)
  if (operator.creditBalance < PRICING.simple) {
    throw new PaymentError('INSUFFICIENT_CREDITS', 'Not enough credits for this request')
  }

  let response: AskLegalQuestionOutput

  // Try AI response if available
  if (isLLMAvailable()) {
    try {
      const legalResponse = await generateLegalResponse({
        question: input.question,
        jurisdiction: input.jurisdiction,
        context: input.context,
      })

      // Determine credits based on complexity
      const creditsUsed = PRICING[legalResponse.complexity]

      // Check credits again with actual cost
      if (operator.creditBalance < creditsUsed) {
        throw new PaymentError('INSUFFICIENT_CREDITS', 'Not enough credits for this request')
      }

      // If requires human review, queue it
      if (legalResponse.requiresAttorneyReview) {
        const queued = await queueForHumanReview({
          operatorId: operator.id,
          question: input.question,
          context: input.context,
          jurisdiction: input.jurisdiction,
          aiDraft: legalResponse.answer,
          aiConfidence: legalResponse.confidenceScore,
          complexity: legalResponse.complexity,
        })

        // Deduct credits
        await deductCredits(operator.id, creditsUsed, 'consultation', queued.id)

        response = {
          answer_id: queued.externalId,
          status: 'queued',
          complexity: legalResponse.complexity,
          disclaimers: [
            ...DISCLAIMERS,
            'This question has been flagged for attorney review due to its complexity.',
          ],
          credits_used: creditsUsed,
          credits_remaining: operator.creditBalance - creditsUsed,
          estimated_wait_minutes: queued.estimatedWaitMinutes,
          consultation_id: queued.externalId,
        }
      } else {
        // Instant response
        await deductCredits(operator.id, creditsUsed, 'legal_qa', `instant_${Date.now()}`)

        response = {
          answer_id: `ans_${Date.now()}`,
          status: 'instant',
          answer: legalResponse.answer,
          confidence_score: legalResponse.confidenceScore,
          complexity: legalResponse.complexity,
          citations: legalResponse.citations,
          suggested_followups: legalResponse.suggestedFollowups,
          disclaimers: DISCLAIMERS,
          credits_used: creditsUsed,
          credits_remaining: operator.creditBalance - creditsUsed,
        }
      }

      logger.info(
        {
          operatorId: operator.id,
          complexity: legalResponse.complexity,
          status: response.status,
          creditsUsed,
        },
        'Legal question processed'
      )
    } catch (error) {
      // LLM error - fall back to human queue
      logger.warn({ error }, 'LLM failed, falling back to human queue')

      const queued = await queueForHumanReview({
        operatorId: operator.id,
        question: input.question,
        context: input.context,
        jurisdiction: input.jurisdiction,
        complexity: 'moderate', // Default when we can't assess
      })

      const creditsUsed = PRICING.moderate
      await deductCredits(operator.id, creditsUsed, 'consultation', queued.id)

      response = {
        answer_id: queued.externalId,
        status: 'queued',
        complexity: 'moderate',
        disclaimers: [
          ...DISCLAIMERS,
          'Your question has been queued for attorney review.',
        ],
        credits_used: creditsUsed,
        credits_remaining: operator.creditBalance - creditsUsed,
        estimated_wait_minutes: queued.estimatedWaitMinutes,
        consultation_id: queued.externalId,
      }
    }
  } else {
    // No LLM available - queue directly
    const queued = await queueForHumanReview({
      operatorId: operator.id,
      question: input.question,
      context: input.context,
      jurisdiction: input.jurisdiction,
      complexity: 'moderate',
    })

    const creditsUsed = PRICING.moderate
    await deductCredits(operator.id, creditsUsed, 'consultation', queued.id)

    response = {
      answer_id: queued.externalId,
      status: 'queued',
      complexity: 'moderate',
      disclaimers: [
        ...DISCLAIMERS,
        'Your question has been queued for attorney review.',
      ],
      credits_used: creditsUsed,
      credits_remaining: operator.creditBalance - creditsUsed,
      estimated_wait_minutes: queued.estimatedWaitMinutes,
      consultation_id: queued.externalId,
    }
  }

  return {
    success: true,
    data: response,
  }
}

/**
 * Deduct credits from operator balance
 */
async function deductCredits(
  operatorId: string,
  amount: number,
  referenceType: string,
  referenceId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const operator = await tx.operator.findUnique({
      where: { id: operatorId },
      select: { creditBalance: true },
    })

    if (!operator || operator.creditBalance < amount) {
      throw new PaymentError('INSUFFICIENT_CREDITS', 'Not enough credits')
    }

    await tx.operator.update({
      where: { id: operatorId },
      data: { creditBalance: { decrement: amount } },
    })

    await tx.creditTransaction.create({
      data: {
        operatorId,
        type: 'DEDUCTION',
        amount: -amount,
        balanceBefore: operator.creditBalance,
        balanceAfter: operator.creditBalance - amount,
        description: `Legal Q&A - ${referenceType}`,
        referenceType,
        referenceId,
      },
    })
  })
}

export const askLegalQuestionTool = {
  name: 'ask_legal_question',
  description: 'Ask a legal question and receive an AI-assisted response. Complex questions may be queued for attorney review.',
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
