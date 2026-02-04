import { Suspense } from 'react'
import { prisma } from '@botesq/database'
import { getCurrentAttorneySession } from '@/lib/attorney-auth/session'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { QueueFilters } from '@/components/attorney/queue-filters'
import { QueueList } from '@/components/attorney/queue-list'
import { QueueStats } from '@/components/attorney/queue-stats'

interface QueuePageProps {
  searchParams: Promise<{
    status?: string
    complexity?: string
    search?: string
    sort?: string
  }>
}

async function getQueueItems(params: {
  status?: string
  complexity?: string
  search?: string
  sort?: string
}) {
  const where: Record<string, unknown> = {
    status: { in: ['QUEUED', 'AI_PROCESSING', 'IN_REVIEW'] },
  }

  if (params.status) {
    where.status = params.status
  }

  if (params.complexity) {
    where.complexity = params.complexity
  }

  if (params.search) {
    where.OR = [
      { question: { contains: params.search, mode: 'insensitive' } },
      { externalId: { contains: params.search, mode: 'insensitive' } },
    ]
  }

  const orderBy: Record<string, string> = {}
  switch (params.sort) {
    case 'oldest':
      orderBy.createdAt = 'asc'
      break
    case 'deadline':
      orderBy.slaDeadline = 'asc'
      break
    case 'complexity':
      orderBy.complexity = 'desc'
      break
    default:
      orderBy.createdAt = 'desc'
  }

  return prisma.consultation.findMany({
    where,
    orderBy,
    take: 50,
    include: {
      matter: {
        select: {
          id: true,
          externalId: true,
          type: true,
        },
      },
      attorney: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })
}

async function getQueueStats() {
  const [total, urgent, standard, myItems] = await Promise.all([
    prisma.consultation.count({
      where: { status: { in: ['QUEUED', 'AI_PROCESSING', 'IN_REVIEW'] } },
    }),
    prisma.consultation.count({
      where: {
        status: { in: ['QUEUED', 'AI_PROCESSING', 'IN_REVIEW'] },
        complexity: 'URGENT',
      },
    }),
    prisma.consultation.count({
      where: {
        status: { in: ['QUEUED', 'AI_PROCESSING', 'IN_REVIEW'] },
        complexity: 'STANDARD',
      },
    }),
    getCurrentAttorneySession().then(({ attorney }) =>
      attorney
        ? prisma.consultation.count({
            where: {
              attorneyId: attorney.id,
              status: 'IN_REVIEW',
            },
          })
        : 0
    ),
  ])

  return { total, urgent, standard, myItems }
}

function QueueListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </Card>
      ))}
    </div>
  )
}

async function QueueContent({
  searchParams,
}: {
  searchParams: Awaited<QueuePageProps['searchParams']>
}) {
  const items = await getQueueItems(searchParams)

  return <QueueList items={items} />
}

async function QueueStatsContent() {
  const stats = await getQueueStats()

  return <QueueStats stats={stats} />
}

export default async function QueuePage({ searchParams }: QueuePageProps) {
  const params = await searchParams

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Queue</h1>
        <p className="text-text-secondary">Review and respond to consultation requests.</p>
      </div>

      <Suspense fallback={<Skeleton className="h-24" />}>
        <QueueStatsContent />
      </Suspense>

      <QueueFilters />

      <Suspense fallback={<QueueListSkeleton />}>
        <QueueContent searchParams={params} />
      </Suspense>
    </div>
  )
}
