'use client'

import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatCredits } from '@/lib/utils/format'
import type { EarningsSummary as EarningsSummaryType } from '@/types/provider'

interface EarningsSummaryProps {
  summary?: EarningsSummaryType
  isLoading?: boolean
}

export function EarningsSummary({ summary, isLoading }: EarningsSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-20" />
          </Card>
        ))}
      </div>
    )
  }

  const stats = [
    {
      label: 'Period Earnings',
      value: summary ? formatCredits(summary.periodAmount) : '--',
      icon: TrendingUp,
      color: 'text-primary-500',
      bgColor: 'bg-primary-500/10',
    },
    {
      label: 'Requests Completed',
      value: summary?.periodRequests ?? 0,
      icon: CheckCircle,
      color: 'text-success-500',
      bgColor: 'bg-success-500/10',
    },
    {
      label: 'Pending Payout',
      value: summary ? formatCurrency(summary.pendingPayout / 100) : '--',
      icon: Clock,
      color: 'text-warning-500',
      bgColor: 'bg-warning-500/10',
    },
    {
      label: 'Total Paid Out',
      value: summary ? formatCurrency(summary.totalPaid / 100) : '--',
      icon: DollarSign,
      color: 'text-success-500',
      bgColor: 'bg-success-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-text-secondary">{stat.label}</p>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
