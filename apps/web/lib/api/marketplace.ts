import { api } from './client'
import type { ProviderService, ProviderServiceType } from '@/types/provider'

// Re-export for convenience
export type { ProviderServiceType } from '@/types/provider'

// Marketplace-specific types
export interface MarketplaceProvider {
  id: string
  externalId: string
  name: string
  legalName: string
  description?: string
  status: 'ACTIVE'
  jurisdictions: string[]
  specialties: string[]
  serviceTypes: ProviderServiceType[]
  avgResponseMins?: number
  qualityScore: number
  services: ProviderService[]
  // Operator-specific preference info (if exists)
  preference?: OperatorProviderPreference
}

export interface OperatorProviderPreference {
  id: string
  operatorId: string
  providerId: string
  enabled: boolean
  priority: number
  serviceTypes: ProviderServiceType[]
  createdAt: string
  updatedAt: string
}

export interface MarketplaceFilters {
  serviceType?: ProviderServiceType
  jurisdiction?: string
  specialty?: string
  search?: string
  limit?: number
  offset?: number
}

export interface MarketplaceResponse {
  providers: MarketplaceProvider[]
  total: number
  limit: number
  offset: number
}

export interface PreferenceInput {
  enabled?: boolean
  priority?: number
  serviceTypes?: ProviderServiceType[]
}

// API functions

/**
 * List available providers in the marketplace
 */
export async function listMarketplaceProviders(
  filters: MarketplaceFilters = {}
): Promise<MarketplaceResponse> {
  return api.get<MarketplaceResponse>('/api/portal/marketplace/providers', {
    params: {
      serviceType: filters.serviceType,
      jurisdiction: filters.jurisdiction,
      specialty: filters.specialty,
      search: filters.search,
      limit: filters.limit ?? 20,
      offset: filters.offset ?? 0,
    },
  })
}

/**
 * Get a single provider's details
 */
export async function getMarketplaceProvider(providerId: string): Promise<MarketplaceProvider> {
  return api.get<MarketplaceProvider>(`/api/portal/marketplace/providers/${providerId}`)
}

/**
 * Get operator's provider preferences
 */
export async function getProviderPreferences(): Promise<OperatorProviderPreference[]> {
  return api.get<OperatorProviderPreference[]>('/api/portal/provider-preferences')
}

/**
 * Set or update preference for a specific provider
 */
export async function setProviderPreference(
  providerId: string,
  input: PreferenceInput
): Promise<OperatorProviderPreference> {
  return api.post<OperatorProviderPreference>(
    `/api/portal/provider-preferences/${providerId}`,
    input
  )
}

/**
 * Remove preference for a provider (revert to default)
 */
export async function removeProviderPreference(providerId: string): Promise<void> {
  return api.delete(`/api/portal/provider-preferences/${providerId}`)
}

/**
 * Enable a provider for the operator
 */
export async function enableProvider(providerId: string): Promise<OperatorProviderPreference> {
  return setProviderPreference(providerId, { enabled: true })
}

/**
 * Disable a provider for the operator
 */
export async function disableProvider(providerId: string): Promise<OperatorProviderPreference> {
  return setProviderPreference(providerId, { enabled: false })
}

/**
 * Update provider priority (higher = preferred)
 */
export async function updateProviderPriority(
  providerId: string,
  priority: number
): Promise<OperatorProviderPreference> {
  return setProviderPreference(providerId, { priority })
}
