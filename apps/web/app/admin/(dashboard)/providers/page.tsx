import { prisma } from '@botesq/database'
import { ProviderList } from '@/components/admin/provider-list'

interface ProvidersPageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    page?: string
    limit?: string
  }>
}

export default async function AdminProvidersPage({ searchParams }: ProvidersPageProps) {
  const params = await searchParams
  const search = params.search
  const status = params.status
  const page = parseInt(params.page ?? '1', 10)
  const limit = parseInt(params.limit ?? '20', 10)
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
        description: true,
        email: true,
        webhookUrl: true,
        jurisdictions: true,
        specialties: true,
        serviceTypes: true,
        maxConcurrent: true,
        avgResponseMins: true,
        qualityScore: true,
        revenueSharePct: true,
        stripeConnectId: true,
        status: true,
        verifiedAt: true,
        totpEnabled: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            requests: true,
            services: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // PENDING_APPROVAL first
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
    }),
    prisma.provider.count({ where }),
    prisma.provider.count({ where: { status: 'PENDING_APPROVAL' } }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Providers</h1>
        <p className="text-text-secondary">Manage legal service providers and applications</p>
      </div>

      <ProviderList
        providers={providers}
        pagination={{
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }}
        pendingCount={pendingCount}
      />
    </div>
  )
}
