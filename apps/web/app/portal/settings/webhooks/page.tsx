'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WebhookSettings } from '@/components/portal/settings'
import { useToast } from '@/lib/hooks/use-toast'

// Mock data - will be replaced with real data fetching
const mockWebhookData = {
  webhookUrl: 'https://api.example.com/webhooks/botesq',
  webhookSecret: 'whsec_abc123xyz789',
  lastDeliveryAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  lastDeliveryStatus: 'success' as const,
}

export default function WebhookSettingsPage() {
  const { toast } = useToast()
  const [data, setData] = useState(mockWebhookData)

  const handleSave = async (url: string) => {
    // Mock save - will be replaced with real API call
    await new Promise((resolve) => setTimeout(resolve, 500))

    const secret = data.webhookSecret || `whsec_${Math.random().toString(36).substring(2, 26)}`
    setData({ ...data, webhookUrl: url, webhookSecret: secret })

    toast({
      title: 'Webhook saved',
      description: 'Your webhook endpoint has been configured.',
    })

    return { secret }
  }

  const handleTest = async () => {
    // Mock test - will be replaced with real API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const success = Math.random() > 0.2 // 80% success rate for demo

    if (success) {
      setData({ ...data, lastDeliveryAt: new Date(), lastDeliveryStatus: 'success' })
    }

    return success
  }

  const handleRegenerateSecret = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    const newSecret = `whsec_${Math.random().toString(36).substring(2, 26)}`
    setData({ ...data, webhookSecret: newSecret })
    toast({
      title: 'Secret regenerated',
      description:
        'Your webhook signing secret has been regenerated. Update your server configuration.',
      variant: 'warning',
    })
    return newSecret
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
          <h1 className="text-2xl font-bold text-text-primary">Webhooks</h1>
          <p className="text-text-secondary mt-1">
            Set up webhooks to receive real-time event notifications.
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <WebhookSettings
          initialData={data}
          onSave={handleSave}
          onTest={handleTest}
          onRegenerateSecret={handleRegenerateSecret}
        />
      </div>
    </div>
  )
}
