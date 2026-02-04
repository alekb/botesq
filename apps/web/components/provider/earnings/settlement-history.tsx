'use client'

import { DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { SETTLEMENT_STATUS_LABELS } from '@/types/provider'
import type { ProviderSettlement } from '@/types/provider'

interface SettlementHistoryProps {
  settlements: ProviderSettlement[]
  isLoading?: boolean
}

function getStatusVariant(
  status: ProviderSettlement['status']
): 'default' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'PAID':
      return 'success'
    case 'PROCESSING':
      return 'warning'
    case 'FAILED':
      return 'error'
    default:
      return 'default'
  }
}

export function SettlementHistory({ settlements, isLoading }: SettlementHistoryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Settlement History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 rounded-lg bg-background-secondary"
              >
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (settlements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Settlement History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-text-secondary">
            <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No settlements yet</p>
            <p className="text-sm">Settlements are processed weekly</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settlement History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-default">
                <th className="text-left py-3 px-2 text-sm font-medium text-text-secondary">
                  Period
                </th>
                <th className="text-left py-3 px-2 text-sm font-medium text-text-secondary">
                  Requests
                </th>
                <th className="text-right py-3 px-2 text-sm font-medium text-text-secondary">
                  Your Share
                </th>
                <th className="text-right py-3 px-2 text-sm font-medium text-text-secondary">
                  Platform
                </th>
                <th className="text-center py-3 px-2 text-sm font-medium text-text-secondary">
                  Status
                </th>
                <th className="text-left py-3 px-2 text-sm font-medium text-text-secondary">
                  Paid
                </th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((settlement) => (
                <tr key={settlement.id} className="border-b border-border-default last:border-0">
                  <td className="py-3 px-2">
                    <p className="text-sm font-medium">
                      {formatDate(new Date(settlement.periodStart))} -{' '}
                      {formatDate(new Date(settlement.periodEnd))}
                    </p>
                  </td>
                  <td className="py-3 px-2 text-sm">{settlement.totalRequests}</td>
                  <td className="py-3 px-2 text-right text-sm font-medium text-success-500">
                    {formatCurrency(settlement.providerShare / 100)}
                  </td>
                  <td className="py-3 px-2 text-right text-sm text-text-secondary">
                    {formatCurrency(settlement.platformShare / 100)}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <Badge variant={getStatusVariant(settlement.status)}>
                      {SETTLEMENT_STATUS_LABELS[settlement.status]}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 text-sm text-text-secondary">
                    {settlement.paidAt ? formatDate(new Date(settlement.paidAt)) : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
