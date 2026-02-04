import { notFound } from 'next/navigation'
import { prisma } from '@botesq/database'
import { OperatorDetail } from '@/components/admin/operator-detail'

interface OperatorDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function AdminOperatorDetailPage({ params }: OperatorDetailPageProps) {
  const { id } = await params

  const operator = await prisma.operator.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      companyName: true,
      companyType: true,
      jurisdiction: true,
      phone: true,
      billingAddress: true,
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
          credits: true,
        },
      },
      agents: {
        select: {
          id: true,
          identifier: true,
          firstSeenAt: true,
        },
        take: 10,
        orderBy: { firstSeenAt: 'desc' },
      },
      credits: {
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          createdAt: true,
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!operator) {
    notFound()
  }

  return <OperatorDetail operator={operator} />
}
