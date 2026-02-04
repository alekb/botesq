import { notFound } from 'next/navigation'
import { MatterDetail } from '@/components/portal/matters'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Download, Eye, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils/format'

// Mock matter data
const mockMatter = {
  id: '1',
  externalId: 'MTR-001',
  title: 'Software Licensing Agreement Review',
  description: 'Review and analysis of a software licensing agreement for a SaaS product.',
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

// Mock documents
const mockDocuments = [
  {
    id: '1',
    filename: 'software-license-agreement-v2.pdf',
    mimeType: 'application/pdf',
    fileSize: 245000,
    pageCount: 12,
    analysisStatus: 'COMPLETED' as const,
    uploadedAt: new Date(Date.now() - 46 * 60 * 60 * 1000),
    confidenceScore: 0.92,
    attorneyReviewRecommended: true,
  },
  {
    id: '2',
    filename: 'exhibit-a-pricing.pdf',
    mimeType: 'application/pdf',
    fileSize: 48000,
    pageCount: 2,
    analysisStatus: 'COMPLETED' as const,
    uploadedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    confidenceScore: 0.98,
    attorneyReviewRecommended: false,
  },
  {
    id: '3',
    filename: 'amendment-draft.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSize: 32000,
    pageCount: 3,
    analysisStatus: 'PROCESSING' as const,
    uploadedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    confidenceScore: null,
    attorneyReviewRecommended: false,
  },
]

const analysisStatusConfig = {
  PENDING: { label: 'Pending', variant: 'default' as const, icon: Clock },
  PROCESSING: { label: 'Processing', variant: 'warning' as const, icon: Clock },
  COMPLETED: { label: 'Analyzed', variant: 'success' as const, icon: CheckCircle },
  FAILED: { label: 'Failed', variant: 'error' as const, icon: AlertCircle },
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MatterDocumentsPage({ params }: PageProps) {
  const { id } = await params

  if (id !== '1') {
    notFound()
  }

  return (
    <MatterDetail matter={mockMatter}>
      <Card>
        <CardContent className="p-6">
          {mockDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-10 w-10 text-text-tertiary mb-3" />
              <p className="text-text-secondary">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mockDocuments.map((doc) => {
                const statusConfig = analysisStatusConfig[doc.analysisStatus]
                const StatusIcon = statusConfig.icon
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border-default hover:border-border-hover transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="rounded-lg bg-background-tertiary p-3 flex-shrink-0">
                        <FileText className="h-5 w-5 text-primary-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary truncate">{doc.filename}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-text-tertiary">
                          <span>{formatFileSize(doc.fileSize)}</span>
                          {doc.pageCount && <span>{doc.pageCount} pages</span>}
                          <span>{formatRelativeTime(doc.uploadedAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={statusConfig.variant}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        {doc.attorneyReviewRecommended && (
                          <Badge variant="warning">Attorney Review</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </MatterDetail>
  )
}
