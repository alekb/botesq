'use client'

import { Clock, CheckCircle, AlertTriangle, Star } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { ProviderStats, PendingRequestCounts } from '@/types/provider'

interface QuickStatsProps {
  stats?: ProviderStats
  pendingCounts?: PendingRequestCounts
  isLoading?: boolean
}

export function QuickStats({ stats, pendingCounts, isLoading }: QuickStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </Card>
        ))}
      </div>
    )
  }

  const statCards = [
    {
      label: 'Pending Requests',
      value: pendingCounts?.total ?? 0,
      icon: Clock,
      color: 'text-primary-500',
      bgColor: 'bg-primary-500/10',
    },
    {
      label: 'Urgent',
      value: pendingCounts?.urgent ?? 0,
      icon: AlertTriangle,
      color: pendingCounts?.urgent ? 'text-warning-500' : 'text-text-secondary',
      bgColor: pendingCounts?.urgent ? 'bg-warning-500/10' : 'bg-background-secondary',
    },
    {
      label: 'Completion Rate',
      value: stats ? `${Math.round(stats.completionRate * 100)}%` : '0%',
      icon: CheckCircle,
      color: 'text-success-500',
      bgColor: 'bg-success-500/10',
    },
    {
      label: 'Quality Score',
      value: stats ? Math.round(stats.qualityScore) : 0,
      icon: Star,
      color: 'text-warning-500',
      bgColor: 'bg-warning-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.label} className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-text-secondary">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
