'use client'

import { useState } from 'react'
import { Plus, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiKeyRow } from './api-key-row'
import { CreateApiKeyDialog } from './create-api-key-dialog'
import { RevokeApiKeyDialog } from './revoke-api-key-dialog'
import type { ApiKeyStatus } from '@botesq/database'

interface ApiKey {
  id: string
  keyPrefix: string
  name?: string | null
  status: ApiKeyStatus
  createdAt: Date
  lastUsedAt?: Date | null
  expiresAt?: Date | null
}

interface ApiKeyListProps {
  apiKeys: ApiKey[]
  onCreateKey: (name: string) => Promise<{ key: string; prefix: string } | null>
  onRevokeKey: (id: string) => Promise<void>
}

export function ApiKeyList({ apiKeys, onCreateKey, onRevokeKey }: ApiKeyListProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)

  const handleRevokeClick = (id: string) => {
    const key = apiKeys.find((k) => k.id === id)
    if (key) {
      setKeyToRevoke(key)
      setRevokeDialogOpen(true)
    }
  }

  const handleRevokeConfirm = async () => {
    if (!keyToRevoke) return
    setIsRevoking(true)
    await onRevokeKey(keyToRevoke.id)
    setIsRevoking(false)
    setRevokeDialogOpen(false)
    setKeyToRevoke(null)
  }

  const activeKeys = apiKeys.filter((k) => k.status === 'ACTIVE')
  const inactiveKeys = apiKeys.filter((k) => k.status !== 'ACTIVE')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {activeKeys.length} active key{activeKeys.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Key
        </Button>
      </div>

      {apiKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border-default rounded-lg">
          <div className="rounded-full bg-background-tertiary p-4 mb-4">
            <Key className="h-8 w-8 text-text-tertiary" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-1">No API keys yet</h3>
          <p className="text-sm text-text-secondary mb-4">
            Create an API key to start using BotEsq with your AI agents.
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Key
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {activeKeys.length > 0 && (
            <div className="space-y-3">
              {activeKeys.map((apiKey) => (
                <ApiKeyRow key={apiKey.id} apiKey={apiKey} onRevoke={handleRevokeClick} />
              ))}
            </div>
          )}

          {inactiveKeys.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-text-secondary">Inactive Keys</h3>
              {inactiveKeys.map((apiKey) => (
                <ApiKeyRow key={apiKey.id} apiKey={apiKey} onRevoke={handleRevokeClick} />
              ))}
            </div>
          )}
        </div>
      )}

      <CreateApiKeyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={onCreateKey}
      />

      <RevokeApiKeyDialog
        open={revokeDialogOpen}
        onOpenChange={setRevokeDialogOpen}
        keyName={keyToRevoke?.name}
        keyPrefix={keyToRevoke?.keyPrefix || ''}
        onConfirm={handleRevokeConfirm}
        isRevoking={isRevoking}
      />
    </div>
  )
}
