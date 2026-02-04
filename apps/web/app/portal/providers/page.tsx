'use client'

import { useState, useEffect } from 'react'
import { ProviderList } from '@/components/portal/providers'
import {
  listMarketplaceProviders,
  type MarketplaceProvider,
  type MarketplaceFilters,
} from '@/lib/api/marketplace'

export default function ProvidersMarketplacePage() {
  const [providers, setProviders] = useState<MarketplaceProvider[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState<MarketplaceFilters>({
    limit: 20,
    offset: 0,
  })

  useEffect(() => {
    let cancelled = false

    async function fetchProviders() {
      setIsLoading(true)
      try {
        const response = await listMarketplaceProviders(filters)
        if (!cancelled) {
          setProviders(response.providers)
          setTotal(response.total)
        }
      } catch (error) {
        console.error('Failed to fetch providers:', error)
        if (!cancelled) {
          setProviders([])
          setTotal(0)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchProviders()

    return () => {
      cancelled = true
    }
  }, [filters])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Provider Marketplace</h1>
        <p className="text-text-secondary mt-1">
          Browse and enable legal service providers for your AI agents.
        </p>
      </div>

      <ProviderList
        providers={providers}
        total={total}
        isLoading={isLoading}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </div>
  )
}
