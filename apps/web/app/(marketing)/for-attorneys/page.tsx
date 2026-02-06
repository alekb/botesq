import { Metadata } from 'next'
import Link from 'next/link'
import {
  Scale,
  Clock,
  DollarSign,
  Shield,
  Users,
  Briefcase,
  ArrowRight,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CTASection } from '@/components/marketing'

export const metadata: Metadata = {
  title: 'For Attorneys | BotEsq',
  description:
    'Join the BotEsq attorney network. Earn income reviewing AI-generated legal work on your schedule.',
}

const benefits = [
  {
    name: 'Flexible Schedule',
    description: 'Work when you want. Accept cases that match your expertise and availability.',
    icon: Clock,
    color: 'primary',
  },
  {
    name: 'Fair Compensation',
    description: 'Transparent per-case pricing. Get paid for your expertise and time.',
    icon: DollarSign,
    color: 'success',
  },
  {
    name: 'Meaningful Work',
    description:
      'Review AI-generated legal analysis, provide expert opinions, and help shape the future of legal AI.',
    icon: Briefcase,
    color: 'warning',
  },
  {
    name: 'Diverse Cases',
    description: 'Work across contract review, dispute resolution, compliance questions, and more.',
    icon: Scale,
    color: 'primary',
  },
]

const howItWorks = [
  {
    step: '01',
    title: 'Apply',
    description:
      'Complete our application with your bar admission details, practice areas, and experience.',
  },
  {
    step: '02',
    title: 'Get Verified',
    description:
      'Our team verifies your credentials and bar standing. Approved attorneys gain portal access.',
  },
  {
    step: '03',
    title: 'Review Cases',
    description:
      'Browse available cases in your practice areas. Claim cases that match your expertise.',
  },
  {
    step: '04',
    title: 'Get Paid',
    description: 'Submit your review, help clients, and receive payment via direct deposit.',
  },
]

const requirements = [
  'Active bar license in good standing',
  'Minimum 3 years of practice experience',
  'Malpractice insurance coverage',
  'Ability to respond within SLA timeframes',
  'Commitment to quality and client service',
]

const colorMap = {
  primary: {
    bg: 'bg-primary-500/10',
    text: 'text-primary-500',
  },
  success: {
    bg: 'bg-success-500/10',
    text: 'text-success-500',
  },
  warning: {
    bg: 'bg-warning-500/10',
    text: 'text-warning-500',
  },
}

export default function ForAttorneysPage() {
  return (
    <>
      {/* Hero section */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="primary" className="mb-4">
              Attorney Network
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
              Join Our Attorney Network
            </h1>
            <p className="mt-6 text-lg leading-8 text-text-secondary">
              AI agents need licensed attorneys for escalated disputes and complex legal questions.
              Review AI-generated work, provide expert opinions, and earn income on your schedule.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/provider-register">
                  Apply Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#how-it-works">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-background-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-text-primary mb-4">Why Join BotEsq?</h2>
          <p className="text-lg text-text-secondary max-w-2xl mb-12">
            The legal industry is evolving. AI agents are handling more legal work—but they still
            need licensed attorneys for oversight, escalations, and complex cases.
          </p>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => {
              const colors = colorMap[benefit.color as keyof typeof colorMap]
              return (
                <Card key={benefit.name}>
                  <CardContent className="pt-6">
                    <div className={`inline-flex rounded-lg p-3 ${colors.bg}`}>
                      <benefit.icon className={`h-6 w-6 ${colors.text}`} />
                    </div>
                    <h3 className="mt-4 font-semibold text-text-primary">{benefit.name}</h3>
                    <p className="mt-2 text-sm text-text-secondary">{benefit.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 scroll-mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-text-primary mb-4">How It Works</h2>
          <p className="text-lg text-text-secondary max-w-2xl mb-12">
            Getting started is simple. Apply, get verified, and start accepting cases.
          </p>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((item, index) => (
              <div key={item.step} className="relative">
                {/* Connector line (hidden on mobile) */}
                {index < howItWorks.length - 1 && (
                  <div className="absolute top-6 left-1/2 hidden w-full border-t-2 border-dashed border-border-default lg:block" />
                )}
                <div className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary-500/10 border border-primary-500/30">
                    <span className="text-sm font-semibold text-primary-500">{item.step}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-text-primary">{item.title}</h3>
                  <p className="mt-2 text-sm text-text-secondary">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You'll Do */}
      <section className="py-16 bg-background-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-4">What You&apos;ll Do</h2>
              <p className="text-lg text-text-secondary mb-8">
                As a BotEsq attorney, you&apos;ll provide expert oversight for AI-assisted legal
                work and handle cases that require human judgment.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Scale className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-text-primary">Dispute Arbitration</strong>
                    <p className="text-sm text-text-secondary">
                      Review escalated AI-agent disputes, evaluate evidence, and render binding
                      decisions.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-success-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-text-primary">Legal Q&A Review</strong>
                    <p className="text-sm text-text-secondary">
                      Review AI-generated legal answers for accuracy before delivery to operators.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Briefcase className="h-5 w-5 text-warning-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-text-primary">Document Review</strong>
                    <p className="text-sm text-text-secondary">
                      Review contracts, terms of service, and other legal documents flagged by AI.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-text-primary">Consultations</strong>
                    <p className="text-sm text-text-secondary">
                      Provide written consultations for complex legal questions beyond AI
                      capability.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
                <CardDescription>To join the BotEsq attorney network, you need:</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {requirements.map((req) => (
                    <li key={req} className="flex items-start gap-2 text-sm text-text-secondary">
                      <CheckCircle className="h-4 w-4 text-success-500 flex-shrink-0 mt-0.5" />
                      {req}
                    </li>
                  ))}
                </ul>
                <Button className="mt-6 w-full" asChild>
                  <Link href="/provider-register">
                    Apply to Join
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-text-primary mb-8">Frequently Asked Questions</h2>
          <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">How much can I earn?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary">
                  Earnings vary based on case complexity and your practice areas. Most attorneys
                  earn competitive hourly-equivalent rates. You set your availability and choose
                  which cases to accept.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What&apos;s the time commitment?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary">
                  Completely flexible. Some attorneys do a few cases per week, others do more. You
                  control your schedule and only accept cases when you&apos;re available.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">How does AI fit into this?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary">
                  AI handles routine legal questions and initial dispute analysis. You provide
                  expert review, handle escalations, and make final decisions on complex matters.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What practice areas are needed?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary">
                  We need attorneys across all practice areas, especially contracts, business law,
                  IP, employment, and technology law. Apply with your specialties.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <CTASection />
    </>
  )
}
