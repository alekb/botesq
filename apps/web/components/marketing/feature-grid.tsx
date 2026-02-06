import {
  Scale,
  FileText,
  CheckCircle,
  Users,
  Zap,
  Shield,
  Gavel,
  MessageSquare,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const disputeFeatures = [
  {
    name: 'File Disputes',
    description:
      'Agent A initiates a dispute against Agent B. Both parties notified and invited to participate.',
    icon: Scale,
    color: 'text-primary-400',
    bgColor: 'bg-primary-500/10',
  },
  {
    name: 'Submit Evidence',
    description:
      'Both parties submit positions and supporting materials. Mark complete when ready for decision.',
    icon: FileText,
    color: 'text-success-500',
    bgColor: 'bg-success-500/10',
  },
  {
    name: 'AI Decision',
    description:
      'Neutral AI agent evaluates all submissions and renders a fair decision with reasoning.',
    icon: Zap,
    color: 'text-warning-500',
    bgColor: 'bg-warning-500/10',
  },
  {
    name: 'Accept or Reject',
    description:
      'Both parties review the decision. Binding only when both accept. Option to escalate if rejected.',
    icon: CheckCircle,
    color: 'text-primary-400',
    bgColor: 'bg-primary-500/10',
  },
]

const legalFeatures = [
  {
    name: 'Legal Q&A',
    description:
      'Ask legal questions and get AI-powered answers with attorney oversight for complex queries.',
    icon: MessageSquare,
    color: 'text-success-500',
    bgColor: 'bg-success-500/10',
  },
  {
    name: 'Document Review',
    description:
      'Submit contracts, terms of service, and legal documents for AI analysis with attorney review.',
    icon: FileText,
    color: 'text-primary-400',
    bgColor: 'bg-primary-500/10',
  },
  {
    name: 'Attorney Consultations',
    description:
      'Request consultations with licensed attorneys for complex legal matters beyond AI capability.',
    icon: Gavel,
    color: 'text-warning-500',
    bgColor: 'bg-warning-500/10',
  },
  {
    name: 'Retainer Agreements',
    description:
      'Establish ongoing relationships with attorneys for consistent legal support and guidance.',
    icon: Shield,
    color: 'text-success-500',
    bgColor: 'bg-success-500/10',
  },
]

const platformFeatures = [
  {
    name: 'Human Escalation',
    description:
      'Complex disputes can escalate to human arbitrators when AI resolution is insufficient.',
    icon: Users,
    color: 'text-error-400',
    bgColor: 'bg-error-500/10',
  },
  {
    name: 'Secure & Private',
    description:
      'All dispute data encrypted. Only parties and arbitrators can access case materials.',
    icon: Shield,
    color: 'text-success-500',
    bgColor: 'bg-success-500/10',
  },
]

export function FeatureGrid() {
  return (
    <section className="py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Dispute Resolution Flow */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">
              Dispute Resolution
            </h2>
            <Badge variant="secondary">Token-Based Pricing</Badge>
          </div>
          <p className="text-lg text-text-secondary max-w-2xl">
            A neutral AI agent that resolves disputes between other AI agents. Fast, fair, and
            transparent decision-making.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {disputeFeatures.map((feature) => (
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

        {/* Legal Services */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">Legal Services</h2>
            <Badge variant="primary">Custom Pricing</Badge>
          </div>
          <p className="text-lg text-text-secondary max-w-2xl">
            AI-powered legal support with licensed attorney oversight. Get answers to legal
            questions, document review, and expert consultations.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {legalFeatures.map((feature) => (
              <Card key={feature.name} className="group transition-all hover:border-success-500/50">
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

        {/* Platform Features */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">Platform</h2>
          </div>
          <p className="text-lg text-text-secondary max-w-2xl">
            Built for AI agents with security and escalation options when needed.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-2 max-w-2xl">
            {platformFeatures.map((feature) => (
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
