import { Metadata } from 'next'
import Link from 'next/link'
import { Scale, DollarSign, Clock, Shield, Users, Zap, CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'For Attorneys | BotEsq',
  description:
    'Join BotEsq as a legal services provider. Flexible hours, competitive compensation, and the opportunity to shape the future of AI-assisted legal services.',
}

const benefits = [
  {
    name: 'Flexible Schedule',
    description:
      'Work when it suits you. Accept requests on your own schedule with no minimum hours required.',
    icon: Clock,
  },
  {
    name: 'Competitive Compensation',
    description:
      'Earn competitive rates for your expertise. Get paid for consultations, document reviews, and dispute resolutions.',
    icon: DollarSign,
  },
  {
    name: 'AI-Assisted Workflow',
    description:
      'Our AI handles initial analysis and drafts responses for your review. Focus on the legal expertise, not the paperwork.',
    icon: Zap,
  },
  {
    name: 'Diverse Practice',
    description:
      'Handle a variety of legal matters across jurisdictions. Expand your experience while helping AI agents navigate legal complexities.',
    icon: Users,
  },
  {
    name: 'Malpractice Coverage',
    description:
      'BotEsq provides professional liability coverage for work performed on the platform.',
    icon: Shield,
  },
  {
    name: 'Growing Market',
    description:
      'Be at the forefront of AI-assisted legal services. The demand for attorney review of AI agent transactions is growing rapidly.',
    icon: Scale,
  },
]

const requirements = [
  'Active bar membership in good standing in at least one U.S. jurisdiction',
  'Minimum 3 years of legal practice experience',
  'Malpractice insurance (or willingness to be covered under BotEsq policy)',
  'Ability to respond to standard requests within 24-48 hours',
  'Familiarity with technology and online platforms',
  'Commitment to quality and professional ethics',
]

const workTypes = [
  {
    title: 'Legal Q&A Review',
    description:
      'Review AI-generated responses to legal questions. Verify accuracy, add nuance, and ensure compliance with jurisdictional requirements.',
    time: '5-15 minutes per review',
  },
  {
    title: 'Document Analysis',
    description:
      'Review contracts, agreements, and legal documents. Identify issues, assess risks, and provide recommendations.',
    time: '15-60 minutes per document',
  },
  {
    title: 'Consultations',
    description:
      'Provide written consultations on complex legal matters. Answer follow-up questions and offer expert guidance.',
    time: '30-90 minutes per consultation',
  },
  {
    title: 'Dispute Resolution',
    description:
      'Arbitrate disputes between AI agents when automated resolution fails. Review evidence, apply legal principles, and issue binding decisions.',
    time: '1-3 hours per dispute',
  },
]

export default function ForAttorneysPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="primary" className="mb-4">
              Join Our Network
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
              Become a BotEsq Legal Provider
            </h1>
            <p className="mt-6 text-lg leading-8 text-text-secondary">
              Join a growing network of attorneys providing legal services to AI agents. Flexible
              hours, competitive compensation, and the opportunity to shape the future of
              AI-assisted legal services.
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
      <section className="py-20 bg-background-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-text-primary">
              Why Join BotEsq?
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              Benefits of becoming a legal services provider on our platform.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <Card key={benefit.name}>
                <CardHeader>
                  <div className="inline-flex rounded-lg bg-primary-500/10 p-3 w-fit">
                    <benefit.icon className="h-6 w-6 text-primary-500" />
                  </div>
                  <CardTitle className="mt-4">{benefit.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{benefit.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-text-primary">How It Works</h2>
            <p className="mt-4 text-lg text-text-secondary">
              The types of work available on the BotEsq platform.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {workTypes.map((work) => (
              <Card key={work.title}>
                <CardHeader>
                  <CardTitle>{work.title}</CardTitle>
                  <Badge variant="secondary" className="w-fit">
                    {work.time}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-text-secondary">{work.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-20 bg-background-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-text-primary">Requirements</h2>
              <p className="mt-4 text-lg text-text-secondary">
                What we look for in legal services providers.
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <ul className="space-y-4">
                  {requirements.map((requirement) => (
                    <li key={requirement} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-success-500 flex-shrink-0 mt-0.5" />
                      <span className="text-text-secondary">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Application Process */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-text-primary">
              Application Process
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              Getting started as a BotEsq provider is straightforward.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-4 max-w-4xl mx-auto">
            {[
              {
                step: '1',
                title: 'Apply',
                description: 'Submit your application with credentials',
              },
              {
                step: '2',
                title: 'Verify',
                description: 'We verify your bar status and experience',
              },
              { step: '3', title: 'Onboard', description: 'Complete platform training and setup' },
              { step: '4', title: 'Start', description: 'Begin accepting requests and earning' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 text-white font-bold">
                  {item.step}
                </div>
                <h3 className="mt-4 font-semibold text-text-primary">{item.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-background-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 px-8 py-16 sm:px-16 sm:py-24">
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary-500/30 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-primary-400/20 blur-3xl" />

            <div className="relative mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to get started?
              </h2>
              <p className="mt-6 text-lg leading-8 text-primary-100">
                Join the growing network of attorneys providing legal services to AI agents. Apply
                today and start earning on your own schedule.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="bg-white text-primary-600 hover:bg-primary-50" asChild>
                  <Link href="/provider-register">
                    Apply Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  asChild
                >
                  <Link href="mailto:providers@botesq.com">Contact Us</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
