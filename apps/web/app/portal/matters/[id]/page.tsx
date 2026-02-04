import { notFound } from 'next/navigation'
import { MatterDetail } from '@/components/portal/matters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, MessageSquare, AlertCircle } from 'lucide-react'
import { formatCredits } from '@/lib/utils/format'

// Mock matter data - will be replaced with real data fetching
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

// Mock stats
const mockStats = {
  documents: 3,
  messages: 12,
  creditsUsed: 8500,
  aiResponses: 5,
}

// Mock AI insights
const mockInsights = [
  {
    id: '1',
    type: 'warning' as const,
    title: 'IP Assignment Clause',
    description:
      'The IP assignment clause may be overly broad. Recommend narrowing scope to work product only.',
  },
  {
    id: '2',
    type: 'info' as const,
    title: 'Liability Cap',
    description:
      'Liability is capped at 12 months of fees, which is standard for this type of agreement.',
  },
  {
    id: '3',
    type: 'success' as const,
    title: 'Termination Rights',
    description: 'Termination for convenience clause is present with 30-day notice period.',
  },
]

const insightIcons = {
  warning: AlertCircle,
  info: MessageSquare,
  success: FileText,
}

const insightColors = {
  warning: 'border-warning-500 bg-warning-500/10',
  info: 'border-primary-500 bg-primary-500/10',
  success: 'border-success-500 bg-success-500/10',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MatterDetailPage({ params }: PageProps) {
  const { id } = await params

  // In real implementation, fetch matter by id
  if (id !== '1') {
    notFound()
  }

  return (
    <MatterDetail matter={mockMatter}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockInsights.map((insight) => {
                const Icon = insightIcons[insight.type]
                return (
                  <div
                    key={insight.id}
                    className={`p-4 rounded-lg border-l-4 ${insightColors[insight.type]}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-text-primary">{insight.title}</p>
                        <p className="text-sm text-text-secondary mt-1">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Matter Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-text-secondary">Documents</dt>
                  <dd className="text-sm font-medium text-text-primary">{mockStats.documents}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-text-secondary">Messages</dt>
                  <dd className="text-sm font-medium text-text-primary">{mockStats.messages}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-text-secondary">AI Responses</dt>
                  <dd className="text-sm font-medium text-text-primary">{mockStats.aiResponses}</dd>
                </div>
                <div className="flex justify-between pt-3 border-t border-border-default">
                  <dt className="text-sm text-text-secondary">Credits Used</dt>
                  <dd className="text-sm font-medium text-primary-500">
                    {formatCredits(mockStats.creditsUsed)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </MatterDetail>
  )
}
