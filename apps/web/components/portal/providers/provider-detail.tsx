'use client'

import { Building2, MapPin, Star, Clock, Scale, Award } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SERVICE_TYPE_LABELS, PRICE_MODEL_LABELS } from '@/types/provider'
import { formatCredits } from '@/lib/utils/format'
import type { MarketplaceProvider } from '@/lib/api/marketplace'

interface ProviderDetailProps {
  provider?: MarketplaceProvider
  isLoading?: boolean
}

function formatResponseTime(mins?: number): string {
  if (!mins) return 'N/A'
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  if (remainingMins === 0) return `${hours}h`
  return `${hours}h ${remainingMins}m`
}

function getQualityColor(score: number): string {
  if (score >= 90) return 'text-success-500'
  if (score >= 70) return 'text-warning-500'
  return 'text-error-500'
}

function getQualityLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Very Good'
  if (score >= 70) return 'Good'
  if (score >= 60) return 'Fair'
  return 'Needs Improvement'
}

export function ProviderDetail({ provider, isLoading }: ProviderDetailProps) {
  if (isLoading || !provider) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const enabledServices = provider.services.filter((s) => s.enabled)

  return (
    <div className="space-y-4">
      {/* Provider Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-background-tertiary p-4 flex-shrink-0">
              <Building2 className="h-8 w-8 text-primary-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-text-primary mb-1">{provider.name}</h2>
              <p className="text-sm text-text-secondary mb-3">{provider.legalName}</p>
              {provider.description && (
                <p className="text-sm text-text-secondary mb-4">{provider.description}</p>
              )}

              {/* Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Star className={`h-4 w-4 ${getQualityColor(provider.qualityScore)}`} />
                  <div>
                    <p className="text-xs text-text-tertiary">Quality</p>
                    <p className={`text-sm font-medium ${getQualityColor(provider.qualityScore)}`}>
                      {provider.qualityScore.toFixed(0)}% - {getQualityLabel(provider.qualityScore)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-text-tertiary" />
                  <div>
                    <p className="text-xs text-text-tertiary">Avg Response</p>
                    <p className="text-sm font-medium">
                      {formatResponseTime(provider.avgResponseMins)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-text-tertiary" />
                  <div>
                    <p className="text-xs text-text-tertiary">Services</p>
                    <p className="text-sm font-medium">{enabledServices.length} available</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-text-tertiary" />
                  <div>
                    <p className="text-xs text-text-tertiary">Jurisdictions</p>
                    <p className="text-sm font-medium">{provider.jurisdictions.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jurisdictions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Jurisdictions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {provider.jurisdictions.map((jur) => (
              <Badge key={jur} variant="default">
                {jur}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Specialties */}
      {provider.specialties.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Specialties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {provider.specialties.map((spec) => (
                <Badge key={spec} variant="default">
                  {spec.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Available Services</CardTitle>
        </CardHeader>
        <CardContent>
          {enabledServices.length === 0 ? (
            <p className="text-sm text-text-tertiary">No services currently available</p>
          ) : (
            <div className="space-y-3">
              {enabledServices.map((service) => (
                <div
                  key={service.serviceType}
                  className="flex items-center justify-between p-3 rounded-lg bg-background-secondary"
                >
                  <div>
                    <p className="font-medium text-text-primary">
                      {SERVICE_TYPE_LABELS[service.serviceType]}
                    </p>
                    <p className="text-xs text-text-secondary">
                      Target: {formatResponseTime(service.targetResponseMins)} response time
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-primary-500">
                      {formatCredits(service.basePrice)}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {PRICE_MODEL_LABELS[service.priceModel]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
