'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Banknote,
  User,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ExternalLink,
  CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils/cn'
import type { SettlementStatus } from '@botesq/database'

interface SettlementSummary {
  id: string
  providerId: string
  provider: {
    id: string
    name: string
    email: string
    stripeConnectId: string | null
  }
  periodStart: string
  periodEnd: string
  totalRequests: number
  totalCredits: number
  providerShare: number
  platformShare: number
  status: SettlementStatus
  stripeTransferId: string | null
  paidAt: string | null
  createdAt: string
}

interface ConnectStatus {
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
}

interface SettlementDetailProps {
  settlement: SettlementSummary
  connectStatus: ConnectStatus | null
}

const statusConfig: Record<
  SettlementStatus,
  { label: string; color: string; bgColor: string; icon: typeof CheckCircle2 }
> = {
  PENDING: {
    label: 'Pending',
    color: 'text-warning-500',
    bgColor: 'bg-warning-500/10',
    icon: Clock,
  },
  PROCESSING: {
    label: 'Processing',
    color: 'text-primary-500',
    bgColor: 'bg-primary-500/10',
    icon: Loader2,
  },
  PAID: {
    label: 'Paid',
    color: 'text-success-500',
    bgColor: 'bg-success-500/10',
    icon: CheckCircle2,
  },
  FAILED: {
    label: 'Failed',
    color: 'text-error-500',
    bgColor: 'bg-error-500/10',
    icon: XCircle,
  },
}

function formatCreditsToUsd(credits: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(credits / 100)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPeriod(periodStart: string, _periodEnd: string): string {
  const start = new Date(periodStart)
  return start.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

export function SettlementDetail({ settlement, connectStatus }: SettlementDetailProps) {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const config = statusConfig[settlement.status]
  const StatusIcon = config.icon
  const hasNoConnect = !settlement.provider.stripeConnectId
  const canPayouts = connectStatus?.payoutsEnabled ?? false
  const canProcess = settlement.status === 'PENDING' && !hasNoConnect && canPayouts
  const canRetry = settlement.status === 'FAILED'

  async function handleProcess(isRetry = false) {
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/settlements/${settlement.id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retry: isRetry }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process settlement')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/settlements">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Settlement Details</h1>
            <p className="text-text-secondary">
              {formatPeriod(settlement.periodStart, settlement.periodEnd)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={cn('text-sm', config.bgColor, config.color)}>
            <StatusIcon
              className={cn('mr-1 h-4 w-4', settlement.status === 'PROCESSING' && 'animate-spin')}
            />
            {config.label}
          </Badge>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg bg-error-500/10 p-4 text-error-500">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-medium">Error</p>
          </div>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      {/* Warning if no Stripe Connect */}
      {hasNoConnect && settlement.status === 'PENDING' && (
        <div className="rounded-lg bg-warning-500/10 p-4 text-warning-500">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-medium">Stripe Connect Not Configured</p>
          </div>
          <p className="mt-1 text-sm">
            This provider has not set up their Stripe Connect account. They will need to complete
            onboarding before this settlement can be processed.
          </p>
        </div>
      )}

      {/* Warning if payouts not enabled */}
      {!hasNoConnect && !canPayouts && settlement.status === 'PENDING' && (
        <div className="rounded-lg bg-warning-500/10 p-4 text-warning-500">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-medium">Payouts Not Enabled</p>
          </div>
          <p className="mt-1 text-sm">
            The provider&apos;s Stripe Connect account does not have payouts enabled. They may need
            to complete additional verification.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - 2 columns */}
        <div className="space-y-6 lg:col-span-2">
          {/* Provider Info */}
          <Card>
            <CardHeader>
              <CardTitle>Provider Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-500/10">
                  <User className="h-6 w-6 text-primary-500" />
                </div>
                <div>
                  <p className="font-medium text-text-primary">{settlement.provider.name}</p>
                  <div className="flex items-center gap-1 text-sm text-text-secondary">
                    <Mail className="h-3 w-3" />
                    {settlement.provider.email}
                  </div>
                </div>
              </div>

              {/* Stripe Connect Status */}
              {settlement.provider.stripeConnectId && connectStatus && (
                <div className="rounded-lg bg-background-primary p-4">
                  <p className="mb-2 text-sm font-medium text-text-primary">
                    Stripe Connect Status
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="flex items-center gap-2">
                      {connectStatus.detailsSubmitted ? (
                        <CheckCircle2 className="h-4 w-4 text-success-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-text-tertiary" />
                      )}
                      <span className="text-sm text-text-secondary">Details Submitted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {connectStatus.chargesEnabled ? (
                        <CheckCircle2 className="h-4 w-4 text-success-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-text-tertiary" />
                      )}
                      <span className="text-sm text-text-secondary">Charges Enabled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {connectStatus.payoutsEnabled ? (
                        <CheckCircle2 className="h-4 w-4 text-success-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-text-tertiary" />
                      )}
                      <span className="text-sm text-text-secondary">Payouts Enabled</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Earnings Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Earnings Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Total Credits Charged</span>
                  <span className="font-medium text-text-primary">
                    {settlement.totalCredits.toLocaleString()} credits
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Total Requests</span>
                  <span className="font-medium text-text-primary">{settlement.totalRequests}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Provider Share</span>
                  <span className="font-medium text-success-500">
                    {formatCreditsToUsd(settlement.providerShare)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Platform Share</span>
                  <span className="font-medium text-text-primary">
                    {formatCreditsToUsd(settlement.platformShare)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canProcess && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full" disabled={isProcessing}>
                      {isProcessing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Banknote className="mr-2 h-4 w-4" />
                      )}
                      Process Payout
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Process Settlement?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will create a Stripe transfer of{' '}
                        <strong>{formatCreditsToUsd(settlement.providerShare)}</strong> to{' '}
                        <strong>{settlement.provider.name}</strong>. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleProcess(false)}>
                        Confirm Payout
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {canRetry && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full" variant="secondary" disabled={isProcessing}>
                      {isProcessing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Retry Failed Payout
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Retry Settlement?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will attempt to process the settlement again. The previous failure will
                        be logged. Ensure the underlying issue has been resolved before retrying.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleProcess(true)}>
                        Retry Payout
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {settlement.status === 'PAID' && settlement.stripeTransferId && (
                <a
                  href={`https://dashboard.stripe.com/connect/transfers/${settlement.stripeTransferId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="secondary" className="w-full">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View in Stripe
                  </Button>
                </a>
              )}
            </CardContent>
          </Card>

          {/* Timeline / Status Info */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/10">
                  <Calendar className="h-4 w-4 text-primary-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Period</p>
                  <p className="text-sm text-text-secondary">
                    {formatDate(settlement.periodStart)} - {formatDate(settlement.periodEnd)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-text-secondary/10">
                  <Clock className="h-4 w-4 text-text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Created</p>
                  <p className="text-sm text-text-secondary">
                    {formatDateTime(settlement.createdAt)}
                  </p>
                </div>
              </div>

              {settlement.paidAt && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-500/10">
                    <CheckCircle2 className="h-4 w-4 text-success-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Paid</p>
                    <p className="text-sm text-text-secondary">
                      {formatDateTime(settlement.paidAt)}
                    </p>
                  </div>
                </div>
              )}

              {settlement.stripeTransferId && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/10">
                    <CreditCard className="h-4 w-4 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Transfer ID</p>
                    <p className="truncate text-sm font-mono text-text-secondary">
                      {settlement.stripeTransferId}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
