import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@botesq/database'
import { getCurrentAdminSession } from '@/lib/admin-auth/session'

export async function GET(request: NextRequest) {
  try {
    const { admin } = await getCurrentAdminSession()

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') ?? undefined
    const status = searchParams.get('status') ?? undefined
    const filter = searchParams.get('filter') ?? undefined
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const limit = parseInt(searchParams.get('limit') ?? '20', 10)
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status && ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'CLOSED'].includes(status)) {
      where.status = status
    }

    if (filter === 'low_credits') {
      where.creditBalance = { lt: 100 }
    }

    const [operators, total] = await Promise.all([
      prisma.operator.findMany({
        where,
        select: {
          id: true,
          email: true,
          companyName: true,
          companyType: true,
          jurisdiction: true,
          creditBalance: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          _count: {
            select: {
              agents: true,
              apiKeys: true,
              matters: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.operator.count({ where }),
    ])

    return NextResponse.json({
      operators,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to list operators:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
