import { createHash, randomBytes } from 'crypto'
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2'
import { prisma } from '@botesq/database'
import { AuthError, type AuthenticatedSession } from '../types.js'

/**
 * Argon2id configuration per SECURITY.md
 * - memoryCost: 64 MB (65536 KB)
 * - timeCost: 3 iterations
 * - parallelism: 4 threads
 * - hashLength: 32 bytes output
 */
const ARGON2_CONFIG = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  outputLen: 32,
}

/**
 * Hash a password using Argon2id
 * Use for operator, attorney, and admin passwords
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2Hash(password, ARGON2_CONFIG)
}

/**
 * Verify a password against an Argon2id hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2Verify(hash, password)
  } catch {
    return false
  }
}

/**
 * Hash an API key for storage/comparison using SHA-256
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}

/**
 * Generate a new API key
 * Format: be_XXXXXXXX (32 random base64url chars)
 */
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = `be_${randomBytes(32).toString('base64url')}`
  const hash = hashApiKey(key)

  return {
    key,
    prefix: key.slice(0, 11), // "be_" + first 8 chars for identification
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
