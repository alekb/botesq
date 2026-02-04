import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = 'admin_session'

export interface SessionCookie {
  name: string
  value: string
  attributes: {
    httpOnly: boolean
    secure: boolean
    sameSite: 'lax' | 'strict' | 'none'
    path: string
    maxAge?: number
    expires?: Date
  }
}

/**
 * Create session cookie attributes for admin sessions
 * Uses stricter settings than attorney sessions:
 * - sameSite: 'strict' for enhanced security
 * - path: '/admin' to scope cookie to admin routes only
 */
export function createSessionCookie(token: string, expiresAt: Date): SessionCookie {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    attributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/admin',
      expires: expiresAt,
    },
  }
}

/**
 * Create a blank cookie to clear the session
 */
export function createBlankSessionCookie(): SessionCookie {
  return {
    name: SESSION_COOKIE_NAME,
    value: '',
    attributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/admin',
      maxAge: 0,
    },
  }
}

/**
 * Set session cookie in the response
 */
export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies()
  const cookie = createSessionCookie(token, expiresAt)
  cookieStore.set(cookie.name, cookie.value, cookie.attributes)
}

/**
 * Delete the session cookie
 */
export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  const cookie = createBlankSessionCookie()
  cookieStore.set(cookie.name, cookie.value, cookie.attributes)
}

/**
 * Get the session token from cookies
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null
}
