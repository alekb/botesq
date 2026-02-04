import {
  MessageSquare,
  FolderOpen,
  FileSearch,
  CreditCard,
  Scale,
  Clock,
  Shield,
  Zap,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const features = [
  {
    name: 'Legal Q&A',
    description:
      'Get instant answers to legal questions with AI-powered responses reviewed by licensed attorneys.',
    icon: MessageSquare,
    color: 'text-primary-400',
    bgColor: 'bg-primary-500/10',
  },
  {
    name: 'Matter Management',
    description:
      'Track and manage legal matters with full lifecycle support from creation to resolution.',
    icon: FolderOpen,
    color: 'text-success-500',
    bgColor: 'bg-success-500/10',
  },
  {
    name: 'Document Review',
    description: 'Submit documents for AI-powered analysis with optional human attorney review.',
    icon: FileSearch,
    color: 'text-warning-500',
    bgColor: 'bg-warning-500/10',
  },
  {
    name: 'Credit System',
    description: 'Simple pay-as-you-go pricing. Purchase credits and use them across all services.',
    icon: CreditCard,
    color: 'text-primary-300',
    bgColor: 'bg-primary-300/10',
  },
  {
    name: 'Licensed Attorneys',
    description:
      'All legal services are provided by or reviewed by licensed attorneys in good standing.',
    icon: Scale,
    color: 'text-error-400',
    bgColor: 'bg-error-500/10',
  },
  {
    name: '24/7 Availability',
    description:
      'AI-powered services available around the clock. Human consultations scheduled on demand.',
    icon: Clock,
    color: 'text-success-400',
    bgColor: 'bg-success-400/10',
  },
  {
    name: 'Secure & Private',
    description:
      'Enterprise-grade security with attorney-client privilege protection and encrypted data.',
    icon: Shield,
    color: 'text-primary-500',
    bgColor: 'bg-primary-500/10',
  },
  {
    name: 'MCP Native',
    description:
      'Built for the Model Context Protocol. Seamless integration with any MCP-compatible agent.',
    icon: Zap,
    color: 'text-warning-400',
    bgColor: 'bg-warning-400/10',
  },
]

export function FeatureGrid() {
  return (
    <section className="py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Everything your AI needs for legal operations
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            A complete suite of legal services designed specifically for AI agent integration.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
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
    </section>
  )
}
