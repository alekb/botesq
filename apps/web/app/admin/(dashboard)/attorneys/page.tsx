import { prisma } from '@botesq/database'
import { AttorneyList } from '@/components/admin/attorney-list'

interface AttorneysPageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    role?: string
    page?: string
    limit?: string
  }>
}

export default async function AdminAttorneysPage({ searchParams }: AttorneysPageProps) {
  const params = await searchParams
  const search = params.search
  const status = params.status
  const role = params.role
  const page = parseInt(params.page ?? '1', 10)
  const limit = parseInt(params.limit ?? '20', 10)
  const skip = (page - 1) * limit

  // Build where clause
  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (status && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
    where.status = status
  }

  if (role && ['ASSOCIATE', 'SENIOR', 'PARTNER', 'ADMIN'].includes(role)) {
    where.role = role
  }

  const [attorneys, total] = await Promise.all([
    prisma.attorney.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        barNumber: true,
        barState: true,
        role: true,
        totpEnabled: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            consultations: true,
            assignments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.attorney.count({ where }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Attorneys</h1>
        <p className="text-text-secondary">Manage attorney accounts and roles</p>
      </div>

      <AttorneyList
        attorneys={attorneys}
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
