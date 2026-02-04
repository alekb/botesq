import type {
  EarningsSummary,
  ProviderSettlement,
  SettlementFilters,
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
function buildQueryString(filters: SettlementFilters): string {
  const params = new URLSearchParams()
  if (filters.status) params.append('status', filters.status)
  if (filters.limit !== undefined) params.append('limit', String(filters.limit))
  if (filters.offset !== undefined) params.append('offset', String(filters.offset))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

// Get earnings summary
export async function getEarningsSummary(
  token: string,
  period: 'day' | 'week' | 'month' | 'year' = 'month'
): Promise<EarningsSummary> {
  return providerFetch<EarningsSummary>(`/provider/earnings?period=${period}`, token)
}

// List settlements
export async function listSettlements(
  token: string,
  filters: SettlementFilters = {}
): Promise<PaginatedResponse<ProviderSettlement>> {
  const queryString = buildQueryString(filters)
  return providerFetch<PaginatedResponse<ProviderSettlement>>(
    `/provider/settlements${queryString}`,
    token
  )
}
