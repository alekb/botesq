'use client'

import Link from 'next/link'
import { Clock, User, FileText, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface QueueItem {
  id: string
  externalId: string
  question: string
  context: string | null
  complexity: string
  status: string
  aiDraft: string | null
  aiConfidence: number | null
  slaDeadline: Date | null
  createdAt: Date
  matter: {
    id: string
    externalId: string
    type: string
  } | null
  attorney: {
    id: string
    firstName: string
    lastName: string
  } | null
}

interface QueueListProps {
  items: QueueItem[]
}

function getStatusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'warning' | 'success' | 'error' {
  switch (status) {
    case 'QUEUED':
      return 'secondary'
    case 'AI_PROCESSING':
      return 'warning'
    case 'IN_REVIEW':
      return 'default'
    case 'COMPLETED':
      return 'success'
    default:
      return 'secondary'
  }
}

function getComplexityBadgeVariant(
  complexity: string
): 'default' | 'secondary' | 'warning' | 'success' | 'error' {
  switch (complexity) {
    case 'URGENT':
      return 'error'
    case 'STANDARD':
      return 'secondary'
    default:
      return 'secondary'
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) return `${diffDays}d ago`
  if (diffHours > 0) return `${diffHours}h ago`
  if (diffMins > 0) return `${diffMins}m ago`
  return 'Just now'
}

function isOverdue(deadline: Date | null): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

export function QueueList({ items }: QueueListProps) {
  if (items.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-text-secondary">No items in the queue matching your filters.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} className="p-4 transition-colors hover:bg-background-secondary">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              {/* Header with badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={getStatusBadgeVariant(item.status)}>
                  {item.status.replace('_', ' ')}
                </Badge>
                <Badge variant={getComplexityBadgeVariant(item.complexity)}>
                  {item.complexity}
                </Badge>
                {isOverdue(item.slaDeadline) && (
                  <Badge variant="error" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Overdue
                  </Badge>
                )}
                {item.aiDraft && item.aiConfidence && (
                  <Badge variant="secondary">
                    AI Draft ({Math.round(item.aiConfidence * 100)}% confidence)
                  </Badge>
                )}
              </div>

              {/* Question */}
              <p className="line-clamp-2 text-sm font-medium text-text-primary">{item.question}</p>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTimeAgo(item.createdAt)}
                </span>

                {item.matter && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {item.matter.externalId}
                  </span>
                )}

                {item.attorney && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {item.attorney.firstName} {item.attorney.lastName}
                  </span>
                )}

                {item.slaDeadline && (
                  <span
                    className={`flex items-center gap-1 ${
                      isOverdue(item.slaDeadline) ? 'text-error-500' : ''
                    }`}
                  >
                    Due: {new Date(item.slaDeadline).toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 sm:flex-shrink-0">
              <Button asChild size="sm" variant="outline">
                <Link href={`/attorney/queue/${item.id}`}>View</Link>
              </Button>
              {item.status === 'QUEUED' && (
                <Button asChild size="sm">
                  <Link href={`/attorney/queue/${item.id}?action=claim`}>Claim</Link>
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
