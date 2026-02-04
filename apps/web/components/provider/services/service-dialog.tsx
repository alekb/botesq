'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { SERVICE_TYPE_LABELS, PRICE_MODEL_LABELS } from '@/types/provider'
import type {
  ProviderService,
  ProviderServiceType,
  PriceModel,
  ProviderServiceInput,
} from '@/types/provider'

interface ServiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service?: ProviderService // If provided, editing mode
  existingServiceTypes: ProviderServiceType[] // Services already configured
  onSubmit: (data: ProviderServiceInput) => Promise<void>
  isSubmitting?: boolean
}

const DEFAULT_VALUES: Omit<ProviderServiceInput, 'serviceType'> = {
  basePrice: 1000,
  priceModel: 'FLAT',
  maxConcurrent: 5,
  targetResponseMins: 60,
  enabled: true,
}

export function ServiceDialog({
  open,
  onOpenChange,
  service,
  existingServiceTypes,
  onSubmit,
  isSubmitting,
}: ServiceDialogProps) {
  const [formData, setFormData] = useState<Partial<ProviderServiceInput>>({})
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!service

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      if (service) {
        setFormData({
          serviceType: service.serviceType,
          basePrice: service.basePrice,
          priceModel: service.priceModel,
          pricePerUnit: service.pricePerUnit ?? undefined,
          maxConcurrent: service.maxConcurrent,
          targetResponseMins: service.targetResponseMins,
          enabled: service.enabled,
        })
      } else {
        setFormData(DEFAULT_VALUES)
      }
      setError(null)
    }
  }, [open, service])

  const availableServiceTypes = Object.keys(SERVICE_TYPE_LABELS).filter(
    (type) => !existingServiceTypes.includes(type as ProviderServiceType)
  ) as ProviderServiceType[]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate
    if (!formData.serviceType) {
      setError('Please select a service type')
      return
    }
    if (!formData.basePrice || formData.basePrice < 0) {
      setError('Base price must be a positive number')
      return
    }
    if (!formData.targetResponseMins || formData.targetResponseMins < 1) {
      setError('Target response time must be at least 1 minute')
      return
    }

    try {
      await onSubmit(formData as ProviderServiceInput)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save service')
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Service' : 'Add Service'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your service configuration'
              : 'Configure a new service you can offer'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <div className="space-y-2">
            <Label htmlFor="serviceType">Service Type</Label>
            {isEditing ? (
              <Input
                value={SERVICE_TYPE_LABELS[formData.serviceType as ProviderServiceType] || ''}
                disabled
              />
            ) : (
              <Select
                value={formData.serviceType}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, serviceType: value as ProviderServiceType }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a service type" />
                </SelectTrigger>
                <SelectContent>
                  {availableServiceTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {SERVICE_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price (credits)</Label>
              <Input
                id="basePrice"
                type="number"
                min={0}
                value={formData.basePrice || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, basePrice: parseInt(e.target.value) || 0 }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priceModel">Price Model</Label>
              <Select
                value={formData.priceModel}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, priceModel: value as PriceModel }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRICE_MODEL_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.priceModel !== 'FLAT' && (
            <div className="space-y-2">
              <Label htmlFor="pricePerUnit">
                Price Per{' '}
                {formData.priceModel === 'PER_PAGE'
                  ? 'Page'
                  : formData.priceModel === 'PER_HOUR'
                    ? 'Hour'
                    : 'Unit'}{' '}
                (credits)
              </Label>
              <Input
                id="pricePerUnit"
                type="number"
                min={0}
                value={formData.pricePerUnit || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pricePerUnit: parseInt(e.target.value) || undefined,
                  }))
                }
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxConcurrent">Max Concurrent</Label>
              <Input
                id="maxConcurrent"
                type="number"
                min={1}
                max={100}
                value={formData.maxConcurrent || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, maxConcurrent: parseInt(e.target.value) || 1 }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetResponseMins">Target Response (min)</Label>
              <Input
                id="targetResponseMins"
                type="number"
                min={1}
                value={formData.targetResponseMins || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    targetResponseMins: parseInt(e.target.value) || 1,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEditing ? 'Save Changes' : 'Add Service'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
