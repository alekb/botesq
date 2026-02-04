'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MatterStatusBadge } from './matter-status-badge'
import { formatDate, formatCredits } from '@/lib/utils/format'
import type { MatterStatus, MatterType, MatterUrgency, FeeArrangement } from '@botesq/database'

interface MatterDetailProps {
  matter: {
    id: string
    externalId: string
    title: string
    description?: string | null
    type: MatterType
    status: MatterStatus
    urgency: MatterUrgency
    createdAt: Date
    retainer?: {
      scope: string
      feeArrangement: FeeArrangement
      estimatedFee?: number | null
      acceptedAt?: Date | null
    } | null
  }
  children: React.ReactNode
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

const urgencyLabels: Record<MatterUrgency, string> = {
  LOW: 'Low',
  STANDARD: 'Standard',
  HIGH: 'High',
  URGENT: 'Urgent',
}

const feeLabels: Record<FeeArrangement, string> = {
  FLAT_FEE: 'Flat Fee',
  HOURLY: 'Hourly',
  CONTINGENT: 'Contingent',
  HYBRID: 'Hybrid',
}

export function MatterDetail({ matter, children }: MatterDetailProps) {
  const pathname = usePathname()
  const basePath = `/portal/matters/${matter.id}`

  const tabs = [
    { name: 'Overview', href: basePath },
    { name: 'Timeline', href: `${basePath}/timeline` },
    { name: 'Documents', href: `${basePath}/documents` },
    { name: 'Messages', href: `${basePath}/messages` },
  ]

  const activeTab = tabs.find((tab) => tab.href === pathname)?.href || basePath

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/portal/matters">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-text-primary">{matter.title}</h1>
              <MatterStatusBadge status={matter.status} />
            </div>
            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(matter.createdAt)}
              </span>
              <span className="font-mono text-xs">{matter.externalId}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Matter info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Matter Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <dt className="text-sm text-text-secondary">Type</dt>
              <dd className="text-sm font-medium text-text-primary">{typeLabels[matter.type]}</dd>
            </div>
            <div>
              <dt className="text-sm text-text-secondary">Priority</dt>
              <dd className="text-sm font-medium text-text-primary">
                {urgencyLabels[matter.urgency]}
              </dd>
            </div>
            {matter.retainer && (
              <>
                <div>
                  <dt className="text-sm text-text-secondary">Fee Arrangement</dt>
                  <dd className="text-sm font-medium text-text-primary">
                    {feeLabels[matter.retainer.feeArrangement]}
                  </dd>
                </div>
                {matter.retainer.estimatedFee && (
                  <div>
                    <dt className="text-sm text-text-secondary">Estimated Fee</dt>
                    <dd className="text-sm font-medium text-text-primary">
                      {formatCredits(matter.retainer.estimatedFee)} credits
                    </dd>
                  </div>
                )}
              </>
            )}
          </dl>
          {matter.description && (
            <div className="mt-4 pt-4 border-t border-border-default">
              <dt className="text-sm text-text-secondary mb-1">Description</dt>
              <dd className="text-sm text-text-primary whitespace-pre-wrap">
                {matter.description}
              </dd>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} className="w-full">
        <TabsList className="w-full justify-start">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.href} value={tab.href} asChild>
              <Link href={tab.href}>{tab.name}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Tab content */}
      {children}
    </div>
  )
}
