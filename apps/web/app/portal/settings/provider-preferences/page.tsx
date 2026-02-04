'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Building2, ArrowRight, Check, X, GripVertical } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert } from '@/components/ui/alert'
import { SERVICE_TYPE_LABELS } from '@/types/provider'
import {
  getProviderPreferences,
  listMarketplaceProviders,
  setProviderPreference,
  type OperatorProviderPreference,
  type MarketplaceProvider,
} from '@/lib/api/marketplace'
import { useToast } from '@/lib/hooks/use-toast'

interface ProviderWithPreference {
  provider: MarketplaceProvider
  preference: OperatorProviderPreference
}

export default function ProviderPreferencesPage() {
  const { toast } = useToast()
  const [providers, setProviders] = useState<ProviderWithPreference[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setIsLoading(true)
      setError(null)
      try {
        const [preferencesData, marketplaceData] = await Promise.all([
          getProviderPreferences(),
          listMarketplaceProviders({ limit: 100 }),
        ])

        if (!cancelled) {
          // Match preferences with provider data
          const providerMap = new Map(marketplaceData.providers.map((p) => [p.id, p]))

          const withPreferences = preferencesData
            .map((pref) => ({
              provider: providerMap.get(pref.providerId),
              preference: pref,
            }))
            .filter((item): item is ProviderWithPreference => item.provider !== undefined)
            .sort((a, b) => b.preference.priority - a.preference.priority)

          setProviders(withPreferences)
        }
      } catch (err) {
        console.error('Failed to fetch provider preferences:', err)
        if (!cancelled) {
          setError('Failed to load provider preferences')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [])

  const handleToggleEnabled = async (providerId: string, currentEnabled: boolean) => {
    try {
      const updated = await setProviderPreference(providerId, { enabled: !currentEnabled })
      setProviders((prev) =>
        prev.map((item) =>
          item.preference.providerId === providerId ? { ...item, preference: updated } : item
        )
      )
      toast({
        title: currentEnabled ? 'Provider disabled' : 'Provider enabled',
        description: `Provider has been ${currentEnabled ? 'disabled' : 'enabled'}.`,
      })
    } catch (err) {
      console.error('Failed to toggle provider:', err)
      toast({
        title: 'Error',
        description: 'Failed to update provider. Please try again.',
        variant: 'error',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Provider Preferences</h1>
          <p className="text-text-secondary mt-1">
            Manage which providers handle your legal service requests.
          </p>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Provider Preferences</h1>
          <p className="text-text-secondary mt-1">
            Manage which providers handle your legal service requests.
          </p>
        </div>
        <Alert variant="error">{error}</Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Provider Preferences</h1>
          <p className="text-text-secondary mt-1">
            Manage which providers handle your legal service requests.
          </p>
        </div>
        <Link href="/portal/providers">
          <Button variant="outline" className="gap-1">
            Browse Marketplace
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {providers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="rounded-full bg-background-secondary p-4 w-fit mx-auto mb-4">
              <Building2 className="h-8 w-8 text-text-tertiary" />
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-1">
              No provider preferences set
            </h3>
            <p className="text-text-secondary max-w-sm mx-auto mb-4">
              Browse the provider marketplace to discover and enable legal service providers for
              your AI agents.
            </p>
            <Link href="/portal/providers">
              <Button>Browse Providers</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configured Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {providers.map(({ provider, preference }) => (
                <div
                  key={preference.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-background-secondary"
                >
                  <GripVertical className="h-4 w-4 text-text-tertiary cursor-grab" />
                  <div className="rounded-lg bg-background-tertiary p-2">
                    <Building2 className="h-4 w-4 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/portal/providers/${provider.id}`}
                        className="font-medium text-text-primary hover:text-primary-500"
                      >
                        {provider.name}
                      </Link>
                      <Badge variant="default" className="text-xs">
                        Priority: {preference.priority}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {preference.serviceTypes.slice(0, 3).map((type) => (
                        <span key={type} className="text-xs text-text-secondary">
                          {SERVICE_TYPE_LABELS[type]}
                          {preference.serviceTypes.indexOf(type) <
                            Math.min(preference.serviceTypes.length, 3) - 1 && ', '}
                        </span>
                      ))}
                      {preference.serviceTypes.length > 3 && (
                        <span className="text-xs text-text-tertiary">
                          +{preference.serviceTypes.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant={preference.enabled ? 'outline' : 'ghost'}
                    size="sm"
                    onClick={() => handleToggleEnabled(provider.id, preference.enabled)}
                  >
                    {preference.enabled ? (
                      <>
                        <Check className="h-4 w-4 mr-1 text-success-500" /> Enabled
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-1 text-error-500" /> Disabled
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
