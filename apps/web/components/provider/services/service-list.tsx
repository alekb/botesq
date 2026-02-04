'use client'

import { Layers } from 'lucide-react'
import { ServiceCard } from './service-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import type { ProviderService } from '@/types/provider'

interface ServiceListProps {
  services: ProviderService[]
  isLoading?: boolean
  updatingServiceId?: string
  onToggle: (service: ProviderService, enabled: boolean) => void
  onEdit: (service: ProviderService) => void
  onDelete: (service: ProviderService) => void
}

export function ServiceList({
  services,
  isLoading,
  updatingServiceId,
  onToggle,
  onEdit,
  onDelete,
}: ServiceListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full max-w-md" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No services configured</p>
        <p className="text-sm">Add a service to start receiving requests</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          onToggle={(enabled) => onToggle(service, enabled)}
          onEdit={() => onEdit(service)}
          onDelete={() => onDelete(service)}
          isUpdating={updatingServiceId === service.id}
        />
      ))}
    </div>
  )
}
