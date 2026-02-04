import { prisma } from '@botesq/database'
import type { Operator, OperatorSession } from '@botesq/database'
import { generateToken, hashToken } from './tokens'
import { getSessionToken, setSessionCookie, deleteSessionCookie } from './cookies'

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export type SessionValidationResult =
  | { session: OperatorSession; operator: Operator }
  | { session: null; operator: null }

/**
 * Create a new session for an operator
 */
export async function createSession(
  operatorId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ session: OperatorSession; token: string }> {
  const token = generateToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

  const session = await prisma.operatorSession.create({
    data: {
      operatorId,
      token: tokenHash,
      ipAddress,
      userAgent,
      expiresAt,
    },
  })

  // Set the cookie with the raw token (not hashed)
  await setSessionCookie(token, expiresAt)

  return { session, token }
}

/**
 * Validate a session token and return the session + operator
 */
export async function validateSession(token: string): Promise<SessionValidationResult> {
  const tokenHash = hashToken(token)

  const session = await prisma.operatorSession.findUnique({
    where: { token: tokenHash },
    include: { operator: true },
  })

  if (!session) {
    return { session: null, operator: null }
  }

  // Check if session has expired
  if (session.expiresAt < new Date()) {
    await prisma.operatorSession.delete({ where: { id: session.id } })
    return { session: null, operator: null }
  }

  // Check if operator is active
  if (session.operator.status !== 'ACTIVE') {
    return { session: null, operator: null }
  }

  return { session, operator: session.operator }
}

/**
 * Get the current session from cookies
 */
export async function getCurrentSession(): Promise<SessionValidationResult> {
  const token = await getSessionToken()
  if (!token) {
    return { session: null, operator: null }
  }
  return validateSession(token)
}

/**
 * Invalidate a session (logout)
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  await prisma.operatorSession.delete({ where: { id: sessionId } }).catch(() => {
    // Session may already be deleted
  })
  await deleteSessionCookie()
}

/**
 * Invalidate all sessions for an operator (e.g., password change)
 */
export async function invalidateAllSessions(operatorId: string): Promise<void> {
  await prisma.operatorSession.deleteMany({ where: { operatorId } })
  await deleteSessionCookie()
}

/**
 * Clean up expired sessions (run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.operatorSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return result.count
}
