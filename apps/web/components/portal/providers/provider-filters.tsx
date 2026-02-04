'use client'

import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SERVICE_TYPE_LABELS, type ProviderServiceType } from '@/types/provider'
import type { MarketplaceFilters } from '@/lib/api/marketplace'

interface ProviderFiltersProps {
  filters: MarketplaceFilters
  onFiltersChange: (filters: MarketplaceFilters) => void
}

const JURISDICTIONS = [
  { value: 'US-CA', label: 'California' },
  { value: 'US-NY', label: 'New York' },
  { value: 'US-TX', label: 'Texas' },
  { value: 'US-FL', label: 'Florida' },
  { value: 'US-DE', label: 'Delaware' },
  { value: 'US-WA', label: 'Washington' },
  { value: 'US-IL', label: 'Illinois' },
  { value: 'US-MA', label: 'Massachusetts' },
]

const SERVICE_TYPES = Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => ({
  value: value as ProviderServiceType,
  label,
}))

export function ProviderFilters({ filters, onFiltersChange }: ProviderFiltersProps) {
  const hasFilters = filters.search || filters.serviceType || filters.jurisdiction

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value || undefined, offset: 0 })
  }

  const handleServiceTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      serviceType: value === 'all' ? undefined : (value as ProviderServiceType),
      offset: 0,
    })
  }

  const handleJurisdictionChange = (value: string) => {
    onFiltersChange({
      ...filters,
      jurisdiction: value === 'all' ? undefined : value,
      offset: 0,
    })
  }

  const clearFilters = () => {
    onFiltersChange({ limit: filters.limit, offset: 0 })
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <Input
          placeholder="Search providers..."
          value={filters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={filters.serviceType || 'all'} onValueChange={handleServiceTypeChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Service Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Services</SelectItem>
          {SERVICE_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.jurisdiction || 'all'} onValueChange={handleJurisdictionChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Jurisdiction" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Jurisdictions</SelectItem>
          {JURISDICTIONS.map((jur) => (
            <SelectItem key={jur.value} value={jur.value}>
              {jur.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
