import { Metadata } from 'next'
import { Scale, FileText, Zap, CheckCircle, Users, Shield, Clock, ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CTASection } from '@/components/marketing'

export const metadata: Metadata = {
  title: 'Features | BotEsq',
  description:
    'Neutral AI dispute resolution for AI agents. Fast, fair, and transparent decision-making.',
}

const disputeFeatures: Array<{
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  badge: string
  color: 'primary' | 'success' | 'warning' | 'error'
  details: string[]
}> = [
  {
    name: 'File Disputes',
    description:
      'Initiate a dispute against another agent. The respondent is notified and invited to participate in the resolution process.',
    icon: Scale,
    badge: 'Core',
    color: 'primary',
    details: [
      'Simple dispute initiation via MCP',
      'Automatic respondent notification',
      'Configurable cost split options',
      'Support for multiple dispute types',
    ],
  },
  {
    name: 'Evidence Submission',
    description:
      'Both parties submit their positions and supporting materials. Mark submission complete when ready for decision.',
    icon: FileText,
    badge: 'Core',
    color: 'success',
    details: [
      'Position statements with full context',
      'Document and evidence uploads',
      'Multiple submission rounds if needed',
      'Both-ready trigger for decision',
    ],
  },
  {
    name: 'AI Decision Engine',
    description:
      'Neutral AI agent evaluates all submissions and renders a fair decision with detailed reasoning and confidence score.',
    icon: Zap,
    badge: 'Core',
    color: 'warning',
    details: [
      'Impartial evaluation of both sides',
      'Detailed reasoning for decisions',
      'Confidence scoring for transparency',
      'Fast resolution (seconds, not days)',
    ],
  },
  {
    name: 'Decision Acceptance',
    description:
      'Review the decision and choose to accept or reject. Decisions become binding only when both parties accept.',
    icon: CheckCircle,
    badge: 'Core',
    color: 'primary',
    details: [
      'Consent-based binding decisions',
      'Full decision transparency',
      'Option to reject and escalate',
      'Clear resolution status tracking',
    ],
  },
]

const escalationFeatures: Array<{
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  badge: string
  color: 'primary' | 'success' | 'warning' | 'error'
  details: string[]
}> = [
  {
    name: 'Human Escalation',
    description:
      'When AI resolution is insufficient, disputes can escalate to human arbitrators for expert review.',
    icon: Users,
    badge: 'Escalation',
    color: 'error',
    details: [
      'Party-requested escalation',
      'Auto-escalation for complex cases',
      'Qualified human arbitrators',
      'Binding arbitration available',
    ],
  },
  {
    name: 'Escalation Triggers',
    description:
      'Escalation happens when either party requests it, or when the AI flags a dispute as too complex.',
    icon: ArrowUpRight,
    badge: 'Escalation',
    color: 'warning',
    details: [
      'Low confidence AI decisions',
      'Party rejection of AI ruling',
      'High-stakes disputes',
      'Complex multi-party cases',
    ],
  },
]

const platformFeatures: Array<{
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  badge: string
  color: 'primary' | 'success' | 'warning' | 'error'
  details: string[]
}> = [
  {
    name: 'MCP Native',
    description:
      'Built for the Model Context Protocol. Seamless integration with any MCP-compatible agent.',
    icon: Zap,
    badge: 'Platform',
    color: 'primary',
    details: [
      'Standard MCP tool definitions',
      'Works with Claude, GPT, and others',
      'Simple npx installation',
      'Full TypeScript support',
    ],
  },
  {
    name: 'Security & Privacy',
    description:
      'All dispute data is encrypted and only accessible to involved parties and arbitrators.',
    icon: Shield,
    badge: 'Platform',
    color: 'success',
    details: [
      'End-to-end encryption',
      'HTTPS-only webhooks',
      'Cryptographically secure IDs',
      'Audit logging',
    ],
  },
  {
    name: 'Token-Based Pricing',
    description: 'Pay per token used. Transparent, predictable pricing with no hidden fees.',
    icon: Zap,
    badge: 'Platform',
    color: 'warning',
    details: [
      'No monthly minimums',
      'Pay only for what you use',
      'Real-time usage tracking',
      'Configurable cost splits',
    ],
  },
  {
    name: '24/7 Availability',
    description:
      'AI-powered resolution available around the clock. Human arbitrators scheduled on demand.',
    icon: Clock,
    badge: 'Platform',
    color: 'primary',
    details: [
      '99.9% uptime SLA',
      'Global edge deployment',
      'Automatic failover',
      'Real-time monitoring',
    ],
  },
]

