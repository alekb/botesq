import { Briefcase, FileText, MessageSquare, CreditCard, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/utils/format'

interface Activity {
  id: string
  type: 'matter' | 'document' | 'consultation' | 'payment'
  title: string
  description: string
  timestamp: Date
  status?: 'success' | 'pending' | 'error'
}

interface RecentActivityProps {
  activities: Activity[]
}

const activityIcons = {
  matter: Briefcase,
  document: FileText,
  consultation: MessageSquare,
  payment: CreditCard,
}

const statusVariants = {
  success: 'success',
  pending: 'warning',
  error: 'error',
} as const

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-10 w-10 text-text-tertiary mb-3" />
            <p className="text-text-secondary">No recent activity</p>
            <p className="text-sm text-text-tertiary">
              Your activity will appear here once you start using BotEsq
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activityIcons[activity.type]
            return (
              <div key={activity.id} className="flex items-start gap-4">
                <div className="rounded-lg bg-background-tertiary p-2">
                  <Icon className="h-4 w-4 text-text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {activity.title}
                    </p>
                    {activity.status && (
                      <Badge variant={statusVariants[activity.status]} className="flex-shrink-0">
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary truncate">{activity.description}</p>
                  <p className="text-xs text-text-tertiary mt-1">
                    {formatRelativeTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
