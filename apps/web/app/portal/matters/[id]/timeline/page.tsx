import { notFound } from 'next/navigation'
import { MatterDetail, MatterTimeline } from '@/components/portal/matters'
import { Card, CardContent } from '@/components/ui/card'

// Mock matter data
const mockMatter = {
  id: '1',
  externalId: 'MTR-001',
  title: 'Software Licensing Agreement Review',
  description:
    'Review and analysis of a software licensing agreement for a SaaS product. Focus on IP rights, usage restrictions, and liability clauses.',
  type: 'CONTRACT_REVIEW' as const,
  status: 'ACTIVE' as const,
  urgency: 'HIGH' as const,
  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  retainer: {
    scope: 'Contract review and legal opinion',
    feeArrangement: 'FLAT_FEE' as const,
    estimatedFee: 15000,
    acceptedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
}

// Mock timeline events
const mockEvents = [
  {
    id: '1',
    type: 'status' as const,
    title: 'Matter created',
    description: 'Legal matter initiated by AI agent',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
    status: 'success' as const,
  },
  {
    id: '2',
    type: 'system' as const,
    title: 'Retainer agreement accepted',
    description: 'Engagement terms accepted, matter activated',
    timestamp: new Date(Date.now() - 47 * 60 * 60 * 1000),
    status: 'success' as const,
  },
  {
    id: '3',
    type: 'document' as const,
    title: 'Document uploaded',
    description: 'software-license-agreement-v2.pdf (12 pages)',
    timestamp: new Date(Date.now() - 46 * 60 * 60 * 1000),
    status: 'success' as const,
  },
  {
    id: '4',
    type: 'message' as const,
    title: 'AI analysis started',
    description: 'Document queued for AI review',
    timestamp: new Date(Date.now() - 45 * 60 * 60 * 1000),
    status: 'pending' as const,
  },
  {
    id: '5',
    type: 'message' as const,
    title: 'AI analysis completed',
    description: 'Initial review complete, 3 issues identified',
    timestamp: new Date(Date.now() - 44 * 60 * 60 * 1000),
    status: 'success' as const,
  },
  {
    id: '6',
    type: 'document' as const,
    title: 'Additional document uploaded',
    description: 'exhibit-a-pricing.pdf (2 pages)',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: 'success' as const,
  },
  {
    id: '7',
    type: 'message' as const,
    title: 'Follow-up question asked',
    description: 'Clarification requested on IP assignment clause',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
  {
    id: '8',
    type: 'status' as const,
    title: 'Awaiting attorney review',
    description: 'Complex IP issue escalated for human review',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'pending' as const,
  },
]

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MatterTimelinePage({ params }: PageProps) {
  const { id } = await params

  if (id !== '1') {
    notFound()
  }

  return (
    <MatterDetail matter={mockMatter}>
      <Card>
        <CardContent className="p-6">
          <MatterTimeline events={mockEvents} />
        </CardContent>
      </Card>
    </MatterDetail>
  )
}
