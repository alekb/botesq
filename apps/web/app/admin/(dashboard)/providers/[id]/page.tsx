import { notFound } from 'next/navigation'
import { prisma } from '@botesq/database'
import { ProviderDetail } from '@/components/admin/provider-detail'

interface ProviderDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function AdminProviderDetailPage({ params }: ProviderDetailPageProps) {
  const { id } = await params

  const provider = await prisma.provider.findUnique({
    where: { id },
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
          settlements: true,
        },
      },
      requests: {
        select: {
          id: true,
          serviceType: true,
          status: true,
          creditsCharged: true,
          createdAt: true,
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!provider) {
    notFound()
  }

  return <ProviderDetail provider={provider} />
}
