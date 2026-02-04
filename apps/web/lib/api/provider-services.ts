import type {
  ProviderService,
  ProviderServiceInput,
  ProviderServiceUpdateInput,
  ProviderServiceType,
} from '@/types/provider'

const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:3001'

/**
 * Make an authenticated request to the provider API
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

// List provider services
export async function listProviderServices(token: string): Promise<ProviderService[]> {
  return providerFetch<ProviderService[]>('/provider/services', token)
}

// Create a new service
export async function createProviderService(
  token: string,
  data: ProviderServiceInput
): Promise<ProviderService> {
  return providerFetch<ProviderService>('/provider/services', token, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// Update a service
export async function updateProviderService(
  token: string,
  serviceType: ProviderServiceType,
  data: ProviderServiceUpdateInput
): Promise<ProviderService> {
  return providerFetch<ProviderService>(`/provider/services/${serviceType}`, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// Delete a service
export async function deleteProviderService(
  token: string,
  serviceType: ProviderServiceType
): Promise<void> {
  await providerFetch(`/provider/services/${serviceType}`, token, {
    method: 'DELETE',
  })
}

// Toggle service enabled/disabled
export async function toggleProviderService(
  token: string,
  serviceType: ProviderServiceType,
  enabled: boolean
): Promise<ProviderService> {
  return updateProviderService(token, serviceType, { enabled })
}
