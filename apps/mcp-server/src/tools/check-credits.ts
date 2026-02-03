import { z } from 'zod'
import { prisma } from '@botesq/database'
import { authenticateSession } from '../services/auth.service.js'
import { checkRateLimit } from '../services/rate-limit.service.js'
import type { ToolOutput, CheckCreditsOutput } from '../types.js'

// Credit to USD conversion rate (100 credits = $1)
const CREDITS_PER_DOLLAR = 100
const LOW_BALANCE_THRESHOLD = 1000 // Warn when below 1000 credits

export const checkCreditsSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
})

export type CheckCreditsInput = z.infer<typeof checkCreditsSchema>

export async function handleCheckCredits(
  input: CheckCreditsInput
): Promise<ToolOutput<CheckCreditsOutput>> {
  // Authenticate session
  const session = await authenticateSession(input.session_token)

  // Check rate limits
  checkRateLimit(input.session_token)

  const operator = session.apiKey.operator

  // Get usage this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const monthlyUsage = await prisma.creditTransaction.aggregate({
    where: {
      operatorId: operator.id,
      type: 'DEDUCTION',
      createdAt: { gte: startOfMonth },
    },
    _sum: {
      amount: true,
    },
  })

  // Get top services by usage (simplified)
  const topServices = await prisma.creditTransaction.groupBy({
    by: ['referenceType'],
    where: {
      operatorId: operator.id,
      type: 'DEDUCTION',
      createdAt: { gte: startOfMonth },
      referenceType: { not: null },
    },
    _sum: {
      amount: true,
    },
    orderBy: {
      _sum: {
        amount: 'asc', // Negative values, so ascending = most spent
      },
    },
    take: 5,
  })

  return {
    success: true,
    data: {
      balance: operator.creditBalance,
      currency: 'credits',
      usd_equivalent: operator.creditBalance / CREDITS_PER_DOLLAR,
      low_balance_warning: operator.creditBalance < LOW_BALANCE_THRESHOLD,
      usage_this_month: Math.abs(monthlyUsage._sum.amount ?? 0),
      top_services: topServices.map((s) => ({
        service: s.referenceType ?? 'unknown',
        credits: Math.abs(s._sum.amount ?? 0),
      })),
    },
  }
}

export const checkCreditsTool = {
  name: 'check_credits',
  description: 'Check your current credit balance, usage statistics, and get low balance warnings.',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
    },
    required: ['session_token'],
  },
  handler: handleCheckCredits,
}
