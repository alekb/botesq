import Link from 'next/link'
import { Briefcase, Calendar, FileText, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { MatterStatusBadge } from './matter-status-badge'
import { formatDate } from '@/lib/utils/format'
import type { MatterStatus, MatterType, MatterUrgency } from '@botesq/database'

interface MatterCardProps {
  matter: {
    id: string
    externalId: string
    title: string
    type: MatterType
    status: MatterStatus
    urgency: MatterUrgency
    createdAt: Date
    documentCount?: number
  }
}

const typeLabels: Record<MatterType, string> = {
  CONTRACT_REVIEW: 'Contract Review',
  ENTITY_FORMATION: 'Entity Formation',
  COMPLIANCE: 'Compliance',
  IP_TRADEMARK: 'IP - Trademark',
  IP_COPYRIGHT: 'IP - Copyright',
  GENERAL_CONSULTATION: 'General Consultation',
  LITIGATION_CONSULTATION: 'Litigation Consultation',
}

const urgencyColors: Record<MatterUrgency, string> = {
  LOW: 'bg-text-tertiary',
  STANDARD: 'bg-primary-500',
  HIGH: 'bg-warning-500',
  URGENT: 'bg-error-500',
}

export function MatterCard({ matter }: MatterCardProps) {
  return (
    <Link href={`/portal/matters/${matter.id}`}>
      <Card className="hover:border-primary-500 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="rounded-lg bg-background-tertiary p-2 flex-shrink-0">
                <Briefcase className="h-5 w-5 text-primary-500" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-text-primary truncate">{matter.title}</h3>
                  <div
                    className={`h-2 w-2 rounded-full flex-shrink-0 ${urgencyColors[matter.urgency]}`}
                    title={`${matter.urgency} priority`}
                  />
                </div>
                <p className="text-sm text-text-secondary truncate">{typeLabels[matter.type]}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-text-tertiary">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(matter.createdAt)}
                  </span>
                  {matter.documentCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {matter.documentCount} doc{matter.documentCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <MatterStatusBadge status={matter.status} />
              <ChevronRight className="h-5 w-5 text-text-tertiary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
