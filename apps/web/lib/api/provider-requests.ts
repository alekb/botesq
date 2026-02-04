import type {
  ProviderRequest,
  ProviderRequestFilters,
  ProviderRequestResponseInput,
  ProviderRequestEscalationInput,
  PendingRequestCounts,
  PaginatedResponse,
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

// Build query string from filters
function buildQueryString(filters: ProviderRequestFilters): string {
  const params = new URLSearchParams()
  if (filters.status) params.append('status', filters.status)
  if (filters.serviceType) params.append('serviceType', filters.serviceType)
  if (filters.limit !== undefined) params.append('limit', String(filters.limit))
  if (filters.offset !== undefined) params.append('offset', String(filters.offset))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

// List provider requests (work queue)
export async function listProviderRequests(
  token: string,
  filters: ProviderRequestFilters = {}
): Promise<PaginatedResponse<ProviderRequest>> {
  const queryString = buildQueryString(filters)
  return providerFetch<PaginatedResponse<ProviderRequest>>(
    `/provider/requests${queryString}`,
    token
  )
}

// Get pending request counts
export async function getPendingRequestCounts(token: string): Promise<PendingRequestCounts> {
  return providerFetch<PendingRequestCounts>('/provider/requests/pending', token)
}

// Get a single request by ID
export async function getProviderRequest(
  token: string,
  requestId: string
): Promise<ProviderRequest> {
  return providerFetch<ProviderRequest>(`/provider/requests/${requestId}`, token)
}

// Claim a request (mark as in progress)
export async function claimProviderRequest(
  token: string,
  requestId: string
): Promise<ProviderRequest> {
  return providerFetch<ProviderRequest>(`/provider/requests/${requestId}/claim`, token, {
    method: 'POST',
  })
}

// Submit response for a request
export async function submitProviderRequestResponse(
  token: string,
  requestId: string,
  data: ProviderRequestResponseInput
): Promise<ProviderRequest> {
  return providerFetch<ProviderRequest>(`/provider/requests/${requestId}/response`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// Escalate a request
export async function escalateProviderRequest(
  token: string,
  requestId: string,
  data: ProviderRequestEscalationInput
): Promise<ProviderRequest> {
  return providerFetch<ProviderRequest>(`/provider/requests/${requestId}/escalate`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
