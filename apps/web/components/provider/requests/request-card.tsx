'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SlaIndicator } from './sla-indicator'
import { formatRelativeTime, formatCredits } from '@/lib/utils/format'
import { SERVICE_TYPE_LABELS, REQUEST_STATUS_LABELS } from '@/types/provider'
import type { ProviderRequest } from '@/types/provider'

interface RequestCardProps {
  request: ProviderRequest
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

export function RequestCard({ request }: RequestCardProps) {
  const isPending = request.status === 'PENDING' || request.status === 'SENT_TO_PROVIDER'

  return (
    <Card className="p-4 hover:border-primary-500/50 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium">{SERVICE_TYPE_LABELS[request.serviceType]}</h3>
            <Badge variant={getStatusVariant(request.status)}>
              {REQUEST_STATUS_LABELS[request.status]}
            </Badge>
          </div>
          <p className="text-sm text-text-secondary">
            ID: {request.externalId} · {formatRelativeTime(new Date(request.createdAt))}
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-text-secondary">
              Earnings:{' '}
              <span className="text-success-500">{formatCredits(request.providerEarnings)}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isPending && <SlaIndicator deadline={request.slaDeadline} />}
          <Link href={`/provider/requests/${request.id}`}>
            <Button variant={isPending ? 'primary' : 'outline'} size="sm" className="gap-1">
              {isPending ? 'Review' : 'View'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}
