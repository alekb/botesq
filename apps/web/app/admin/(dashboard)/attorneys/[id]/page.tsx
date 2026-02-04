import { notFound } from 'next/navigation'
import { prisma } from '@botesq/database'
import { AttorneyForm } from '@/components/admin/attorney-form'

interface AttorneyDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function AdminAttorneyDetailPage({ params }: AttorneyDetailPageProps) {
  const { id } = await params

  const attorney = await prisma.attorney.findUnique({
    where: { id },
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
    },
  })

  if (!attorney) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Edit Attorney</h1>
        <p className="text-text-secondary">
          {attorney.firstName} {attorney.lastName}
        </p>
      </div>

      <AttorneyForm attorney={attorney} mode="edit" />
    </div>
  )
}
