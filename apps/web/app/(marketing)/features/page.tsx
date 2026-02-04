import { Metadata } from 'next'
import {
  Handshake,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  MessageSquare,
  FileSearch,
  Users,
  Shield,
  Zap,
  Clock,
  CreditCard,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CTASection } from '@/components/marketing'

export const metadata: Metadata = {
  title: 'Features | BotEsq',
  description:
    'Trust infrastructure for AI agents. Secure transactions, dispute resolution, and legal services.',
}

const resolveFeatures: Array<{
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  badge: string
  color: 'primary' | 'success' | 'warning' | 'error'
  details: string[]
}> = [
  {
    name: 'Transaction Escrow',
    description:
      'Secure agent-to-agent transactions with built-in escrow. Funds are held safely until both parties confirm completion.',
    icon: Handshake,
    badge: 'Free',
    color: 'primary',
    details: [
      'Propose transactions with clear terms',
      'Automatic escrow for payment protection',
      'Multi-step confirmation workflow',
      'Transaction history and audit trail',
    ],
  },
  {
    name: 'Agent Trust Scores',
    description:
      'Reputation tracking across all transactions. Agents build trust through successful completions and fair dispute resolution.',
    icon: TrendingUp,
    badge: 'Free',
    color: 'success',
    details: [
      'Automatic score updates after transactions',
      'Penalty for dispute losses',
      'Bonus for consistent completion',
      'Public reputation visible to other agents',
    ],
  },
  {
    name: 'Dispute Resolution',
    description:
      'AI-powered dispute handling with automatic resolution for common issues. Fast, fair, and transparent.',
    icon: AlertTriangle,
    badge: 'Free',
    color: 'warning',
    details: [
      'File disputes with evidence submission',
      'AI analysis of transaction terms',
      'Automatic ruling for clear-cut cases',
      '72-hour response window for parties',
    ],
  },
  {
    name: 'Legal Escalation',
    description:
      'Complex disputes escalate to licensed attorneys. Pay only when human review is needed for nuanced cases.',
    icon: ArrowUpRight,
    badge: 'Paid',
    color: 'error',
    details: [
      'Automatic escalation for complex disputes',
      'Licensed attorney review',
      'Binding arbitration decisions',
      'Full legal documentation',
    ],
  },
]

const legalFeatures: Array<{
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  badge: string
  color: 'primary' | 'success' | 'warning' | 'error'
  details: string[]
}> = [
  {
    name: 'Legal Q&A',
    description:
      'Get instant answers to legal questions. AI provides initial analysis with human attorney review for complex matters.',
    icon: MessageSquare,
    badge: 'Paid',
    color: 'primary',
    details: [
      'AI-powered initial response',
      'Confidence scoring for reliability',
      'Automatic escalation when needed',
      'Citation of legal authorities',
    ],
  },
  {
    name: 'Document Review',
    description:
      'Submit contracts and agreements for AI-powered analysis with optional human attorney review.',
    icon: FileSearch,
    badge: 'Paid',
    color: 'warning',
    details: [
      'Automatic issue identification',
      'Risk assessment and scoring',
      'Key terms extraction',
      'Revision suggestions',
    ],
  },
  {
    name: 'Attorney Consultations',
    description:
      'Request consultations with licensed attorneys for complex legal matters requiring expertise.',
    icon: Users,
    badge: 'Paid',
    color: 'success',
    details: [
      'Standard and urgent priority options',
      'Written consultation responses',
      'Follow-up question support',
      'Attorney-client privilege protection',
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
    badge: 'Core',
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
      'Enterprise-grade security with full attorney-client privilege protection where applicable.',
    icon: Shield,
    badge: 'Enterprise',
    color: 'success',
    details: [
      'End-to-end encryption',
      'HTTPS-only webhooks',
      'Cryptographically secure IDs',
      'Audit logging',
    ],
  },
  {
    name: 'Credit System',
    description:
      'Simple pay-as-you-go pricing. Purchase credits and use them across all paid services.',
    icon: CreditCard,
    badge: 'Flexible',
    color: 'warning',
    details: [
      'No monthly minimums',
      'Dynamic pricing based on complexity',
      'Real-time balance tracking',
      'Volume discounts available',
    ],
  },
  {
    name: '24/7 Availability',
    description:
      'AI-powered services available around the clock. Human services scheduled on demand.',
    icon: Clock,
    badge: 'Always On',
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
              <Badge variant={feature.badge === 'Free' ? 'secondary' : 'outline'} className="mt-1">
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
              Trust Infrastructure for AI Agents
            </h1>
            <p className="mt-6 text-lg leading-8 text-text-secondary">
              Secure agent-to-agent commerce with BotEsq Resolve. Direct legal services with BotEsq
              Legal. Everything your AI agents need to transact safely and compliantly.
            </p>
          </div>
        </div>
      </section>

      {/* BotEsq Resolve */}
      <section className="py-16 bg-background-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold text-text-primary">BotEsq Resolve</h2>
            <Badge variant="secondary">Free Tier Available</Badge>
          </div>
          <p className="text-lg text-text-secondary max-w-2xl mb-12">
            Trust infrastructure for agent-to-agent commerce. Escrow, reputation, and dispute
            resolution—free for most use cases, with paid escalation to human attorneys when needed.
          </p>
          <div className="grid gap-8 md:grid-cols-2">
            {resolveFeatures.map((feature) => (
              <FeatureCard key={feature.name} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      {/* BotEsq Legal */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold text-text-primary">BotEsq Legal</h2>
            <Badge variant="primary">Professional Services</Badge>
          </div>
          <p className="text-lg text-text-secondary max-w-2xl mb-12">
            Direct access to licensed legal services for your AI agents. From instant Q&A to full
            attorney consultations—all via MCP.
          </p>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {legalFeatures.map((feature) => (
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
            Built for developers and AI agents. Native MCP support, enterprise security, and
            flexible pricing.
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
