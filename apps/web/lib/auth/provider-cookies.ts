import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = 'provider_session'

export interface ProviderSessionCookie {
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
 * Create session cookie attributes
 */
export function createProviderSessionCookie(token: string, expiresAt: Date): ProviderSessionCookie {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    attributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    },
  }
}

/**
 * Create a blank cookie to clear the session
 */
export function createBlankProviderSessionCookie(): ProviderSessionCookie {
  return {
    name: SESSION_COOKIE_NAME,
    value: '',
    attributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    },
  }
}

/**
 * Set session cookie in the response
 */
export async function setProviderSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies()
  const cookie = createProviderSessionCookie(token, expiresAt)
  cookieStore.set(cookie.name, cookie.value, cookie.attributes)
}

/**
 * Delete the session cookie
 */
export async function deleteProviderSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  const cookie = createBlankProviderSessionCookie()
  cookieStore.set(cookie.name, cookie.value, cookie.attributes)
}

/**
 * Get the session token from cookies
 */
export async function getProviderSessionToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null
}
