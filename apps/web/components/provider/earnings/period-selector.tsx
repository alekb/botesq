'use client'

import { cn } from '@/lib/utils/cn'

type Period = 'day' | 'week' | 'month' | 'year'

interface PeriodSelectorProps {
  value: Period
  onChange: (period: Period) => void
}

const periods: { value: Period; label: string }[] = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
]

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="inline-flex rounded-lg bg-background-secondary p-1">
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            value === period.value
              ? 'bg-primary-500 text-white'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  )
}
