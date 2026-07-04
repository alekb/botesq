import { randomBytes } from 'crypto'
import { prisma } from '@botesq/database'
import { config } from '../config.js'
import { validateApiKey } from './auth.service.js'
import { getRateLimitStatus } from './rate-limit.service.js'
import type { StartSessionInput, StartSessionOutput, GetSessionInfoOutput } from '../types.js'

/**
 * Generate a unique session token
 */
function generateSessionToken(): string {
  return `sess_${randomBytes(24).toString('base64url')}`
}

/**
 * Start a new session with an API key
 */
export async function startSession(input: StartSessionInput): Promise<StartSessionOutput> {
  // Validate API key
  const apiKey = await validateApiKey(input.api_key)
  const operator = apiKey.operator

  // Find or create agent if identifier provided
  let agent = null
  if (input.agent_identifier) {
    agent = await prisma.agent.upsert({
      where: {
        operatorId_identifier: {
          operatorId: operator.id,
          identifier: input.agent_identifier,
        },
      },
      update: {
        lastSeenAt: new Date(),
      },
      create: {
        operatorId: operator.id,
        identifier: input.agent_identifier,
      },
    })
  }

  // Create session
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + config.session.ttlHours * 60 * 60 * 1000)

  const session = await prisma.session.create({
    data: {
      token,
      apiKeyId: apiKey.id,
      agentId: agent?.id,
      expiresAt,
    },
  })

  return {
    session_token: session.token,
    expires_at: session.expiresAt.toISOString(),
    operator: {
      id: operator.id,
      name: operator.companyName,
    },
    credits: {
      balance: operator.creditBalance,
      currency: 'credits',
    },
    rate_limits: {
      requests_per_minute: config.rateLimit.requestsPerMinute,
      requests_per_hour: config.rateLimit.requestsPerHour,
    },
  }
}

/**
 * Get session information
 */
export async function getSessionInfo(
  session: { id: string; expiresAt: Date },
  operator: { id: string; companyName: string; creditBalance: number }
): Promise<GetSessionInfoOutput> {
  // Count active matters for this operator
  const activeMatterCount = await prisma.matter.count({
    where: {
      operatorId: operator.id,
      status: { in: ['ACTIVE', 'PENDING_RETAINER'] },
    },
  })

  // Real limiter state (windows are keyed by operator)
  const rateLimitStatus = getRateLimitStatus(operator.id)
  const requestsThisMinute = config.rateLimit.requestsPerMinute - rateLimitStatus.minute.remaining
  const requestsThisHour = config.rateLimit.requestsPerHour - rateLimitStatus.hour.remaining

  return {
    session_id: session.id,
    operator: {
      id: operator.id,
      name: operator.companyName,
    },
    credits: {
      balance: operator.creditBalance,
    },
    active_matters: activeMatterCount,
    requests_this_minute: requestsThisMinute,
    requests_this_hour: requestsThisHour,
    expires_at: session.expiresAt.toISOString(),
  }
}
