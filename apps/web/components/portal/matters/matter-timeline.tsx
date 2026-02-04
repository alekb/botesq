import { Clock, FileText, MessageSquare, User } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatDateTime } from '@/lib/utils/format'

interface TimelineEvent {
  id: string
  type: 'status' | 'document' | 'message' | 'system'
  title: string
  description?: string
  timestamp: Date
  status?: 'success' | 'pending' | 'error'
}

interface MatterTimelineProps {
  events: TimelineEvent[]
}

const eventIcons = {
  status: Clock,
  document: FileText,
  message: MessageSquare,
  system: User,
}

const statusColors = {
  success: 'bg-success-500',
  pending: 'bg-warning-500',
  error: 'bg-error-500',
}

export function MatterTimeline({ events }: MatterTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="h-10 w-10 text-text-tertiary mb-3" />
        <p className="text-text-secondary">No timeline events yet</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border-default" />

      <div className="space-y-6">
        {events.map((event) => {
          const Icon = eventIcons[event.type]
          return (
            <div key={event.id} className="relative flex gap-4 pl-10">
              {/* Icon */}
              <div
                className={cn(
                  'absolute left-0 flex h-8 w-8 items-center justify-center rounded-full',
                  event.status ? statusColors[event.status] : 'bg-background-tertiary'
                )}
              >
                <Icon
                  className={cn('h-4 w-4', event.status ? 'text-white' : 'text-text-secondary')}
                />
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-text-primary">{event.title}</p>
                    {event.description && (
                      <p className="text-sm text-text-secondary mt-0.5">{event.description}</p>
                    )}
                  </div>
                  <time className="text-xs text-text-tertiary whitespace-nowrap">
                    {formatDateTime(event.timestamp)}
                  </time>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
