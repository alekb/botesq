import { prisma } from '@botesq/database'
import type { Attorney, AttorneySession } from '@botesq/database'
import { generateToken, hashToken } from '../auth/tokens'
import { getSessionToken, setSessionCookie, deleteSessionCookie } from './cookies'

// Admin sessions are shorter (4 hours) for security
const SESSION_DURATION_MS = 4 * 60 * 60 * 1000

export type AdminSessionValidationResult =
  | { session: AttorneySession; admin: Attorney }
  | { session: null; admin: null }

/**
 * Create a new session for an admin
 * Only attorneys with role ADMIN can have admin sessions
 */
export async function createAdminSession(
  adminId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ session: AttorneySession; token: string }> {
  const token = generateToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

  const session = await prisma.attorneySession.create({
    data: {
      attorneyId: adminId,
      token: tokenHash,
      ipAddress,
      userAgent,
      expiresAt,
    },
  })

  // Update last login time
  await prisma.attorney.update({
    where: { id: adminId },
    data: { lastLoginAt: new Date() },
  })

  // Set the cookie with the raw token (not hashed)
  await setSessionCookie(token, expiresAt)

  return { session, token }
}

/**
 * Validate a session token and return the session + admin
 * Enforces ADMIN role requirement
 */
export async function validateAdminSession(token: string): Promise<AdminSessionValidationResult> {
  const tokenHash = hashToken(token)

  const session = await prisma.attorneySession.findUnique({
    where: { token: tokenHash },
    include: { attorney: true },
  })

  if (!session) {
    return { session: null, admin: null }
  }

  // Check if session has expired
  if (session.expiresAt < new Date()) {
    await prisma.attorneySession.delete({ where: { id: session.id } })
    return { session: null, admin: null }
  }

  // Check if attorney is active
  if (session.attorney.status !== 'ACTIVE') {
    return { session: null, admin: null }
  }

  // CRITICAL: Enforce ADMIN role
  if (session.attorney.role !== 'ADMIN') {
    return { session: null, admin: null }
  }

  return { session, admin: session.attorney }
}

/**
 * Get the current session from cookies
 */
export async function getCurrentAdminSession(): Promise<AdminSessionValidationResult> {
  const token = await getSessionToken()
  if (!token) {
    return { session: null, admin: null }
  }
  return validateAdminSession(token)
}

/**
 * Invalidate a session (logout)
 */
export async function invalidateAdminSession(sessionId: string): Promise<void> {
  await prisma.attorneySession.delete({ where: { id: sessionId } }).catch(() => {
    // Session may already be deleted
  })
  await deleteSessionCookie()
}

/**
 * Invalidate all sessions for an admin
 */
export async function invalidateAllAdminSessions(adminId: string): Promise<void> {
  await prisma.attorneySession.deleteMany({ where: { attorneyId: adminId } })
  await deleteSessionCookie()
}
