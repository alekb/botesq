import { prisma } from '@botesq/database'
import { Building2, Users, FileText, CreditCard } from 'lucide-react'
import { StatsCard } from '@/components/portal/stats-card'
import { SystemHealth } from '@/components/admin/system-health'
import { RevenueStats } from '@/components/admin/revenue-stats'
import { AlertsPanel } from '@/components/admin/alerts-panel'

async function getStats() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const [
    totalOperators,
    activeOperators,
    totalAttorneys,
    activeAttorneys,
    pendingConsultations,
    totalMatters,
    creditsThisMonth,
    creditsLastMonth,
    lowCreditOperators,
    overdueConsultations,
  ] = await Promise.all([
    prisma.operator.count(),
    prisma.operator.count({ where: { status: 'ACTIVE' } }),
    prisma.attorney.count(),
    prisma.attorney.count({ where: { status: 'ACTIVE' } }),
    prisma.consultation.count({
      where: { status: { in: ['QUEUED', 'AI_PROCESSING', 'PENDING_REVIEW', 'IN_REVIEW'] } },
    }),
    prisma.matter.count(),
    prisma.creditTransaction.aggregate({
      where: {
        type: 'PURCHASE',
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    }),
    prisma.creditTransaction.aggregate({
      where: {
        type: 'PURCHASE',
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { amount: true },
    }),
    prisma.operator.count({
      where: { creditBalance: { lt: 100 } },
    }),
    prisma.consultation.count({
      where: {
        status: { in: ['QUEUED', 'PENDING_REVIEW'] },
        createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  const currentMonthCredits = creditsThisMonth._sum.amount ?? 0
  const lastMonthCredits = creditsLastMonth._sum.amount ?? 0
  const creditsTrend =
    lastMonthCredits > 0
      ? Math.round(((currentMonthCredits - lastMonthCredits) / lastMonthCredits) * 100)
      : 0

  return {
    operators: { total: totalOperators, active: activeOperators },
    attorneys: { total: totalAttorneys, active: activeAttorneys },
    system: { pendingConsultations, totalMatters },
    revenue: { creditsThisMonth: currentMonthCredits, creditsTrend },
    alerts: { lowCreditOperators, overdueConsultations },
  }
}

export default async function AdminDashboardPage() {
  const stats = await getStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
        <p className="text-text-secondary">System overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Operators"
          value={stats.operators.total}
          description={`${stats.operators.active} active`}
          icon={Building2}
        />
        <StatsCard
          title="Total Attorneys"
          value={stats.attorneys.total}
          description={`${stats.attorneys.active} active`}
          icon={Users}
        />
        <StatsCard title="Active Matters" value={stats.system.totalMatters} icon={FileText} />
        <StatsCard
          title="Credits This Month"
          value={stats.revenue.creditsThisMonth.toLocaleString()}
          icon={CreditCard}
          trend={
            stats.revenue.creditsTrend !== 0
              ? {
                  value: Math.abs(stats.revenue.creditsTrend),
                  isPositive: stats.revenue.creditsTrend > 0,
                }
              : undefined
          }
        />
      </div>

      {/* Widgets Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SystemHealth
          pendingConsultations={stats.system.pendingConsultations}
          totalMatters={stats.system.totalMatters}
        />
        <RevenueStats
          creditsThisMonth={stats.revenue.creditsThisMonth}
          creditsTrend={stats.revenue.creditsTrend}
        />
        <AlertsPanel
          lowCreditOperators={stats.alerts.lowCreditOperators}
          overdueConsultations={stats.alerts.overdueConsultations}
        />
      </div>
    </div>
  )
}
