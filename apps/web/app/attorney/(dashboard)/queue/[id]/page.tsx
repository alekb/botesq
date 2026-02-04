import { notFound } from 'next/navigation'
import { prisma } from '@botesq/database'
import { getCurrentAttorneySession } from '@/lib/attorney-auth/session'
import { ConsultationHeader } from '@/components/attorney/consultation-header'
import { ConsultationQuestion } from '@/components/attorney/consultation-question'
import { AiDraftPanel } from '@/components/attorney/ai-draft-panel'
import { ResponseEditor } from '@/components/attorney/response-editor'

interface ConsultationDetailPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ action?: string }>
}

async function getConsultation(id: string) {
  return prisma.consultation.findUnique({
    where: { id },
    include: {
      matter: {
        include: {
          operator: {
            select: {
              id: true,
              companyName: true,
              email: true,
            },
          },
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

export default async function ConsultationDetailPage({
  params,
  searchParams,
}: ConsultationDetailPageProps) {
  const [{ id }, { action }] = await Promise.all([params, searchParams])
  const { attorney } = await getCurrentAttorneySession()

  if (!attorney) {
    notFound()
  }

  const consultation = await getConsultation(id)

  if (!consultation) {
    notFound()
  }

  // Handle claim action
  if (action === 'claim' && consultation.status === 'QUEUED') {
    await prisma.consultation.update({
      where: { id },
      data: {
        attorneyId: attorney.id,
        status: 'IN_REVIEW',
      },
    })
    // Refresh consultation data
    const updated = await getConsultation(id)
    if (updated) {
      return <ConsultationDetailContent consultation={updated} attorneyId={attorney.id} />
    }
  }

  return <ConsultationDetailContent consultation={consultation} attorneyId={attorney.id} />
}

function ConsultationDetailContent({
  consultation,
  attorneyId,
}: {
  consultation: NonNullable<Awaited<ReturnType<typeof getConsultation>>>
  attorneyId: string
}) {
  const isOwner = consultation.attorneyId === attorneyId
  const canEdit = isOwner && consultation.status === 'IN_REVIEW'
  const canClaim = consultation.status === 'QUEUED'

  return (
    <div className="space-y-6">
      <ConsultationHeader consultation={consultation} canClaim={canClaim} isOwner={isOwner} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column - Question and Context */}
        <div className="space-y-6">
          <ConsultationQuestion consultation={consultation} />
        </div>

        {/* Right column - AI Draft and Response Editor */}
        <div className="space-y-6">
          {consultation.aiDraft && (
            <AiDraftPanel
              draft={consultation.aiDraft}
              confidence={consultation.aiConfidence}
              metadata={consultation.aiMetadata as Record<string, unknown> | null}
            />
          )}

          {canEdit && (
            <ResponseEditor
              consultationId={consultation.id}
              initialResponse={consultation.finalResponse}
              aiDraft={consultation.aiDraft}
            />
          )}

          {consultation.status === 'COMPLETED' && consultation.finalResponse && (
            <div className="rounded-lg border border-success-500/20 bg-success-500/5 p-4">
              <h3 className="mb-2 font-semibold text-success-500">Final Response</h3>
              <div className="prose prose-sm max-w-none text-text-primary">
                {consultation.finalResponse}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
