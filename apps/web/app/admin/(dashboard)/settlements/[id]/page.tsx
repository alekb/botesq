import { notFound } from 'next/navigation'
import { prisma } from '@botesq/database'
import { SettlementDetail } from '@/components/admin/settlement-detail'
import { getConnectAccountStatus } from '@/lib/stripe/connect'

interface SettlementDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminSettlementDetailPage({ params }: SettlementDetailPageProps) {
  const { id } = await params

  const settlement = await prisma.providerSettlement.findUnique({
    where: { id },
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          email: true,
          stripeConnectId: true,
        },
      },
    },
  })

  if (!settlement) {
    notFound()
  }

  // Fetch Stripe Connect status if provider has Connect configured
  let connectStatus = null
  if (settlement.provider.stripeConnectId) {
    try {
      connectStatus = await getConnectAccountStatus(settlement.provider.stripeConnectId)
    } catch {
      // If we can't fetch status, just show null
      connectStatus = null
    }
  }

  return (
    <SettlementDetail
      settlement={{
        ...settlement,
        periodStart: settlement.periodStart.toISOString(),
        periodEnd: settlement.periodEnd.toISOString(),
        paidAt: settlement.paidAt?.toISOString() ?? null,
        createdAt: settlement.createdAt.toISOString(),
      }}
      connectStatus={connectStatus}
    />
  )
}
