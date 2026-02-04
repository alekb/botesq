'use client'

import { Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SlaIndicatorProps {
  deadline?: string
  showLabel?: boolean
  className?: string
}

function getSlaStatus(deadline: string | undefined): {
  color: string
  bgColor: string
  icon: typeof Clock
  label: string
  timeText: string
} {
  if (!deadline) {
    return {
      color: 'text-text-secondary',
      bgColor: 'bg-background-secondary',
      icon: Clock,
      label: 'No SLA',
      timeText: '--',
    }
  }

  const now = new Date()
  const sla = new Date(deadline)
  const diffMs = sla.getTime() - now.getTime()
  const hoursRemaining = diffMs / (1000 * 60 * 60)
  const minsRemaining = diffMs / (1000 * 60)

  if (hoursRemaining < 0) {
    const overdueHours = Math.abs(Math.floor(hoursRemaining))
    return {
      color: 'text-error-500',
      bgColor: 'bg-error-500/10',
      icon: AlertTriangle,
      label: 'Overdue',
      timeText:
        overdueHours > 1
          ? `${overdueHours}h overdue`
          : `${Math.abs(Math.floor(minsRemaining))}m overdue`,
    }
  }

  if (hoursRemaining < 1) {
    return {
      color: 'text-error-500',
      bgColor: 'bg-error-500/10',
      icon: AlertTriangle,
      label: 'Urgent',
      timeText: `${Math.floor(minsRemaining)}m left`,
    }
  }

  if (hoursRemaining < 4) {
    return {
      color: 'text-warning-500',
      bgColor: 'bg-warning-500/10',
      icon: Clock,
      label: 'Soon',
      timeText: `${Math.floor(hoursRemaining)}h ${Math.floor(minsRemaining % 60)}m left`,
    }
  }

  return {
    color: 'text-success-500',
    bgColor: 'bg-success-500/10',
    icon: CheckCircle,
    label: 'On track',
    timeText:
      hoursRemaining < 24
        ? `${Math.floor(hoursRemaining)}h left`
        : `${Math.floor(hoursRemaining / 24)}d left`,
  }
}

export function SlaIndicator({ deadline, showLabel = false, className }: SlaIndicatorProps) {
  const status = getSlaStatus(deadline)
  const Icon = status.icon

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded-md text-sm',
        status.bgColor,
        className
      )}
    >
      <Icon className={cn('h-4 w-4', status.color)} />
      <span className={status.color}>
        {showLabel ? `${status.label}: ` : ''}
        {status.timeText}
      </span>
    </div>
  )
}
