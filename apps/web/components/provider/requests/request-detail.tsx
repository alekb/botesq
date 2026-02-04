'use client'

import { Clock, User, FileText, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SlaIndicator } from './sla-indicator'
import { formatDateTime, formatCredits } from '@/lib/utils/format'
import { SERVICE_TYPE_LABELS, REQUEST_STATUS_LABELS } from '@/types/provider'
import type { ProviderRequest } from '@/types/provider'

interface RequestDetailProps {
  request?: ProviderRequest
  isLoading?: boolean
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

function getPayloadString(payload: Record<string, unknown>, key: string): string | null {
  if (key in payload && payload[key] != null) {
    return String(payload[key])
  }
  return null
}

export function RequestDetail({ request, isLoading }: RequestDetailProps) {
  if (isLoading || !request) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  const payload = request.requestPayload as Record<string, unknown>

  return (
    <div className="space-y-4">
      {/* Header info */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                {SERVICE_TYPE_LABELS[request.serviceType]}
                <Badge variant={getStatusVariant(request.status)}>
                  {REQUEST_STATUS_LABELS[request.status]}
                </Badge>
              </CardTitle>
              <p className="text-sm text-text-secondary">Request ID: {request.externalId}</p>
            </div>
            <SlaIndicator deadline={request.slaDeadline} showLabel />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-text-secondary" />
              <div>
                <p className="text-xs text-text-secondary">Created</p>
                <p className="text-sm">{formatDateTime(new Date(request.createdAt))}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-text-secondary" />
              <div>
                <p className="text-xs text-text-secondary">Your Earnings</p>
                <p className="text-sm text-success-500 font-medium">
                  {formatCredits(request.providerEarnings)}
                </p>
              </div>
            </div>
            {request.matterId && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-xs text-text-secondary">Matter</p>
                  <p className="text-sm">{request.matterId}</p>
                </div>
              </div>
            )}
            {request.routingReason && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-xs text-text-secondary">Routing</p>
                  <p className="text-sm">{request.routingReason}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Request content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getPayloadString(payload, 'question') && (
              <div>
                <p className="text-sm font-medium text-text-secondary mb-1">Question</p>
                <p className="whitespace-pre-wrap">{getPayloadString(payload, 'question')}</p>
              </div>
            )}
            {getPayloadString(payload, 'context') && (
              <div>
                <p className="text-sm font-medium text-text-secondary mb-1">Context</p>
                <p className="whitespace-pre-wrap text-sm">
                  {getPayloadString(payload, 'context')}
                </p>
              </div>
            )}
            {getPayloadString(payload, 'jurisdiction') && (
              <div>
                <p className="text-sm font-medium text-text-secondary mb-1">Jurisdiction</p>
                <p className="text-sm">{getPayloadString(payload, 'jurisdiction')}</p>
              </div>
            )}
            {/* Show other payload fields */}
            {Object.entries(payload)
              .filter(([key]) => !['question', 'context', 'jurisdiction'].includes(key))
              .map(([key, value]) => (
                <div key={key}>
                  <p className="text-sm font-medium text-text-secondary mb-1">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                  </p>
                  <pre className="text-sm bg-background-secondary p-2 rounded overflow-x-auto">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </pre>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Response (if completed) */}
      {request.responsePayload && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-background-secondary p-3 rounded overflow-x-auto">
              {JSON.stringify(request.responsePayload, null, 2)}
            </pre>
            {request.responseAt && (
              <p className="text-xs text-text-secondary mt-2">
                Submitted: {formatDateTime(new Date(request.responseAt))}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
