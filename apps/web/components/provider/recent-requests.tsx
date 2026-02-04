'use client'

import Link from 'next/link'
import { ArrowRight, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelativeTime } from '@/lib/utils/format'
import { SERVICE_TYPE_LABELS, REQUEST_STATUS_LABELS } from '@/types/provider'
import type { ProviderRequest } from '@/types/provider'

interface RecentRequestsProps {
  requests?: ProviderRequest[]
  isLoading?: boolean
}

function getStatusIcon(status: ProviderRequest['status']) {
  switch (status) {
    case 'PENDING':
    case 'SENT_TO_PROVIDER':
      return <Clock className="h-4 w-4" />
    case 'IN_PROGRESS':
      return <Clock className="h-4 w-4 animate-pulse" />
    case 'COMPLETED':
      return <CheckCircle className="h-4 w-4" />
    case 'FAILED':
    case 'CANCELLED':
      return <AlertCircle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

function getStatusVariant(
  status: ProviderRequest['status']
): 'default' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'COMPLETED':
      return 'success'
    case 'IN_PROGRESS':
      return 'warning'
    case 'FAILED':
    case 'CANCELLED':
      return 'error'
    default:
      return 'default'
  }
}

function getSlaColor(deadline: string | undefined): string {
  if (!deadline) return 'text-text-secondary'

  const now = new Date()
  const sla = new Date(deadline)
  const hoursRemaining = (sla.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursRemaining < 0) return 'text-error-500' // Overdue
  if (hoursRemaining < 1) return 'text-error-500' // < 1 hour
  if (hoursRemaining < 4) return 'text-warning-500' // 1-4 hours
  return 'text-success-500' // > 4 hours
}

export function RecentRequests({ requests, isLoading }: RecentRequestsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-background-secondary">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!requests || requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-text-secondary">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No recent requests</p>
            <p className="text-sm">New work will appear here</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Requests</CardTitle>
        <Link href="/provider/requests">
          <Button variant="ghost" size="sm" className="gap-1">
            View all
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {requests.slice(0, 5).map((request) => (
          <Link
            key={request.id}
            href={`/provider/requests/${request.id}`}
            className="flex items-center gap-4 p-3 rounded-lg bg-background-secondary hover:bg-background-secondary/80 transition-colors"
          >
            <div className="flex-shrink-0">{getStatusIcon(request.status)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {SERVICE_TYPE_LABELS[request.serviceType]}
              </p>
              <p className="text-xs text-text-secondary">
                {formatRelativeTime(new Date(request.createdAt))}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {request.slaDeadline && (
                <span className={`text-xs ${getSlaColor(request.slaDeadline)}`}>
                  SLA: {formatRelativeTime(new Date(request.slaDeadline))}
                </span>
              )}
              <Badge variant={getStatusVariant(request.status)}>
                {REQUEST_STATUS_LABELS[request.status]}
              </Badge>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
