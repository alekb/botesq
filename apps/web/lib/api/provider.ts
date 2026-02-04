import type { Provider, ProviderProfileUpdateInput, ProviderStats } from '@/types/provider'

const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:3001'

/**
 * Make an authenticated request to the provider API
 * Token is passed from server actions that read it from cookies
 */
async function providerFetch<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${MCP_SERVER_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }))
    throw new Error(error.message || `Request failed: ${response.status}`)
  }

  return response.json()
}

// Profile API
export async function getProviderProfile(token: string): Promise<Provider> {
  return providerFetch<Provider>('/provider/profile', token)
}

export async function updateProviderProfile(
  token: string,
  data: ProviderProfileUpdateInput
): Promise<Provider> {
  return providerFetch<Provider>('/provider/profile', token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function regenerateWebhookSecret(token: string): Promise<{ webhookSecret: string }> {
  return providerFetch<{ webhookSecret: string }>('/provider/webhook-secret/regenerate', token, {
    method: 'POST',
  })
}

// Stats API
export async function getProviderStats(token: string): Promise<ProviderStats> {
  return providerFetch<ProviderStats>('/provider/stats', token)
}

// Auth API (no token required)
export async function providerLogin(
  email: string,
  password: string,
  totpCode?: string
): Promise<{ token: string; provider: Provider; requiresTwoFactor?: boolean }> {
  const response = await fetch(`${MCP_SERVER_URL}/provider/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, totpCode }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }))
    throw new Error(error.message)
  }

  return response.json()
}

export async function providerRegister(data: {
  name: string
  legalName: string
  email: string
  password: string
  description?: string
  jurisdictions: string[]
  specialties: string[]
}): Promise<{ provider: Provider }> {
  const response = await fetch(`${MCP_SERVER_URL}/provider/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Registration failed' }))
    throw new Error(error.message)
  }

  return response.json()
}

export async function providerLogout(token: string): Promise<void> {
  await providerFetch('/provider/auth/logout', token, { method: 'POST' })
}

export async function providerGetMe(token: string): Promise<Provider> {
  return providerFetch<Provider>('/provider/auth/me', token)
}

export async function providerChangePassword(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await providerFetch('/provider/auth/change-password', token, {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}
