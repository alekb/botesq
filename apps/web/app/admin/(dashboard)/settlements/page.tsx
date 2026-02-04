import { prisma } from '@botesq/database'
import { SettlementList } from '@/components/admin/settlement-list'
import type { SettlementStatus } from '@botesq/database'

interface SettlementsPageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    year?: string
    month?: string
    page?: string
    limit?: string
  }>
}

export default async function AdminSettlementsPage({ searchParams }: SettlementsPageProps) {
  const params = await searchParams
  const search = params.search
  const status = params.status as SettlementStatus | undefined
  const year = params.year
  const month = params.month
  const page = parseInt(params.page ?? '1', 10)
  const limit = parseInt(params.limit ?? '20', 10)
  const skip = (page - 1) * limit

  // Build where clause
  const where: Record<string, unknown> = {}

  if (search) {
    where.provider = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }
  }

  if (status && ['PENDING', 'PROCESSING', 'PAID', 'FAILED'].includes(status)) {
    where.status = status
  }

  // Calculate period filters
  if (year && month) {
    const y = parseInt(year, 10)
    const m = parseInt(month, 10)
    const periodStart = new Date(Date.UTC(y, m - 1, 1))
    const periodEnd = new Date(Date.UTC(y, m, 1))
    where.periodStart = { gte: periodStart }
    where.periodEnd = { lte: periodEnd }
  }

  const [settlements, total, pendingStats, paidStats, failedCount] = await Promise.all([
    prisma.providerSettlement.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            stripeConnectId: true,
          },
        },
      },
      orderBy: [{ periodEnd: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.providerSettlement.count({ where }),
    prisma.providerSettlement.aggregate({
      where: { status: 'PENDING' },
      _count: true,
      _sum: { providerShare: true },
    }),
    prisma.providerSettlement.aggregate({
      where: { status: 'PAID' },
      _count: true,
      _sum: { providerShare: true },
    }),
    prisma.providerSettlement.count({
      where: { status: 'FAILED' },
    }),
  ])

  const stats = {
    totalPending: pendingStats._count,
    totalPendingAmount: pendingStats._sum.providerShare || 0,
    totalPaid: paidStats._count,
    totalPaidAmount: paidStats._sum.providerShare || 0,
    totalFailed: failedCount,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Provider Settlements</h1>
        <p className="text-text-secondary">Manage provider payouts and earnings settlements</p>
      </div>

      <SettlementList
        settlements={settlements.map((s) => ({
          ...s,
          periodStart: s.periodStart.toISOString(),
          periodEnd: s.periodEnd.toISOString(),
          paidAt: s.paidAt?.toISOString() ?? null,
          createdAt: s.createdAt.toISOString(),
        }))}
        stats={stats}
        pagination={{
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }}
      />
    </div>
  )
}
