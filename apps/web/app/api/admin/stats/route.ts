import { NextResponse } from 'next/server'
import { prisma } from '@botesq/database'
import { getCurrentAdminSession } from '@/lib/admin-auth/session'

export async function GET() {
  try {
    const { admin } = await getCurrentAdminSession()

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Run all queries in parallel for better performance
    const [
      totalOperators,
      activeOperators,
      totalAttorneys,
      activeAttorneys,
      pendingConsultations,
      totalMatters,
      creditsThisMonth,
      creditsLastMonth,
      recentAlerts,
    ] = await Promise.all([
      // Total operators
      prisma.operator.count(),

      // Active operators
      prisma.operator.count({ where: { status: 'ACTIVE' } }),

      // Total attorneys
      prisma.attorney.count(),

      // Active attorneys
      prisma.attorney.count({ where: { status: 'ACTIVE' } }),

      // Pending consultations
      prisma.consultation.count({
        where: { status: { in: ['QUEUED', 'AI_PROCESSING', 'PENDING_REVIEW', 'IN_REVIEW'] } },
      }),

      // Total matters
      prisma.matter.count(),

      // Credits purchased this month
      prisma.creditTransaction.aggregate({
        where: {
          type: 'PURCHASE',
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),

      // Credits purchased last month
      prisma.creditTransaction.aggregate({
        where: {
          type: 'PURCHASE',
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { amount: true },
      }),

      // Recent alerts (operators with low credits, overdue items)
      Promise.all([
        // Operators with low credits
        prisma.operator.count({
          where: { creditBalance: { lt: 100 } },
        }),
        // Overdue consultations (over 24 hours pending)
        prisma.consultation.count({
          where: {
            status: { in: ['QUEUED', 'PENDING_REVIEW'] },
            createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
      ]),
    ])

    const currentMonthCredits = creditsThisMonth._sum.amount ?? 0
    const lastMonthCredits = creditsLastMonth._sum.amount ?? 0
    const creditsTrend =
      lastMonthCredits > 0
        ? Math.round(((currentMonthCredits - lastMonthCredits) / lastMonthCredits) * 100)
        : 0

    const [lowCreditOperators, overdueConsultations] = recentAlerts

    return NextResponse.json({
      operators: {
        total: totalOperators,
        active: activeOperators,
      },
      attorneys: {
        total: totalAttorneys,
        active: activeAttorneys,
      },
      system: {
        pendingConsultations,
        totalMatters,
      },
      revenue: {
        creditsThisMonth: currentMonthCredits,
        creditsTrend,
      },
      alerts: {
        lowCreditOperators,
        overdueConsultations,
        total: lowCreditOperators + overdueConsultations,
      },
    })
  } catch (error) {
    console.error('Failed to get admin stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
