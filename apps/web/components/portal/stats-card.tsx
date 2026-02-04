import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Card, CardContent } from '@/components/ui/card'

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatsCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-text-secondary">{title}</p>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
            {description && <p className="text-xs text-text-tertiary">{description}</p>}
            {trend && (
              <p
                className={cn(
                  'text-xs font-medium',
                  trend.isPositive ? 'text-success-500' : 'text-error-500'
                )}
              >
                {trend.isPositive ? '+' : '-'}
                {Math.abs(trend.value)}% from last month
              </p>
            )}
          </div>
          <div className="rounded-lg bg-primary-500/10 p-3">
            <Icon className="h-5 w-5 text-primary-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
