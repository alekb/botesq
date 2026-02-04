import { prisma } from '@botesq/database'
import { getCurrentAttorneySession } from '@/lib/attorney-auth/session'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, TrendingUp, BarChart3, Calendar } from 'lucide-react'

async function getAttorneyStats(attorneyId: string) {
  const now = new Date()
  const startOfDay = new Date(now.setHours(0, 0, 0, 0))
  const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalCompleted,
    completedToday,
    completedThisWeek,
    completedThisMonth,
    avgResponseTime,
    byComplexity,
    recentCompletions,
  ] = await Promise.all([
    // Total completed
    prisma.consultation.count({
      where: {
        attorneyId,
        status: 'COMPLETED',
      },
    }),

    // Completed today
    prisma.consultation.count({
      where: {
        attorneyId,
        status: 'COMPLETED',
        completedAt: { gte: startOfDay },
      },
    }),

    // Completed this week
    prisma.consultation.count({
      where: {
        attorneyId,
        status: 'COMPLETED',
        completedAt: { gte: startOfWeek },
      },
    }),

    // Completed this month
    prisma.consultation.count({
      where: {
        attorneyId,
        status: 'COMPLETED',
        completedAt: { gte: startOfMonth },
      },
    }),

    // Average response time (in hours)
    prisma.consultation.findMany({
      where: {
        attorneyId,
        status: 'COMPLETED',
        completedAt: { not: null },
      },
      select: {
        createdAt: true,
        completedAt: true,
      },
      take: 100,
      orderBy: { completedAt: 'desc' },
    }),

    // By complexity
    prisma.consultation.groupBy({
      by: ['complexity'],
      where: {
        attorneyId,
        status: 'COMPLETED',
      },
      _count: true,
    }),

    // Recent completions
    prisma.consultation.findMany({
      where: {
        attorneyId,
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        externalId: true,
        question: true,
        complexity: true,
        completedAt: true,
        createdAt: true,
      },
    }),
  ])

  // Calculate average response time
  let avgHours = 0
  if (avgResponseTime.length > 0) {
    const totalMs = avgResponseTime.reduce((sum, c) => {
      if (!c.completedAt) return sum
      return sum + (new Date(c.completedAt).getTime() - new Date(c.createdAt).getTime())
    }, 0)
    avgHours = Math.round((totalMs / avgResponseTime.length / 1000 / 60 / 60) * 10) / 10
  }

  return {
    totalCompleted,
    completedToday,
    completedThisWeek,
    completedThisMonth,
    avgResponseTimeHours: avgHours,
    byComplexity: byComplexity.reduce(
      (acc, c) => {
        acc[c.complexity] = c._count
        return acc
      },
      {} as Record<string, number>
    ),
    recentCompletions,
  }
}

export default async function AttorneyStatsPage() {
  const { attorney } = await getCurrentAttorneySession()
  if (!attorney) return null

  const stats = await getAttorneyStats(attorney.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Your Statistics</h1>
        <p className="text-text-secondary">Track your performance and activity.</p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">Total Completed</span>
            <CheckCircle2 className="h-5 w-5 text-success-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-text-primary">{stats.totalCompleted}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">This Week</span>
            <TrendingUp className="h-5 w-5 text-primary-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-text-primary">{stats.completedThisWeek}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">This Month</span>
            <Calendar className="h-5 w-5 text-primary-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-text-primary">{stats.completedThisMonth}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">Avg Response Time</span>
            <Clock className="h-5 w-5 text-warning-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-text-primary">{stats.avgResponseTimeHours}h</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Complexity */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-text-primary">By Complexity</h2>
          </div>
          <div className="space-y-4">
            {Object.entries(stats.byComplexity).map(([complexity, count]) => (
              <div key={complexity} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={complexity === 'URGENT' ? 'error' : 'secondary'}>
                    {complexity}
                  </Badge>
                </div>
                <span className="text-lg font-semibold text-text-primary">{count}</span>
              </div>
            ))}
            {Object.keys(stats.byComplexity).length === 0 && (
              <p className="text-sm text-text-secondary">No completed consultations yet.</p>
            )}
          </div>
        </Card>

        {/* Recent Completions */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">Recent Completions</h2>
          <div className="space-y-3">
            {stats.recentCompletions.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between border-b border-border pb-3 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-text-primary">
                    {item.question}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {item.completedAt?.toLocaleDateString()}
                  </p>
                </div>
                <Badge
                  variant={item.complexity === 'URGENT' ? 'warning' : 'secondary'}
                  className="ml-2 flex-shrink-0"
                >
                  {item.complexity}
                </Badge>
              </div>
            ))}
            {stats.recentCompletions.length === 0 && (
              <p className="text-sm text-text-secondary">No recent completions.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Daily Performance */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Today's Summary</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="text-center">
            <p className="text-4xl font-bold text-success-500">{stats.completedToday}</p>
            <p className="text-sm text-text-secondary">Completed Today</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-primary-500">{stats.byComplexity.URGENT || 0}</p>
            <p className="text-sm text-text-secondary">Urgent Handled</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-text-primary">{stats.avgResponseTimeHours}h</p>
            <p className="text-sm text-text-secondary">Avg Response Time</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
