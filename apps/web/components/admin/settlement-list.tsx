'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search,
  Banknote,
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface SettlementStats {
  totalPending: number
  totalPendingAmount: number
  totalPaid: number
  totalPaidAmount: number
  totalFailed: number
}

interface SettlementListProps {
  settlements: SettlementSummary[]
  stats: SettlementStats
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const statusConfig: Record<
  SettlementStatus,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  PENDING: { label: 'Pending', color: 'bg-warning-500/10 text-warning-500', icon: Clock },
  PROCESSING: { label: 'Processing', color: 'bg-primary-500/10 text-primary-500', icon: Loader2 },
  PAID: { label: 'Paid', color: 'bg-success-500/10 text-success-500', icon: CheckCircle2 },
  FAILED: { label: 'Failed', color: 'bg-error-500/10 text-error-500', icon: XCircle },
}

function formatCreditsToUsd(credits: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(credits / 100)
}

function formatPeriod(periodStart: string, _periodEnd: string): string {
  const start = new Date(periodStart)
  return start.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

// Generate month options for the last 12 months
function getMonthOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = []
  const now = new Date()

  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    options.push({
      value: `${year}-${month}`,
      label: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
    })
  }

  return options
}

export function SettlementList({ settlements, stats, pagination }: SettlementListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateMonth, setGenerateMonth] = useState<string>('')
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [generateResult, setGenerateResult] = useState<{
    generated: number
    skipped: number
    errors: Array<{ providerId: string; error: string }>
  } | null>(null)

  const monthOptions = getMonthOptions()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (search) {
      params.set('search', search)
    } else {
      params.delete('search')
    }
    params.set('page', '1')
    router.push(`/admin/settlements?${params.toString()}`)
  }

  function handleStatusFilter(status: string) {
    const params = new URLSearchParams(searchParams)
    if (status && status !== 'all') {
      params.set('status', status)
    } else {
      params.delete('status')
    }
    params.set('page', '1')
    router.push(`/admin/settlements?${params.toString()}`)
  }

  function handlePeriodFilter(period: string) {
    const params = new URLSearchParams(searchParams)
    if (period && period !== 'all') {
      const [year, month] = period.split('-')
      if (year && month) {
        params.set('year', year)
        params.set('month', month)
      }
    } else {
      params.delete('year')
      params.delete('month')
    }
    params.set('page', '1')
    router.push(`/admin/settlements?${params.toString()}`)
  }

  async function handleGenerate() {
    if (!generateMonth) return

    setIsGenerating(true)
    setGenerateResult(null)

    try {
      const parts = generateMonth.split('-')
      const year = parts[0] ?? ''
      const month = parts[1] ?? ''
      const response = await fetch('/api/admin/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: parseInt(year, 10), month: parseInt(month, 10) }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate settlements')
      }

      setGenerateResult(data)
      router.refresh()
    } catch (error) {
      setGenerateResult({
        generated: 0,
        skipped: 0,
        errors: [
          {
            providerId: 'unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const currentPeriod =
    searchParams.get('year') && searchParams.get('month')
      ? `${searchParams.get('year')}-${searchParams.get('month')}`
      : 'all'

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-500/10">
                <Clock className="h-5 w-5 text-warning-500" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Pending</p>
                <p className="text-lg font-bold text-text-primary">
                  {formatCreditsToUsd(stats.totalPendingAmount)}
                </p>
                <p className="text-xs text-text-tertiary">{stats.totalPending} settlements</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-500/10">
                <CheckCircle2 className="h-5 w-5 text-success-500" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Paid</p>
                <p className="text-lg font-bold text-text-primary">
                  {formatCreditsToUsd(stats.totalPaidAmount)}
                </p>
                <p className="text-xs text-text-tertiary">{stats.totalPaid} settlements</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-error-500/10">
                <XCircle className="h-5 w-5 text-error-500" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Failed</p>
                <p className="text-lg font-bold text-text-primary">{stats.totalFailed}</p>
                <p className="text-xs text-text-tertiary">needs attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Generate Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input
              placeholder="Search by provider name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <div className="flex gap-2">
          <Select value={currentPeriod} onValueChange={handlePeriodFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Periods</SelectItem>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={searchParams.get('status') ?? 'all'} onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PROCESSING">Processing</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Calendar className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Monthly Settlements</DialogTitle>
                <DialogDescription>
                  Generate settlements for all providers with completed requests in the selected
                  month. Providers who already have settlements for this period will be skipped.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <label className="text-sm font-medium text-text-primary">Select Month</label>
                <Select value={generateMonth} onValueChange={setGenerateMonth}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Choose a month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {generateResult && (
                <div
                  className={cn(
                    'rounded-lg p-3 text-sm',
                    generateResult.errors.length > 0
                      ? 'bg-error-500/10 text-error-500'
                      : 'bg-success-500/10 text-success-500'
                  )}
                >
                  <p>Generated: {generateResult.generated}</p>
                  <p>Skipped (already exists): {generateResult.skipped}</p>
                  {generateResult.errors.length > 0 && (
                    <p>Errors: {generateResult.errors.length}</p>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setGenerateDialogOpen(false)
                    setGenerateResult(null)
                    setGenerateMonth('')
                  }}
                >
                  Close
                </Button>
                <Button onClick={handleGenerate} disabled={!generateMonth || isGenerating}>
                  {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Settlements
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Settlement List */}
      <div className="space-y-2">
        {settlements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Banknote className="h-12 w-12 text-text-tertiary" />
              <p className="mt-4 text-text-secondary">No settlements found</p>
            </CardContent>
          </Card>
        ) : (
          settlements.map((settlement) => {
            const config = statusConfig[settlement.status]
            const StatusIcon = config.icon
            const hasNoConnect = !settlement.provider.stripeConnectId

            return (
              <Link key={settlement.id} href={`/admin/settlements/${settlement.id}`}>
                <Card className="transition-colors hover:bg-background-secondary">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10">
                      <Banknote className="h-5 w-5 text-primary-500" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-text-primary">
                          {settlement.provider.name}
                        </p>
                        <Badge className={cn('text-xs', config.color)}>
                          <StatusIcon
                            className={cn(
                              'mr-1 h-3 w-3',
                              settlement.status === 'PROCESSING' && 'animate-spin'
                            )}
                          />
                          {config.label}
                        </Badge>
                        {hasNoConnect && settlement.status === 'PENDING' && (
                          <span className="text-warning-500" title="Provider has no Stripe Connect">
                            <AlertCircle className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary">
                        {formatPeriod(settlement.periodStart, settlement.periodEnd)} &middot;{' '}
                        {settlement.totalRequests} requests
                      </p>
                    </div>

                    <div className="hidden items-center gap-6 sm:flex">
                      <div className="text-right">
                        <p className="text-sm font-medium text-text-primary">
                          {formatCreditsToUsd(settlement.providerShare)}
                        </p>
                        <p className="text-xs text-text-secondary">Provider Share</p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-medium text-text-primary">
                          {formatCreditsToUsd(settlement.platformShare)}
                        </p>
                        <p className="text-xs text-text-secondary">Platform</p>
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-text-tertiary" />
                  </CardContent>
                </Card>
              </Link>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams)
                params.set('page', String(pagination.page - 1))
                router.push(`/admin/settlements?${params.toString()}`)
              }}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams)
                params.set('page', String(pagination.page + 1))
                router.push(`/admin/settlements?${params.toString()}`)
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
