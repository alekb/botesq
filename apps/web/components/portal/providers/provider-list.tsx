'use client'

import { Building2 } from 'lucide-react'
import { ProviderCard } from './provider-card'
import { ProviderFilters } from './provider-filters'
import { Skeleton } from '@/components/ui/skeleton'
import type { MarketplaceProvider, MarketplaceFilters } from '@/lib/api/marketplace'

interface ProviderListProps {
  providers: MarketplaceProvider[]
  total: number
  isLoading?: boolean
  filters: MarketplaceFilters
  onFiltersChange: (filters: MarketplaceFilters) => void
}

export function ProviderList({
  providers,
  total,
  isLoading,
  filters,
  onFiltersChange,
}: ProviderListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <ProviderFilters filters={filters} onFiltersChange={onFiltersChange} />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ProviderFilters filters={filters} onFiltersChange={onFiltersChange} />

      <div className="flex items-center justify-between text-sm text-text-secondary">
        <span>
          {total} provider{total !== 1 ? 's' : ''} found
        </span>
      </div>

      {providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-background-secondary p-4 mb-4">
            <Building2 className="h-8 w-8 text-text-tertiary" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-1">No providers found</h3>
          <p className="text-text-secondary max-w-sm">
            Try adjusting your filters or search criteria to find available providers.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      )}
    </div>
  )
}
