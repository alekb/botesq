'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

interface RevokeApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  keyName?: string | null
  keyPrefix: string
  onConfirm: () => Promise<void>
  isRevoking: boolean
}

export function RevokeApiKeyDialog({
  open,
  onOpenChange,
  keyName,
  keyPrefix,
  onConfirm,
  isRevoking,
}: RevokeApiKeyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Revoke API Key</DialogTitle>
          <DialogDescription>
            Are you sure you want to revoke this API key? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="error" className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">This will immediately disable the key</p>
              <p className="text-sm mt-1">
                Any AI agents using this key will no longer be able to authenticate.
              </p>
            </div>
          </Alert>

          <div className="bg-background-tertiary rounded-lg p-4">
            <p className="text-sm text-text-secondary">Key to revoke:</p>
            <p className="font-medium text-text-primary">{keyName || 'Unnamed Key'}</p>
            <code className="text-xs font-mono text-text-tertiary">{keyPrefix}...</code>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isRevoking}>
            Revoke Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
