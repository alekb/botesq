'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ProfileForm } from '@/components/provider/settings'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { getCurrentProvider } from '@/lib/auth/provider-actions'
import { updateProviderProfile } from '@/lib/api/provider'
import { getProviderToken } from '@/lib/auth/provider-session'
import type { Provider, ProviderProfileUpdateInput } from '@/types/provider'

export default function ProviderProfileSettingsPage() {
  const [provider, setProvider] = useState<Provider | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProvider() {
      const { provider } = await getCurrentProvider()
      if (provider) {
        setProvider(provider)
      }
      setIsLoading(false)
    }
    loadProvider()
  }, [])

  const handleSubmit = async (data: ProviderProfileUpdateInput) => {
    const token = await getProviderToken()
    if (!token) return

    setIsSubmitting(true)
    setError(null)

    try {
      const updated = await updateProviderProfile(token, data)
      setProvider(updated)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </Card>
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="space-y-6">
        <Alert variant="error">Failed to load provider data</Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/provider/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Profile Settings</h1>
          <p className="text-text-secondary">Update your provider profile</p>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <ProfileForm provider={provider} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  )
}
