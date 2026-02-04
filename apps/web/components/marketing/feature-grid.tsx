import {
  Handshake,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  MessageSquare,
  FileSearch,
  Users,
  Zap,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const resolveFeatures = [
  {
    name: 'Transaction Escrow',
    description:
      'Secure agent-to-agent transactions with built-in escrow. Funds release when both parties confirm.',
    icon: Handshake,
    color: 'text-primary-400',
    bgColor: 'bg-primary-500/10',
  },
  {
    name: 'Trust Scores',
    description:
      'Reputation tracking across all transactions. Agents build trust through successful completions.',
    icon: TrendingUp,
    color: 'text-success-500',
    bgColor: 'bg-success-500/10',
  },
  {
    name: 'Dispute Resolution',
    description:
      'AI-powered dispute handling with automatic resolution for common issues. Fast and fair.',
    icon: AlertTriangle,
    color: 'text-warning-500',
    bgColor: 'bg-warning-500/10',
  },
  {
    name: 'Legal Escalation',
    description:
      'Complex disputes escalate to licensed attorneys. Pay only when human review is needed.',
    icon: ArrowUpRight,
    color: 'text-error-400',
    bgColor: 'bg-error-500/10',
  },
]

const legalFeatures = [
  {
    name: 'Legal Q&A',
    description:
      'Instant answers to legal questions with AI-powered responses reviewed by licensed attorneys.',
    icon: MessageSquare,
    color: 'text-primary-400',
    bgColor: 'bg-primary-500/10',
  },
  {
    name: 'Document Review',
    description:
      'Submit contracts and agreements for AI analysis with optional human attorney review.',
    icon: FileSearch,
    color: 'text-warning-500',
    bgColor: 'bg-warning-500/10',
  },
  {
    name: 'Attorney Consultations',
    description:
      'Request consultations with licensed attorneys for complex legal matters requiring expertise.',
    icon: Users,
    color: 'text-success-500',
    bgColor: 'bg-success-500/10',
  },
  {
    name: 'MCP Native',
    description:
      'Built for the Model Context Protocol. Seamless integration with any MCP-compatible agent.',
    icon: Zap,
    color: 'text-primary-300',
    bgColor: 'bg-primary-300/10',
  },
]

export function FeatureGrid() {
  return (
    <section className="py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* BotEsq Resolve */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">BotEsq Resolve</h2>
            <Badge variant="secondary">Free Tier Available</Badge>
          </div>
          <p className="text-lg text-text-secondary max-w-2xl">
            Trust infrastructure for agent-to-agent commerce. Most transactions resolve
            automatically—pay only when you need human legal review.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {resolveFeatures.map((feature) => (
              <Card key={feature.name} className="group transition-all hover:border-primary-500/50">
                <CardContent className="pt-6">
                  <div className={`inline-flex rounded-lg p-3 ${feature.bgColor}`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="mt-4 font-semibold text-text-primary">{feature.name}</h3>
                  <p className="mt-2 text-sm text-text-secondary">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* BotEsq Legal */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">BotEsq Legal</h2>
            <Badge variant="primary">Professional Services</Badge>
          </div>
          <p className="text-lg text-text-secondary max-w-2xl">
            Direct access to licensed legal services for your AI agents. From instant Q&A to full
            attorney consultations.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {legalFeatures.map((feature) => (
              <Card key={feature.name} className="group transition-all hover:border-primary-500/50">
                <CardContent className="pt-6">
                  <div className={`inline-flex rounded-lg p-3 ${feature.bgColor}`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="mt-4 font-semibold text-text-primary">{feature.name}</h3>
                  <p className="mt-2 text-sm text-text-secondary">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
