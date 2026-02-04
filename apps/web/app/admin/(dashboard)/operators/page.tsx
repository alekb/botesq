import { prisma } from '@botesq/database'
import { OperatorList } from '@/components/admin/operator-list'

interface OperatorsPageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    filter?: string
    page?: string
    limit?: string
  }>
}

export default async function AdminOperatorsPage({ searchParams }: OperatorsPageProps) {
  const params = await searchParams
  const search = params.search
  const status = params.status
  const filter = params.filter
  const page = parseInt(params.page ?? '1', 10)
  const limit = parseInt(params.limit ?? '20', 10)
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
        phone: true,
        creditBalance: true,
        webhookUrl: true,
        webhookSecret: true,
        status: true,
        emailVerified: true,
        emailVerifiedAt: true,
        tosAcceptedAt: true,
        tosVersion: true,
        createdAt: true,
        updatedAt: true,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Operators</h1>
        <p className="text-text-secondary">Manage operator accounts and access</p>
      </div>

      <OperatorList
        operators={operators}
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
