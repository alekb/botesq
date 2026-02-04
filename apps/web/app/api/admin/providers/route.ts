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
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const limit = parseInt(searchParams.get('limit') ?? '20', 10)
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { legalName: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status && ['PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'INACTIVE'].includes(status)) {
      where.status = status
    }

    const [providers, total, pendingCount] = await Promise.all([
      prisma.provider.findMany({
        where,
        select: {
          id: true,
          externalId: true,
          name: true,
          legalName: true,
          email: true,
          jurisdictions: true,
          specialties: true,
          serviceTypes: true,
          qualityScore: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              requests: true,
              services: true,
            },
          },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.provider.count({ where }),
      prisma.provider.count({ where: { status: 'PENDING_APPROVAL' } }),
    ])

    return NextResponse.json({
      providers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      pendingCount,
    })
  } catch (error) {
    console.error('Failed to list providers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
