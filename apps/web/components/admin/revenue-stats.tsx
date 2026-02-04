'use client'

import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'

interface RevenueStatsProps {
  creditsThisMonth: number
  creditsTrend: number
}

export function RevenueStats({ creditsThisMonth, creditsTrend }: RevenueStatsProps) {
  const isPositive = creditsTrend >= 0
  const TrendIcon = isPositive ? TrendingUp : TrendingDown

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-5 w-5 text-success-500" />
          Revenue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-2xl font-bold text-text-primary">
            {creditsThisMonth.toLocaleString()}
          </p>
          <p className="text-sm text-text-secondary">Credits purchased this month</p>
        </div>

        {creditsTrend !== 0 && (
          <div className="flex items-center gap-2">
            <TrendIcon
              className={cn('h-4 w-4', isPositive ? 'text-success-500' : 'text-error-500')}
            />
            <span
              className={cn(
                'text-sm font-medium',
                isPositive ? 'text-success-500' : 'text-error-500'
              )}
            >
              {isPositive ? '+' : ''}
              {creditsTrend}% vs last month
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
