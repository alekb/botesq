import { Suspense } from 'react'
import { prisma } from '@botesq/database'
import { getCurrentAttorneySession } from '@/lib/attorney-auth/session'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ListTodo, Clock, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

async function getAttorneyStats(attorneyId: string) {
  const [pendingConsultations, completedToday, completedThisWeek, overdueCount] = await Promise.all(
    [
      // Pending consultations (QUEUED or IN_REVIEW)
      prisma.consultation.count({
        where: {
          OR: [{ status: 'QUEUED' }, { status: 'IN_REVIEW', attorneyId }],
        },
      }),
      // Completed today
      prisma.consultation.count({
        where: {
          attorneyId,
          status: 'COMPLETED',
          completedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      // Completed this week
      prisma.consultation.count({
        where: {
          attorneyId,
          status: 'COMPLETED',
          completedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      // Overdue (past SLA deadline)
      prisma.consultation.count({
        where: {
          status: { in: ['QUEUED', 'IN_REVIEW'] },
          slaDeadline: { lt: new Date() },
        },
      }),
    ]
  )

  return {
    pendingConsultations,
    completedToday,
    completedThisWeek,
    overdueCount,
  }
}

async function getRecentActivity(attorneyId: string) {
  return prisma.consultation.findMany({
    where: {
      attorneyId,
      status: 'COMPLETED',
    },
    orderBy: { completedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      externalId: true,
      question: true,
      completedAt: true,
      complexity: true,
    },
  })
}

async function getUrgentItems() {
  return prisma.consultation.findMany({
    where: {
      status: { in: ['QUEUED', 'IN_REVIEW'] },
      complexity: 'URGENT',
    },
    orderBy: { createdAt: 'asc' },
    take: 3,
    select: {
      id: true,
      externalId: true,
      question: true,
      createdAt: true,
      slaDeadline: true,
    },
  })
}

function StatsCardSkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-2 h-8 w-16" />
    </Card>
  )
}

async function StatsCards() {
  const { attorney } = await getCurrentAttorneySession()
  if (!attorney) return null

  const stats = await getAttorneyStats(attorney.id)

  const cards = [
    {
      title: 'Queue',
      value: stats.pendingConsultations,
      icon: ListTodo,
      color: 'text-primary-500',
      bgColor: 'bg-primary-500/10',
    },
    {
      title: 'Completed Today',
      value: stats.completedToday,
      icon: CheckCircle2,
      color: 'text-success-500',
      bgColor: 'bg-success-500/10',
    },
    {
      title: 'This Week',
      value: stats.completedThisWeek,
      icon: TrendingUp,
      color: 'text-primary-500',
      bgColor: 'bg-primary-500/10',
    },
    {
      title: 'Overdue',
      value: stats.overdueCount,
      icon: AlertTriangle,
      color: stats.overdueCount > 0 ? 'text-error-500' : 'text-text-secondary',
      bgColor: stats.overdueCount > 0 ? 'bg-error-500/10' : 'bg-background-primary',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">{card.title}</span>
            <div className={`rounded-lg p-2 ${card.bgColor}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
          </div>
          <p className={`mt-2 text-3xl font-bold ${card.color}`}>{card.value}</p>
        </Card>
      ))}
    </div>
  )
}

async function UrgentItems() {
  const items = await getUrgentItems()

  if (items.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning-500" />
          <h2 className="text-lg font-semibold text-text-primary">Urgent Items</h2>
        </div>
        <p className="mt-4 text-sm text-text-secondary">No urgent items at the moment.</p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning-500" />
          <h2 className="text-lg font-semibold text-text-primary">Urgent Items</h2>
        </div>
        <Badge variant="warning">{items.length}</Badge>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/attorney/queue/${item.id}`}
            className="block rounded-lg border border-border p-3 transition-colors hover:bg-background-primary"
          >
            <p className="line-clamp-1 text-sm font-medium text-text-primary">{item.question}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
              <Clock className="h-3 w-3" />
              {item.slaDeadline && (
                <span className="text-warning-500">
                  Due {new Date(item.slaDeadline).toLocaleString()}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
      <Button asChild variant="ghost" className="mt-4 w-full">
        <Link href="/attorney/queue?complexity=URGENT">View all urgent</Link>
      </Button>
    </Card>
  )
}

async function RecentActivity() {
  const { attorney } = await getCurrentAttorneySession()
  if (!attorney) return null

  const items = await getRecentActivity(attorney.id)

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-text-primary">Recent Activity</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-text-secondary">No recent activity.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 border-b border-border pb-3 last:border-0"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-success-500" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm text-text-primary">{item.question}</p>
                <p className="text-xs text-text-secondary">
                  {item.completedAt?.toLocaleDateString()}
                </p>
              </div>
              <Badge variant={item.complexity === 'URGENT' ? 'warning' : 'secondary'}>
                {item.complexity}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default async function AttorneyDashboardPage() {
  const { attorney } = await getCurrentAttorneySession()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Welcome back, {attorney?.firstName}
        </h1>
        <p className="text-text-secondary">Here's what's happening today.</p>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <StatsCards />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-64" />}>
          <UrgentItems />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-64" />}>
          <RecentActivity />
        </Suspense>
      </div>

      <div className="flex gap-4">
        <Button asChild>
          <Link href="/attorney/queue">View Queue</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/attorney/stats">View Stats</Link>
        </Button>
      </div>
    </div>
  )
}
