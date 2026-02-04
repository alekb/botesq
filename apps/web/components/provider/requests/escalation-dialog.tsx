'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'

interface EscalationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string, notes?: string) => Promise<void>
  isSubmitting?: boolean
}

const ESCALATION_REASONS = [
  { value: 'OUT_OF_SCOPE', label: 'Outside my area of expertise' },
  { value: 'CONFLICT_OF_INTEREST', label: 'Potential conflict of interest' },
  { value: 'INSUFFICIENT_INFORMATION', label: 'Insufficient information provided' },
  { value: 'COMPLEX_ISSUE', label: 'Issue is too complex' },
  { value: 'TIME_CONSTRAINTS', label: 'Cannot complete within SLA' },
  { value: 'OTHER', label: 'Other reason' },
]

export function EscalationDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: EscalationDialogProps) {
  const [reason, setReason] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!reason) {
      setError('Please select a reason')
      return
    }

    setError(null)
    try {
      await onConfirm(reason, notes || undefined)
      onOpenChange(false)
      setReason('')
      setNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to escalate')
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false)
      setReason('')
      setNotes('')
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escalate Request</DialogTitle>
          <DialogDescription>
            Escalating will return this request to the queue for another provider or internal
            review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for escalation</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {ESCALATION_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional notes (optional)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background-secondary border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[80px]"
              placeholder="Provide any additional context..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} isLoading={isSubmitting}>
            Confirm Escalation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
