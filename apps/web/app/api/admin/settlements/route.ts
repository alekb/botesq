import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdminSession } from '@/lib/admin-auth/session'
import { logAdminAction, AdminActions } from '@/lib/admin-auth/audit'
import {
  listSettlements,
  generateMonthlySettlements,
  getSettlementStats,
} from '@botesq/mcp-server/services/settlement.service'
import { logger } from '@/lib/logger'
import type { SettlementStatus } from '@botesq/database'

export async function GET(request: NextRequest) {
  try {
    const { admin } = await getCurrentAdminSession()

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const providerId = searchParams.get('providerId') ?? undefined
    const status = searchParams.get('status') as SettlementStatus | undefined
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const limit = parseInt(searchParams.get('limit') ?? '20', 10)
    const offset = (page - 1) * limit

    // Calculate period filters
    let periodStart: Date | undefined
    let periodEnd: Date | undefined

    if (year && month) {
      const y = parseInt(year, 10)
      const m = parseInt(month, 10)
      periodStart = new Date(Date.UTC(y, m - 1, 1))
      periodEnd = new Date(Date.UTC(y, m, 1))
    }

    const [result, stats] = await Promise.all([
      listSettlements({
        providerId,
        status:
          status && ['PENDING', 'PROCESSING', 'PAID', 'FAILED'].includes(status)
            ? status
            : undefined,
        periodStart,
        periodEnd,
        limit,
        offset,
      }),
      getSettlementStats(),
    ])

    return NextResponse.json({
      settlements: result.settlements,
      stats,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    })
  } catch (error) {
    logger.error('Failed to list settlements', { error: String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin } = await getCurrentAdminSession()

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { year, month } = body

    if (!year || !month) {
      return NextResponse.json({ error: 'year and month are required' }, { status: 400 })
    }

    const y = parseInt(year, 10)
    const m = parseInt(month, 10)

    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 })
    }

    // Generate settlements
    const result = await generateMonthlySettlements(y, m)

    // Log the action
    await logAdminAction(admin.id, AdminActions.SETTLEMENT_GENERATE, 'ProviderSettlement', null, {
      year: y,
      month: m,
      generated: result.generated,
      skipped: result.skipped,
      errors: result.errors.length,
    })

    return NextResponse.json({
      success: true,
      generated: result.generated,
      skipped: result.skipped,
      errors: result.errors,
    })
  } catch (error) {
    logger.error('Failed to generate settlements', { error: String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
