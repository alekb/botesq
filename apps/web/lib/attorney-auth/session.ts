import { prisma } from '@botesq/database'
import type { Attorney, AttorneySession } from '@botesq/database'
import { generateToken, hashToken } from '../auth/tokens'
import { getSessionToken, setSessionCookie, deleteSessionCookie } from './cookies'

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000 // 8 hours (shorter for attorneys)

export type AttorneySessionValidationResult =
  | { session: AttorneySession; attorney: Attorney }
  | { session: null; attorney: null }

/**
 * Create a new session for an attorney
 */
export async function createAttorneySession(
  attorneyId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ session: AttorneySession; token: string }> {
  const token = generateToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

  const session = await prisma.attorneySession.create({
    data: {
      attorneyId,
      token: tokenHash,
      ipAddress,
      userAgent,
      expiresAt,
    },
  })

  // Update last login time
  await prisma.attorney.update({
    where: { id: attorneyId },
    data: { lastLoginAt: new Date() },
  })

  // Set the cookie with the raw token (not hashed)
  await setSessionCookie(token, expiresAt)

  return { session, token }
}

/**
 * Validate a session token and return the session + attorney
 */
export async function validateAttorneySession(
  token: string
): Promise<AttorneySessionValidationResult> {
  const tokenHash = hashToken(token)

  const session = await prisma.attorneySession.findUnique({
    where: { token: tokenHash },
    include: { attorney: true },
  })

  if (!session) {
    return { session: null, attorney: null }
  }

  // Check if session has expired
  if (session.expiresAt < new Date()) {
    await prisma.attorneySession.delete({ where: { id: session.id } })
    return { session: null, attorney: null }
  }

  // Check if attorney is active
  if (session.attorney.status !== 'ACTIVE') {
    return { session: null, attorney: null }
  }

  return { session, attorney: session.attorney }
}

/**
 * Get the current session from cookies
 */
export async function getCurrentAttorneySession(): Promise<AttorneySessionValidationResult> {
  const token = await getSessionToken()
  if (!token) {
    return { session: null, attorney: null }
  }
  return validateAttorneySession(token)
}

/**
 * Invalidate a session (logout)
 */
export async function invalidateAttorneySession(sessionId: string): Promise<void> {
  await prisma.attorneySession.delete({ where: { id: sessionId } }).catch(() => {
    // Session may already be deleted
  })
  await deleteSessionCookie()
}

/**
 * Invalidate all sessions for an attorney
 */
export async function invalidateAllAttorneySessions(attorneyId: string): Promise<void> {
  await prisma.attorneySession.deleteMany({ where: { attorneyId } })
  await deleteSessionCookie()
}

/**
 * Clean up expired sessions (run periodically)
 */
export async function cleanupExpiredAttorneySessions(): Promise<number> {
  const result = await prisma.attorneySession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return result.count
}
