'use client'

import { useState } from 'react'
import { Key, Copy, Trash2, Check, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDate, formatRelativeTime } from '@/lib/utils/format'
import type { ApiKeyStatus } from '@botesq/database'

interface ApiKeyRowProps {
  apiKey: {
    id: string
    keyPrefix: string
    name?: string | null
    status: ApiKeyStatus
    createdAt: Date
    lastUsedAt?: Date | null
    expiresAt?: Date | null
  }
  onRevoke: (id: string) => void
}

const statusConfig: Record<
  ApiKeyStatus,
  { label: string; variant: 'success' | 'error' | 'warning' }
> = {
  ACTIVE: { label: 'Active', variant: 'success' },
  REVOKED: { label: 'Revoked', variant: 'error' },
  EXPIRED: { label: 'Expired', variant: 'warning' },
}

export function ApiKeyRow({ apiKey, onRevoke }: ApiKeyRowProps) {
  const [copied, setCopied] = useState(false)
  const config = statusConfig[apiKey.status]

  const handleCopyPrefix = async () => {
    await navigator.clipboard.writeText(apiKey.keyPrefix)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border-default hover:border-border-hover transition-colors">
      <div className="flex items-center gap-4 min-w-0">
        <div className="rounded-lg bg-background-tertiary p-2.5 flex-shrink-0">
          <Key className="h-5 w-5 text-primary-500" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-text-primary truncate">{apiKey.name || 'Unnamed Key'}</p>
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-text-secondary bg-background-tertiary px-2 py-0.5 rounded">
              {apiKey.keyPrefix}...
            </code>
            <button
              onClick={handleCopyPrefix}
              className="text-text-tertiary hover:text-text-primary transition-colors"
              title="Copy key prefix"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-text-tertiary">
            <span>Created {formatDate(apiKey.createdAt)}</span>
            {apiKey.lastUsedAt && <span>Last used {formatRelativeTime(apiKey.lastUsedAt)}</span>}
            {apiKey.expiresAt && <span>Expires {formatDate(apiKey.expiresAt)}</span>}
          </div>
        </div>
      </div>
      <div className="flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onRevoke(apiKey.id)}
              disabled={apiKey.status !== 'ACTIVE'}
              className="text-error-500 focus:text-error-500"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Revoke Key
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
