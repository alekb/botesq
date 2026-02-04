'use client'

import { useState } from 'react'
import { RefreshCw, Eye, EyeOff, Copy, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import type { Provider } from '@/types/provider'

interface WebhookSettingsProps {
  provider: Provider
  webhookSecret?: string
  onUpdateUrl: (url: string) => Promise<void>
  onRegenerateSecret: () => Promise<string>
  isUpdating?: boolean
}

export function WebhookSettings({
  provider,
  webhookSecret,
  onUpdateUrl,
  onRegenerateSecret,
  isUpdating,
}: WebhookSettingsProps) {
  const [webhookUrl, setWebhookUrl] = useState(provider.webhookUrl || '')
  const [secret, setSecret] = useState(webhookSecret || '')
  const [showSecret, setShowSecret] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleSaveUrl = async () => {
    setError(null)
    setSuccess(null)

    try {
      await onUpdateUrl(webhookUrl)
      setSuccess('Webhook URL updated successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update webhook URL')
    }
  }

  const handleRegenerateSecret = async () => {
    setError(null)
    setSuccess(null)
    setIsRegenerating(true)

    try {
      const newSecret = await onRegenerateSecret()
      setSecret(newSecret)
      setShowSecret(true)
      setSuccess('Webhook secret regenerated. Make sure to update your integration.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate secret')
    } finally {
      setIsRegenerating(false)
    }
  }

  const copySecret = async () => {
    if (!secret) return
    await navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Configuration</CardTitle>
        <CardDescription>
          Configure webhooks to receive real-time notifications about new requests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                id="webhookUrl"
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/webhook"
              />
              <Button onClick={handleSaveUrl} isLoading={isUpdating} disabled={!webhookUrl}>
                Save
              </Button>
            </div>
            <p className="text-xs text-text-secondary">
              We&apos;ll POST request notifications to this URL
            </p>
          </div>

          <div className="space-y-2">
            <Label>Webhook Secret</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  value={secret || '••••••••••••••••'}
                  readOnly
                  className="pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  {secret && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={copySecret}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-success-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleRegenerateSecret}
                isLoading={isRegenerating}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
            </div>
            <p className="text-xs text-text-secondary">
              Use this secret to verify webhook signatures (HMAC-SHA256)
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-background-secondary p-4">
          <h4 className="text-sm font-medium mb-2">Webhook Payload Example</h4>
          <pre className="text-xs overflow-x-auto">
            {`{
  "event": "request.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "requestId": "req_123...",
    "serviceType": "LEGAL_QA",
    "slaDeadline": "2024-01-15T14:30:00Z"
  }
}`}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
