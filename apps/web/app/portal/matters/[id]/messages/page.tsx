import { notFound } from 'next/navigation'
import { MatterDetail } from '@/components/portal/matters'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import { formatDateTime } from '@/lib/utils/format'
import { Bot, User, Scale, MessageSquare } from 'lucide-react'

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

// Mock messages
const mockMessages = [
  {
    id: '1',
    role: 'AGENT' as const,
    content:
      'I need a review of this software licensing agreement. Please focus on IP rights, liability caps, and termination clauses.',
    createdAt: new Date(Date.now() - 46 * 60 * 60 * 1000),
  },
  {
    id: '2',
    role: 'SYSTEM' as const,
    content:
      'Document received: software-license-agreement-v2.pdf (12 pages). Starting analysis...',
    createdAt: new Date(Date.now() - 46 * 60 * 60 * 1000 + 30000),
  },
  {
    id: '3',
    role: 'AI' as const,
    content: `I've completed the initial review of the software licensing agreement. Here are my key findings:

**IP Rights (Section 4)**
- The IP assignment clause is quite broad and may transfer more rights than intended
- Recommendation: Narrow the scope to work product created specifically under this agreement

**Liability (Section 8)**
- Liability is capped at 12 months of fees
- This is standard for SaaS agreements
- Carve-outs for IP infringement and data breaches are appropriate

**Termination (Section 10)**
- 30-day termination for convenience is included
- Data export rights are preserved for 60 days post-termination

Confidence: 92%
*Note: I recommend attorney review for the IP assignment clause due to its complexity.*`,
    createdAt: new Date(Date.now() - 44 * 60 * 60 * 1000),
  },
  {
    id: '4',
    role: 'AGENT' as const,
    content:
      'Can you elaborate on what changes would be needed to the IP assignment clause to make it more favorable?',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
  {
    id: '5',
    role: 'AI' as const,
    content: `Here are specific recommendations for the IP assignment clause:

**Current Language (Problem)**
"Customer hereby assigns to Provider all right, title, and interest in and to any improvements, modifications, or derivative works..."

**Suggested Revision**
"Customer hereby grants to Provider a non-exclusive, royalty-free license to use any improvements, modifications, or derivative works solely in connection with the Software. Customer retains all ownership rights in any pre-existing intellectual property."

**Key Changes:**
1. Change from assignment to license grant
2. Add non-exclusive and royalty-free terms
3. Preserve customer's pre-existing IP
4. Limit scope to use "in connection with the Software"

This approach protects your innovations while still allowing the provider to improve their product.`,
    createdAt: new Date(Date.now() - 11 * 60 * 60 * 1000),
  },
]

const roleConfig = {
  AGENT: { label: 'AI Agent', icon: Bot, bgColor: 'bg-primary-500/10' },
  OPERATOR: { label: 'Operator', icon: User, bgColor: 'bg-background-tertiary' },
  SYSTEM: { label: 'System', icon: MessageSquare, bgColor: 'bg-background-tertiary' },
  AI: { label: 'BotEsq AI', icon: Scale, bgColor: 'bg-success-500/10' },
  ATTORNEY: { label: 'Attorney', icon: Scale, bgColor: 'bg-secondary-500/10' },
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MatterMessagesPage({ params }: PageProps) {
  const { id } = await params

  if (id !== '1') {
    notFound()
  }

  return (
    <MatterDetail matter={mockMatter}>
      <Card>
        <CardContent className="p-6">
          {mockMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-10 w-10 text-text-tertiary mb-3" />
              <p className="text-text-secondary">No messages yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {mockMessages.map((message) => {
                const config = roleConfig[message.role]
                const Icon = config.icon
                return (
                  <div key={message.id} className="flex gap-4">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0',
                        config.bgColor
                      )}
                    >
                      <Icon className="h-5 w-5 text-text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-text-primary">{config.label}</span>
                        <span className="text-xs text-text-tertiary">
                          {formatDateTime(message.createdAt)}
                        </span>
                      </div>
                      <div className="prose prose-invert prose-sm max-w-none">
                        <div className="text-text-secondary whitespace-pre-wrap">
                          {message.content}
                        </div>
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