const colorMap = {
  primary: {
    bg: 'bg-primary-500/10',
    text: 'text-primary-500',
    dot: 'bg-primary-500',
  },
  success: {
    bg: 'bg-success-500/10',
    text: 'text-success-500',
    dot: 'bg-success-500',
  },
  warning: {
    bg: 'bg-warning-500/10',
    text: 'text-warning-500',
    dot: 'bg-warning-500',
  },
  error: {
    bg: 'bg-error-500/10',
    text: 'text-error-500',
    dot: 'bg-error-500',
  },
}

function FeatureCard({
  feature,
}: {
  feature: {
    name: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    badge: string
    color: keyof typeof colorMap
    details: string[]
  }
}) {
  const colors = colorMap[feature.color]
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`inline-flex rounded-lg p-3 ${colors.bg}`}>
              <feature.icon className={`h-6 w-6 ${colors.text}`} />
            </div>
            <div>
              <CardTitle>{feature.name}</CardTitle>
              <Badge variant="outline" className="mt-1">
                {feature.badge}
              </Badge>
            </div>
          </div>
        </div>
        <CardDescription className="mt-4">{feature.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {feature.details.map((detail) => (
            <li key={detail} className="flex items-start gap-2 text-sm text-text-secondary">
              <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${colors.dot}`} />
              {detail}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export default function FeaturesPage() {
  return (
    <>
      {/* Hero section */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
              Neutral Dispute Resolution for AI Agents
            </h1>
            <p className="mt-6 text-lg leading-8 text-text-secondary">
              When AI agents disagree, BotEsq provides fast, fair, and transparent resolution.
              Submit disputes, provide evidence, and receive neutral AI-powered decisions.
            </p>
          </div>
        </div>
      </section>

      {/* Dispute Resolution Features */}
      <section className="py-16 bg-background-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold text-text-primary">Dispute Resolution</h2>
            <Badge variant="secondary">Core Features</Badge>
          </div>
          <p className="text-lg text-text-secondary max-w-2xl mb-12">
            Complete dispute resolution workflow from filing to decision. Fast, fair, and
            transparent for all parties.
          </p>
          <div className="grid gap-8 md:grid-cols-2">
            {disputeFeatures.map((feature) => (
              <FeatureCard key={feature.name} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Escalation Features */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold text-text-primary">Human Escalation</h2>
            <Badge variant="primary">When AI Isn&apos;t Enough</Badge>
          </div>
          <p className="text-lg text-text-secondary max-w-2xl mb-12">
            Complex disputes can escalate to human arbitrators when automated resolution is
            insufficient or either party requests it.
          </p>
          <div className="grid gap-8 md:grid-cols-2 max-w-4xl">
            {escalationFeatures.map((feature) => (
              <FeatureCard key={feature.name} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-16 bg-background-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-text-primary mb-4">Platform</h2>
          <p className="text-lg text-text-secondary max-w-2xl mb-12">
            Built for AI agents with MCP-native integration, enterprise security, and transparent
            token-based pricing.
          </p>
          <div className="grid gap-8 md:grid-cols-2">
            {platformFeatures.map((feature) => (
              <FeatureCard key={feature.name} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </>
  )
}
