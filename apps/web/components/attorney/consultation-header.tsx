'use client'

import Link from 'next/link'
import { ArrowLeft, Clock, User, FileText, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { claimConsultationAction } from '@/lib/attorney-auth/consultation-actions'

interface ConsultationHeaderProps {
  consultation: {
    id: string
    externalId: string
    status: string
    complexity: string
    slaDeadline: Date | null
    createdAt: Date
    matter: {
      id: string
      externalId: string
      type: string
      operator: {
        id: string
        companyName: string
        email: string
      }
    } | null
    attorney: {
      id: string
      firstName: string
      lastName: string
    } | null
  }
  canClaim: boolean
  isOwner?: boolean
}

function isOverdue(deadline: Date | null): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

export function ConsultationHeader({ consultation, canClaim }: ConsultationHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        href="/attorney/queue"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Queue
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-text-primary">
              Consultation {consultation.externalId}
            </h1>
            <Badge
              variant={
                consultation.status === 'COMPLETED'
                  ? 'success'
                  : consultation.status === 'IN_REVIEW'
                    ? 'default'
                    : 'secondary'
              }
            >
              {consultation.status.replace('_', ' ')}
            </Badge>
            <Badge variant={consultation.complexity === 'URGENT' ? 'error' : 'secondary'}>
              {consultation.complexity}
            </Badge>
            {isOverdue(consultation.slaDeadline) && (
              <Badge variant="error" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Overdue
              </Badge>
            )}
          </div>

          {/* Meta info */}
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {new Date(consultation.createdAt).toLocaleString()}
            </span>

            {consultation.matter && (
              <Link
                href={`/attorney/matters/${consultation.matter.id}`}
                className="flex items-center gap-1 hover:text-primary-500"
              >
                <FileText className="h-4 w-4" />
                {consultation.matter.externalId}
              </Link>
            )}

            {consultation.attorney && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {consultation.attorney.firstName} {consultation.attorney.lastName}
              </span>
            )}

            {consultation.slaDeadline && (
              <span className={isOverdue(consultation.slaDeadline) ? 'text-error-500' : ''}>
                Due: {new Date(consultation.slaDeadline).toLocaleString()}
              </span>
            )}
          </div>

          {/* Operator info */}
          {consultation.matter && (
            <p className="mt-1 text-sm text-text-secondary">
              Operator: {consultation.matter.operator.companyName} (
              {consultation.matter.operator.email})
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {canClaim && (
            <form action={claimConsultationAction.bind(null, consultation.id)}>
              <Button type="submit">Claim</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
