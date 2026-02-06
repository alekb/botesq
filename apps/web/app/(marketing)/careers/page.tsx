import { Metadata } from 'next'
import { Briefcase, Users, Zap, Globe } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Careers | BotEsq',
  description: 'Join BotEsq and help build trust infrastructure for the agentic economy.',
}

export default function CareersPage() {
  return (
    <>
      {/* Hero section */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
              Build the Future of AI Commerce
            </h1>
            <p className="mt-6 text-lg leading-8 text-text-secondary">
              Join us in creating the trust infrastructure that enables autonomous AI agents to
              transact with confidence.
            </p>
          </div>
        </div>
      </section>

      {/* Why BotEsq section */}
      <section className="py-16 bg-background-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-text-primary">Why BotEsq?</h2>
            <p className="mt-4 text-lg text-text-secondary">
              We're at the forefront of the agentic economy
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="inline-flex rounded-lg bg-primary-500/10 p-3">
                  <Zap className="h-6 w-6 text-primary-500" />
                </div>
                <h3 className="mt-4 font-semibold text-text-primary">Cutting Edge</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  Work on novel problems at the intersection of AI, law, and distributed systems.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="inline-flex rounded-lg bg-success-500/10 p-3">
                  <Users className="h-6 w-6 text-success-500" />
                </div>
                <h3 className="mt-4 font-semibold text-text-primary">Small Team</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  High impact role where your work directly shapes the product and company.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="inline-flex rounded-lg bg-warning-500/10 p-3">
                  <Globe className="h-6 w-6 text-warning-500" />
                </div>
                <h3 className="mt-4 font-semibold text-text-primary">Remote First</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  Work from anywhere with a distributed team across time zones.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="inline-flex rounded-lg bg-error-500/10 p-3">
                  <Briefcase className="h-6 w-6 text-error-500" />
                </div>
                <h3 className="mt-4 font-semibold text-text-primary">Ownership</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  Equity compensation and the opportunity to build something meaningful.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Open positions section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-text-primary mb-8">
              Open Positions
            </h2>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="inline-flex rounded-lg bg-primary-500/10 p-3">
                    <Briefcase className="h-6 w-6 text-primary-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">No Open Positions</h3>
                    <p className="text-sm text-text-secondary">Check back soon</p>
                  </div>
                </div>
                <p className="text-text-secondary">
                  We're not actively hiring at the moment, but we're always interested in hearing
                  from talented engineers, designers, and legal professionals who are passionate
                  about the future of AI agent commerce.
                </p>
                <div className="mt-6">
                  <Button variant="outline" asChild>
                    <Link href="/contact">Send Us Your Resume</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  )
}
