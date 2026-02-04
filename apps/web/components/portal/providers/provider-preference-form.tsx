'use client'

import { useState } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SERVICE_TYPE_LABELS, type ProviderServiceType } from '@/types/provider'
import type { MarketplaceProvider, OperatorProviderPreference } from '@/lib/api/marketplace'

interface ProviderPreferenceFormProps {
  provider: MarketplaceProvider
  preference?: OperatorProviderPreference
  onSave: (data: {
    enabled: boolean
    priority: number
    serviceTypes: ProviderServiceType[]
  }) => Promise<void>
  onRemove?: () => Promise<void>
}

export function ProviderPreferenceForm({
  provider,
  preference,
  onSave,
  onRemove,
}: ProviderPreferenceFormProps) {
  const [isEnabled, setIsEnabled] = useState(preference?.enabled ?? true)
  const [priority, setPriority] = useState(preference?.priority ?? 0)
  const [selectedServices, setSelectedServices] = useState<ProviderServiceType[]>(
    preference?.serviceTypes ?? provider.serviceTypes
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const availableServices = provider.services.filter((s) => s.enabled)

  const handleServiceToggle = (serviceType: ProviderServiceType) => {
    setSelectedServices((prev) =>
      prev.includes(serviceType) ? prev.filter((s) => s !== serviceType) : [...prev, serviceType]
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({
        enabled: isEnabled,
        priority,
        serviceTypes: selectedServices,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!onRemove) return
    setIsRemoving(true)
    try {
      await onRemove()
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Provider Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Enable Provider</Label>
            <p className="text-xs text-text-secondary">
              Allow this provider to handle your requests
            </p>
          </div>
          <Button
            variant={isEnabled ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setIsEnabled(!isEnabled)}
          >
            {isEnabled ? (
              <>
                <Check className="h-4 w-4 mr-1" /> Enabled
              </>
            ) : (
              <>
                <X className="h-4 w-4 mr-1" /> Disabled
              </>
            )}
          </Button>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <Label htmlFor="priority" className="text-sm font-medium">
            Priority
          </Label>
          <p className="text-xs text-text-secondary">
            Higher priority providers are preferred when routing requests (0-100)
          </p>
          <Input
            id="priority"
            type="number"
            min={0}
            max={100}
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
            className="w-24"
          />
        </div>

        {/* Service Types */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Enabled Services</Label>
          <p className="text-xs text-text-secondary">
            Select which services this provider can handle for you
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {availableServices.map((service) => {
              const isSelected = selectedServices.includes(service.serviceType)
              return (
                <Badge
                  key={service.serviceType}
                  variant={isSelected ? 'success' : 'default'}
                  className="cursor-pointer"
                  onClick={() => handleServiceToggle(service.serviceType)}
                >
                  {isSelected && <Check className="h-3 w-3 mr-1" />}
                  {SERVICE_TYPE_LABELS[service.serviceType]}
                </Badge>
              )
            })}
          </div>
          {availableServices.length === 0 && (
            <p className="text-sm text-text-tertiary">No services available from this provider</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border-default">
          {preference && onRemove ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={isRemoving}
              className="text-error-500 hover:text-error-400"
            >
              {isRemoving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Reset to Default
            </Button>
          ) : (
            <div />
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
