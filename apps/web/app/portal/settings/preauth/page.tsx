'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PreAuthSettings } from '@/components/portal/settings'
import { useToast } from '@/lib/hooks/use-toast'

interface PreAuthData {
  preAuthEnabled: boolean
  preAuthToken: string | null
  preAuthMaxCredits: number | null
}

// Mock data - will be replaced with real data fetching
const mockPreAuthData: PreAuthData = {
  preAuthEnabled: true,
  preAuthToken: 'pauth_abc123xyz789',
  preAuthMaxCredits: 50000,
}

export default function PreAuthSettingsPage() {
  const { toast } = useToast()
  const [data, setData] = useState(mockPreAuthData)

  const handleSave = async (settings: { enabled: boolean; maxCredits?: number }) => {
    // Mock save - will be replaced with real API call
    await new Promise((resolve) => setTimeout(resolve, 500))

    const newData = {
      ...data,
      preAuthEnabled: settings.enabled,
      preAuthMaxCredits: settings.maxCredits ?? null,
      preAuthToken: settings.enabled
        ? data.preAuthToken || `pauth_${Math.random().toString(36).substring(2, 18)}`
        : null,
    }
    setData(newData)

    toast({
      title: 'Settings saved',
      description: 'Pre-authorization settings have been updated.',
    })

    return { token: newData.preAuthToken || undefined }
  }

  const handleRegenerateToken = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    const newToken = `pauth_${Math.random().toString(36).substring(2, 18)}`
    setData({ ...data, preAuthToken: newToken })
    toast({
      title: 'Token regenerated',
      description:
        'Your pre-authorization token has been regenerated. Update your agent configuration.',
      variant: 'warning',
    })
    return newToken
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/portal/settings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Pre-Authorization</h1>
          <p className="text-text-secondary mt-1">
            Configure automatic retainer approval for your agents.
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <PreAuthSettings
          initialData={data}
          onSave={handleSave}
          onRegenerateToken={handleRegenerateToken}
        />
      </div>
    </div>
  )
}
