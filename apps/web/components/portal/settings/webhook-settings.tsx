'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, RefreshCw } from 'lucide-react'
import { Alert } from '@/components/ui/alert'

interface WebhookSettingsProps {
  initialData: {
    webhookUrl?: string | null
    webhookSecret?: string | null
    lastDeliveryAt?: Date | null
    lastDeliveryStatus?: 'success' | 'failed' | null
  }
  onSave: (url: string) => Promise<{ secret: string }>
  onTest: () => Promise<boolean>
  onRegenerateSecret: () => Promise<string>
}

export function WebhookSettings({
  initialData,
  onSave,
  onTest,
  onRegenerateSecret,
}: WebhookSettingsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [url, setUrl] = useState(initialData.webhookUrl || '')
  const [secret, setSecret] = useState(initialData.webhookSecret || '')
  const [copied, setCopied] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)

  const handleSave = async () => {
    setIsLoading(true)
    const result = await onSave(url)
    setSecret(result.secret)
    setIsLoading(false)
  }

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult(null)
    const success = await onTest()
    setTestResult(success)
    setIsTesting(false)
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    const newSecret = await onRegenerateSecret()
    setSecret(newSecret)
    setIsRegenerating(false)
  }

  const handleCopy = async () => {
    if (secret) {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Webhooks</CardTitle>
            <CardDescription>
              Receive real-time notifications when events happen in your matters.
            </CardDescription>
          </div>
          {url && (
            <Badge variant={initialData.lastDeliveryStatus === 'success' ? 'success' : 'warning'}>
              {initialData.lastDeliveryStatus === 'success' ? 'Active' : 'Configured'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="webhookUrl">Webhook URL</Label>
          <Input
            id="webhookUrl"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-server.com/webhooks/botesq"
          />
          <p className="text-xs text-text-tertiary">
            We&apos;ll send POST requests to this URL for matter events.
          </p>
        </div>

        {secret && (
          <div className="space-y-2">
            <Label>Signing Secret</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono bg-background-tertiary px-3 py-2 rounded-md truncate">
                {secret}
              </code>
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRegenerate}
                isLoading={isRegenerating}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-text-tertiary">
              Use this secret to verify webhook signatures. See our{' '}
              <a href="/docs" className="text-primary-500 hover:underline">
                documentation
              </a>{' '}
              for implementation details.
            </p>
          </div>
        )}

        {testResult !== null && (
          <Alert variant={testResult ? 'success' : 'error'}>
            {testResult
              ? 'Test webhook delivered successfully!'
              : 'Webhook delivery failed. Please check your URL and try again.'}
          </Alert>
        )}

        <div className="flex gap-3">
          <Button onClick={handleSave} isLoading={isLoading}>
            Save Webhook
          </Button>
          {url && (
            <Button variant="outline" onClick={handleTest} isLoading={isTesting}>
              Send Test
            </Button>
          )}
        </div>

        <div className="pt-4 border-t border-border-default">
          <h4 className="text-sm font-medium text-text-primary mb-2">Webhook Events</h4>
          <ul className="text-sm text-text-secondary space-y-1">
            <li>
              • <code className="text-xs">matter.created</code> - New matter created
            </li>
            <li>
              • <code className="text-xs">matter.updated</code> - Matter status changed
            </li>
            <li>
              • <code className="text-xs">document.analyzed</code> - Document analysis completed
            </li>
            <li>
              • <code className="text-xs">consultation.completed</code> - Legal response ready
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
