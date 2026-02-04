import Link from 'next/link'
import { Building2, MapPin, Star, Clock, ChevronRight, Check, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SERVICE_TYPE_LABELS } from '@/types/provider'
import type { MarketplaceProvider } from '@/lib/api/marketplace'

interface ProviderCardProps {
  provider: MarketplaceProvider
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

export function ProviderCard({ provider }: ProviderCardProps) {
  const isEnabled = provider.preference?.enabled !== false
  const enabledServices = provider.services.filter((s) => s.enabled)

  return (
    <Link href={`/portal/providers/${provider.id}`}>
      <Card className="hover:border-primary-500 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="rounded-lg bg-background-tertiary p-2 flex-shrink-0">
                <Building2 className="h-5 w-5 text-primary-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-text-primary truncate">{provider.name}</h3>
                  {provider.preference && (
                    <Badge variant={isEnabled ? 'success' : 'default'} className="flex-shrink-0">
                      {isEnabled ? (
                        <>
                          <Check className="h-3 w-3 mr-1" /> Enabled
                        </>
                      ) : (
                        <>
                          <X className="h-3 w-3 mr-1" /> Disabled
                        </>
                      )}
                    </Badge>
                  )}
                </div>
                {provider.description && (
                  <p className="text-sm text-text-secondary line-clamp-2 mb-2">
                    {provider.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mb-2">
                  {enabledServices.slice(0, 3).map((service) => (
                    <Badge key={service.serviceType} variant="default" className="text-xs">
                      {SERVICE_TYPE_LABELS[service.serviceType]}
                    </Badge>
                  ))}
                  {enabledServices.length > 3 && (
                    <Badge variant="default" className="text-xs">
                      +{enabledServices.length - 3} more
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-text-tertiary">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {provider.jurisdictions.slice(0, 2).join(', ')}
                    {provider.jurisdictions.length > 2 && ` +${provider.jurisdictions.length - 2}`}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatResponseTime(provider.avgResponseMins)} avg
                  </span>
                  <span
                    className={`flex items-center gap-1 ${getQualityColor(provider.qualityScore)}`}
                  >
                    <Star className="h-3 w-3" />
                    {provider.qualityScore.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-text-tertiary flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
