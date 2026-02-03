import { createHash, randomBytes } from 'crypto'
import { prisma } from '@moltlaw/database'
import { AuthError, type AuthenticatedSession } from '../types.js'

/**
 * Hash an API key for storage/comparison
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}

/**
 * Generate a new API key
 * Format: ml_live_XXXXXXXX (prefix) + 32 random chars
 */
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = 'ml_live_'
  const randomPart = randomBytes(24).toString('base64url')
  const key = `${prefix}${randomPart}`
  const hash = hashApiKey(key)

  return {
    key,
    prefix: key.slice(0, 16), // First 16 chars for identification
    hash,
  }
}

/**
 * Validate an API key and return the associated operator
 */
export async function validateApiKey(apiKey: string) {
  const keyHash = hashApiKey(apiKey)

  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      operator: true,
    },
  })

  if (!apiKeyRecord) {
    throw new AuthError('INVALID_API_KEY', 'Invalid API key')
  }

  if (apiKeyRecord.status !== 'ACTIVE') {
    throw new AuthError('API_KEY_REVOKED', 'API key has been revoked')
  }

  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
    throw new AuthError('API_KEY_EXPIRED', 'API key has expired')
  }

  if (apiKeyRecord.operator.status !== 'ACTIVE') {
    throw new AuthError('OPERATOR_SUSPENDED', 'Operator account is suspended')
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsedAt: new Date() },
  })

  return apiKeyRecord
}

/**
 * Authenticate a session token
 */
export async function authenticateSession(token: string): Promise<AuthenticatedSession> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      apiKey: {
        include: { operator: true },
      },
      agent: true,
    },
  })

  if (!session) {
    throw new AuthError('INVALID_SESSION', 'Session not found')
  }

  if (session.expiresAt < new Date()) {
    throw new AuthError('SESSION_EXPIRED', 'Session has expired')
  }

  if (session.apiKey.status !== 'ACTIVE') {
    throw new AuthError('API_KEY_REVOKED', 'API key has been revoked')
  }

  if (session.apiKey.operator.status !== 'ACTIVE') {
    throw new AuthError('OPERATOR_SUSPENDED', 'Operator account is suspended')
  }

  // Update last active timestamp and increment request count
  await prisma.session.update({
    where: { id: session.id },
    data: {
      lastActiveAt: new Date(),
      requestCount: { increment: 1 },
    },
  })

  return session as AuthenticatedSession
}
