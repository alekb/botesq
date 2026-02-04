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
    const actorType = searchParams.get('actorType') ?? undefined
    const action = searchParams.get('action') ?? undefined
    const resourceType = searchParams.get('resourceType') ?? undefined
    const startDate = searchParams.get('startDate') ?? undefined
    const endDate = searchParams.get('endDate') ?? undefined
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}

    if (
      actorType &&
      ['OPERATOR', 'AGENT', 'ATTORNEY', 'ADMIN', 'SYSTEM', 'PROVIDER'].includes(actorType)
    ) {
      where.actorType = actorType
    }

    if (action) {
      where.action = { contains: action, mode: 'insensitive' }
    }

    if (resourceType) {
      where.resourceType = { contains: resourceType, mode: 'insensitive' }
    }

    if (startDate || endDate) {
      const createdAtFilter: Record<string, Date> = {}
      if (startDate) {
        createdAtFilter.gte = new Date(startDate)
      }
      if (endDate) {
        createdAtFilter.lte = new Date(endDate)
      }
      where.createdAt = createdAtFilter
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    // Enrich logs with actor names where possible
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        let actorName = null

        if (log.actorId) {
          if (log.actorType === 'ADMIN' || log.actorType === 'ATTORNEY') {
            const attorney = await prisma.attorney.findUnique({
              where: { id: log.actorId },
              select: { firstName: true, lastName: true, email: true },
            })
            if (attorney) {
              actorName = `${attorney.firstName} ${attorney.lastName}`
            }
          } else if (log.actorType === 'OPERATOR') {
            const operator = await prisma.operator.findUnique({
              where: { id: log.actorId },
              select: { companyName: true, email: true },
            })
            if (operator) {
              actorName = operator.companyName
            }
          } else if (log.actorType === 'AGENT') {
            const agent = await prisma.agent.findUnique({
              where: { id: log.actorId },
              select: { identifier: true },
            })
            if (agent) {
              actorName = agent.identifier ?? 'Unknown Agent'
            }
          }
        }

        return {
          ...log,
          actorName,
        }
      })
    )

    return NextResponse.json({
      logs: enrichedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to list audit logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
