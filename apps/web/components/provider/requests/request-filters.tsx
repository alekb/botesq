'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SERVICE_TYPE_LABELS, REQUEST_STATUS_LABELS } from '@/types/provider'
import type { ProviderRequestStatus, ProviderServiceType } from '@/types/provider'

interface RequestFiltersProps {
  status: ProviderRequestStatus | 'ALL'
  serviceType: ProviderServiceType | 'ALL'
  onStatusChange: (status: ProviderRequestStatus | 'ALL') => void
  onServiceTypeChange: (serviceType: ProviderServiceType | 'ALL') => void
}

export function RequestFilters({
  status,
  serviceType,
  onStatusChange,
  onServiceTypeChange,
}: RequestFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Statuses</SelectItem>
          {Object.entries(REQUEST_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={serviceType} onValueChange={onServiceTypeChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Service Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Services</SelectItem>
          {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
