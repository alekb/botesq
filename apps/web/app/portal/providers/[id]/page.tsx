'use client'

import { useState, useEffect, use } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { ProviderDetail, ProviderPreferenceForm } from '@/components/portal/providers'
import {
  getMarketplaceProvider,
  setProviderPreference,
  removeProviderPreference,
  type MarketplaceProvider,
  type ProviderServiceType,
} from '@/lib/api/marketplace'
import { useToast } from '@/lib/hooks/use-toast'

interface ProviderDetailPageProps {
  params: Promise<{ id: string }>
}

export default function ProviderDetailPage({ params }: ProviderDetailPageProps) {
  const { id } = use(params)
  const { toast } = useToast()
  const [provider, setProvider] = useState<MarketplaceProvider | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchProvider() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getMarketplaceProvider(id)
        if (!cancelled) {
          setProvider(data)
        }
      } catch (err) {
        console.error('Failed to fetch provider:', err)
        if (!cancelled) {
          setError('Failed to load provider details')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchProvider()

    return () => {
      cancelled = true
    }
  }, [id])

  const handleSavePreferences = async (data: {
    enabled: boolean
    priority: number
    serviceTypes: ProviderServiceType[]
  }) => {
    try {
      const updated = await setProviderPreference(id, data)
      setProvider((prev) => (prev ? { ...prev, preference: updated } : null))
      toast({
        title: 'Preferences saved',
        description: 'Your provider preferences have been updated.',
      })
    } catch (err) {
      console.error('Failed to save preferences:', err)
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'error',
      })
      throw err
    }
  }

  const handleRemovePreferences = async () => {
    try {
      await removeProviderPreference(id)
      setProvider((prev) => (prev ? { ...prev, preference: undefined } : null))
      toast({
        title: 'Preferences reset',
        description: 'Provider preferences have been reset to default.',
      })
    } catch (err) {
      console.error('Failed to remove preferences:', err)
      toast({
        title: 'Error',
        description: 'Failed to reset preferences. Please try again.',
        variant: 'error',
      })
      throw err
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link href="/portal/providers">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Marketplace
          </Button>
        </Link>
        <Alert variant="error">{error}</Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/portal/providers">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {isLoading ? 'Loading...' : provider?.name}
          </h1>
          <p className="text-text-secondary">Provider Details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProviderDetail provider={provider ?? undefined} isLoading={isLoading} />
        </div>
        <div>
          {provider && (
            <ProviderPreferenceForm
              provider={provider}
              preference={provider.preference}
              onSave={handleSavePreferences}
              onRemove={provider.preference ? handleRemovePreferences : undefined}
            />
          )}
        </div>
      </div>
    </div>
  )
}
