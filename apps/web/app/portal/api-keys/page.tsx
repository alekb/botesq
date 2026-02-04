'use client'

import { useState } from 'react'
import { ApiKeyList } from '@/components/portal/api-keys'
import { useToast } from '@/lib/hooks/use-toast'
interface ApiKey {
  id: string
  keyPrefix: string
  name: string | null
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED'
  createdAt: Date
  lastUsedAt: Date | null
  expiresAt: Date | null
}

// Mock API keys - will be replaced with real data fetching
const initialApiKeys: ApiKey[] = [
  {
    id: '1',
    keyPrefix: 'be_abc12345',
    name: 'Production Agent',
    status: 'ACTIVE' as const,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    expiresAt: null,
  },
  {
    id: '2',
    keyPrefix: 'be_def67890',
    name: 'Development',
    status: 'ACTIVE' as const,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    lastUsedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    expiresAt: null,
  },
  {
    id: '3',
    keyPrefix: 'be_ghi11111',
    name: null,
    status: 'REVOKED' as const,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    lastUsedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    expiresAt: null,
  },
]

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState(initialApiKeys)
  const { toast } = useToast()

  const handleCreateKey = async (name: string) => {
    // Mock key creation - will be replaced with real API call
    const newKey = {
      id: `${Date.now()}`,
      keyPrefix: `be_${Math.random().toString(36).substring(2, 10)}`,
      name: name || null,
      status: 'ACTIVE' as const,
      createdAt: new Date(),
      lastUsedAt: null,
      expiresAt: null,
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    setApiKeys([newKey, ...apiKeys])

    toast({
      title: 'API Key Created',
      description: 'Your new API key has been created successfully.',
    })

    // Return the full key (mock)
    return {
      key: `be_${Math.random().toString(36).substring(2, 34)}`,
      prefix: newKey.keyPrefix,
    }
  }

  const handleRevokeKey = async (id: string) => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    setApiKeys(apiKeys.map((key) => (key.id === id ? { ...key, status: 'REVOKED' as const } : key)))

    toast({
      title: 'API Key Revoked',
      description: 'The API key has been revoked and can no longer be used.',
      variant: 'error',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">API Keys</h1>
        <p className="text-text-secondary mt-1">
          Manage API keys that your AI agents use to authenticate with BotEsq.
        </p>
      </div>

      <ApiKeyList apiKeys={apiKeys} onCreateKey={handleCreateKey} onRevokeKey={handleRevokeKey} />
    </div>
  )
}
