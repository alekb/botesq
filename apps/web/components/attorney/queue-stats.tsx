import { ListTodo, AlertTriangle, Clock, User } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface QueueStatsProps {
  stats: {
    total: number
    urgent: number
    standard: number
    myItems: number
  }
}

export function QueueStats({ stats }: QueueStatsProps) {
  const items = [
    {
      label: 'Total Queue',
      value: stats.total,
      icon: ListTodo,
      color: 'text-primary-500',
      bgColor: 'bg-primary-500/10',
    },
    {
      label: 'Urgent',
      value: stats.urgent,
      icon: AlertTriangle,
      color: stats.urgent > 0 ? 'text-error-500' : 'text-text-secondary',
      bgColor: stats.urgent > 0 ? 'bg-error-500/10' : 'bg-background-primary',
    },
    {
      label: 'Standard',
      value: stats.standard,
      icon: Clock,
      color: 'text-text-secondary',
      bgColor: 'bg-background-primary',
    },
    {
      label: 'My Items',
      value: stats.myItems,
      icon: User,
      color: stats.myItems > 0 ? 'text-success-500' : 'text-text-secondary',
      bgColor: stats.myItems > 0 ? 'bg-success-500/10' : 'bg-background-primary',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="flex items-center gap-4 p-4">
          <div className={`rounded-lg p-2 ${item.bgColor}`}>
            <item.icon className={`h-5 w-5 ${item.color}`} />
          </div>
          <div>
            <p className="text-sm text-text-secondary">{item.label}</p>
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}
