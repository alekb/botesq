'use server'

import type { Provider } from '@/types/provider'
import { providerGetMe } from '../api/provider'
import {
  getProviderSessionToken,
  setProviderSessionCookie,
  deleteProviderSessionCookie,
} from './provider-cookies'

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export type ProviderSessionValidationResult =
  | { provider: Provider; token: string }
  | { provider: null; token: null }

/**
 * Store provider session token in cookie
 * Called after successful login with token from MCP server
 */
export async function storeProviderSession(token: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  await setProviderSessionCookie(token, expiresAt)
}

/**
 * Get the current provider session from cookies and validate it
 */
export async function getCurrentProviderSession(): Promise<ProviderSessionValidationResult> {
  const token = await getProviderSessionToken()
  if (!token) {
    return { provider: null, token: null }
  }

  try {
    // Validate token by calling the /provider/auth/me endpoint
    const provider = await providerGetMe(token)
    return { provider, token }
  } catch {
    // Token is invalid or expired
    await deleteProviderSessionCookie()
    return { provider: null, token: null }
  }
}

/**
 * Get the raw provider session token (for API calls)
 */
export async function getProviderToken(): Promise<string | null> {
  return getProviderSessionToken()
}

/**
 * Invalidate provider session (logout)
 */
export async function invalidateProviderSession(): Promise<void> {
  await deleteProviderSessionCookie()
}
