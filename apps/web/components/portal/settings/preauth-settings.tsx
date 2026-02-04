'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, RefreshCw } from 'lucide-react'

interface PreAuthSettingsProps {
  initialData: {
    preAuthEnabled: boolean
    preAuthToken?: string | null
    preAuthMaxCredits?: number | null
  }
  onSave: (data: { enabled: boolean; maxCredits?: number }) => Promise<{ token?: string }>
  onRegenerateToken: () => Promise<string>
}

export function PreAuthSettings({ initialData, onSave, onRegenerateToken }: PreAuthSettingsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [enabled, setEnabled] = useState(initialData.preAuthEnabled)
  const [maxCredits, setMaxCredits] = useState(initialData.preAuthMaxCredits?.toString() || '')
  const [token, setToken] = useState(initialData.preAuthToken || '')
  const [copied, setCopied] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    const result = await onSave({
      enabled,
      maxCredits: maxCredits ? parseInt(maxCredits, 10) : undefined,
    })
    if (result.token) {
      setToken(result.token)
    }
    setIsLoading(false)
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    const newToken = await onRegenerateToken()
    setToken(newToken)
    setIsRegenerating(false)
  }

  const handleCopy = async () => {
    if (token) {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Pre-Authorization</CardTitle>
            <CardDescription>
              Allow agents to auto-approve retainer agreements up to a credit limit.
            </CardDescription>
          </div>
          <Badge variant={enabled ? 'success' : 'default'}>
            {enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Enable Pre-Authorization</Label>
            <p className="text-sm text-text-secondary mt-1">
              When enabled, agents can accept retainers without manual approval.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? 'bg-primary-500' : 'bg-background-tertiary'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {enabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="maxCredits">Maximum Credits Per Matter</Label>
              <Input
                id="maxCredits"
                type="number"
                value={maxCredits}
                onChange={(e) => setMaxCredits(e.target.value)}
                placeholder="e.g., 50000"
              />
              <p className="text-xs text-text-tertiary">
                Agents can auto-approve matters up to this credit limit. Leave empty for no limit.
              </p>
            </div>

            {token && (
              <div className="space-y-2">
                <Label>Pre-Auth Token</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono bg-background-tertiary px-3 py-2 rounded-md truncate">
                    {token}
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
                  Include this token with your API key to enable pre-authorization.
                </p>
              </div>
            )}
          </>
        )}

        <Button onClick={handleSave} isLoading={isLoading}>
          Save Settings
        </Button>
      </CardContent>
    </Card>
  )
}
