import { prisma } from '@botesq/database'
import { AuditLogViewer } from '@/components/admin/audit-log-viewer'

interface AuditPageProps {
  searchParams: Promise<{
    actorType?: string
    action?: string
    resourceType?: string
    startDate?: string
    endDate?: string
    page?: string
    limit?: string
  }>
}

export default async function AdminAuditPage({ searchParams }: AuditPageProps) {
  const params = await searchParams
  const actorType = params.actorType
  const action = params.action
  const resourceType = params.resourceType
  const startDate = params.startDate
  const endDate = params.endDate
  const page = parseInt(params.page ?? '1', 10)
  const limit = parseInt(params.limit ?? '50', 10)
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
    logs.map(async (log: (typeof logs)[number]) => {
      let actorName = null

      if (log.actorId) {
        if (log.actorType === 'ADMIN' || log.actorType === 'ATTORNEY') {
          const attorney = await prisma.attorney.findUnique({
            where: { id: log.actorId },
            select: { firstName: true, lastName: true },
          })
          if (attorney) {
            actorName = `${attorney.firstName} ${attorney.lastName}`
          }
        } else if (log.actorType === 'OPERATOR') {
          const operator = await prisma.operator.findUnique({
            where: { id: log.actorId },
            select: { companyName: true },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Audit Logs</h1>
        <p className="text-text-secondary">View system activity and changes</p>
      </div>

      <AuditLogViewer
        logs={enrichedLogs}
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
