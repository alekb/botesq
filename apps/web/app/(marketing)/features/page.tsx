import { Metadata } from 'next'
import {
  MessageSquare,
  FolderOpen,
  FileSearch,
  Users,
  Shield,
  Zap,
  Clock,
  Scale,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CTASection } from '@/components/marketing'

export const metadata: Metadata = {
  title: 'Features | BotEsq',
  description: 'Explore the complete suite of legal services available through BotEsq.',
}

const features = [
  {
    category: 'Core Services',
    items: [
      {
        name: 'Legal Q&A',
        description:
          'Get instant answers to legal questions. Our AI provides initial analysis, with human attorney review for complex matters.',
        icon: MessageSquare,
        badge: 'Instant',
        details: [
          'AI-powered initial response in milliseconds',
          'Confidence scoring for answer reliability',
          'Automatic escalation to human attorneys',
          'Citation of relevant legal authorities',
        ],
      },
      {
        name: 'Matter Management',
        description:
          'Full lifecycle management for legal matters from creation through resolution.',
        icon: FolderOpen,
        badge: 'Core',
        details: [
          'Create and track legal matters',
          'Retainer agreement generation',
          'Status tracking and updates',
          'Document attachment and organization',
        ],
      },
      {
        name: 'Document Review',
        description:
          'Submit contracts, agreements, and legal documents for AI-powered analysis with optional human review.',
        icon: FileSearch,
        badge: 'AI + Human',
        details: [
          'Automatic issue identification',
          'Risk assessment and scoring',
          'Key terms extraction',
          'Revision suggestions',
        ],
      },
      {
        name: 'Attorney Consultations',
        description: 'Request consultations with licensed attorneys for complex legal matters.',
        icon: Users,
        badge: 'Premium',
        details: [
          'Standard and urgent priority options',
          'Written consultation responses',
          'Follow-up question support',
          'Attorney-client privilege protection',
        ],
      },
    ],
  },
  {
    category: 'Platform Features',
    items: [
      {
        name: 'Credit System',
        description: 'Simple pay-as-you-go pricing with transparent credit costs for each service.',
        icon: Scale,
        badge: 'Flexible',
        details: [
          'No monthly minimums',
          'Volume discounts available',
          'Real-time balance tracking',
          'Automatic low-balance alerts',
        ],
      },
      {
        name: 'MCP Integration',
        description: 'Native Model Context Protocol support for seamless AI agent integration.',
        icon: Zap,
        badge: 'Native',
        details: [
          'Standard MCP tool definitions',
          'Prompt templates included',
          'Resource endpoints',
          'Works with any MCP client',
        ],
      },
      {
        name: 'Security & Compliance',
        description: 'Enterprise-grade security with full attorney-client privilege protection.',
        icon: Shield,
        badge: 'Enterprise',
        details: [
          'End-to-end encryption',
          'SOC 2 Type II compliance',
          'Data residency options',
          'Audit logging',
        ],
      },
      {
        name: '24/7 Availability',
        description: 'AI-powered services available around the clock with guaranteed uptime.',
        icon: Clock,
        badge: 'Always On',
        details: [
          '99.9% uptime SLA',
          'Global edge deployment',
          'Automatic failover',
          'Real-time monitoring',
        ],
      },
    ],
  },
]

export default function FeaturesPage() {
  return (
    <>
      {/* Hero section */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
              Complete Legal Services for AI
            </h1>
            <p className="mt-6 text-lg leading-8 text-text-secondary">
              Everything your AI agents need to handle legal operations. From instant Q&A to full
              matter management and attorney consultations.
            </p>
          </div>
        </div>
      </section>

      {/* Feature sections */}
      {features.map((section) => (
        <section key={section.category} className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-text-primary mb-12">{section.category}</h2>
            <div className="grid gap-8 md:grid-cols-2">
              {section.items.map((feature) => (
                <Card key={feature.name} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="inline-flex rounded-lg bg-primary-500/10 p-3">
                          <feature.icon className="h-6 w-6 text-primary-500" />
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
                        <li
                          key={detail}
                          className="flex items-start gap-2 text-sm text-text-secondary"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      ))}

      <CTASection />
    </>
  )
}
