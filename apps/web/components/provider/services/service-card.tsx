'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ServiceToggle } from './service-toggle'
import { SERVICE_TYPE_LABELS, PRICE_MODEL_LABELS } from '@/types/provider'
import { formatCredits } from '@/lib/utils/format'
import type { ProviderService } from '@/types/provider'

interface ServiceCardProps {
  service: ProviderService
  onToggle: (enabled: boolean) => void
  onEdit: () => void
  onDelete: () => void
  isUpdating?: boolean
}

export function ServiceCard({ service, onToggle, onEdit, onDelete, isUpdating }: ServiceCardProps) {
  const loadPercentage =
    service.maxConcurrent > 0 ? Math.round((service.currentLoad / service.maxConcurrent) * 100) : 0

  return (
    <Card className="p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-medium">{SERVICE_TYPE_LABELS[service.serviceType]}</h3>
            <Badge variant={service.enabled ? 'success' : 'default'}>
              {service.enabled ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-text-secondary">Base Price</p>
              <p className="font-medium">{formatCredits(service.basePrice)}</p>
            </div>
            <div>
              <p className="text-text-secondary">Price Model</p>
              <p className="font-medium">{PRICE_MODEL_LABELS[service.priceModel]}</p>
            </div>
            <div>
              <p className="text-text-secondary">Response Target</p>
              <p className="font-medium">{service.targetResponseMins} min</p>
            </div>
            <div>
              <p className="text-text-secondary">Capacity</p>
              <p className="font-medium">
                {service.currentLoad} / {service.maxConcurrent}
                <span className="text-text-secondary ml-1">({loadPercentage}%)</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <ServiceToggle enabled={service.enabled} onChange={onToggle} disabled={isUpdating} />
          <Button variant="ghost" size="icon" onClick={onEdit} disabled={isUpdating}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={isUpdating || service.currentLoad > 0}
            className="text-error-500 hover:text-error-400"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
