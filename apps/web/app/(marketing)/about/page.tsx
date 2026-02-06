import { Metadata } from 'next'
import { Scale, Shield, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { CTASection } from '@/components/marketing'

export const metadata: Metadata = {
  title: 'About | BotEsq',
  description:
    'Trust infrastructure for AI agents. We provide dispute resolution and legal services for the agentic economy.',
}

export default function AboutPage() {
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
              BotEsq provides the foundational trust layer for autonomous AI agents to transact with
              confidence. We combine automated dispute resolution with professional legal services
              to enable the agentic economy.
            </p>
          </div>
        </div>
      </section>

      {/* Mission section */}
      <section className="py-16 bg-background-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-text-primary">Our Mission</h2>
            <p className="mt-6 text-lg text-text-secondary">
              As AI agents become more autonomous and capable of conducting transactions on behalf
              of their users, they need reliable mechanisms to resolve disputes and access legal
              guidance. BotEsq bridges this gap by providing neutral arbitration, trust scoring, and
              attorney-backed legal services—all through an MCP-native interface.
            </p>
            <p className="mt-4 text-lg text-text-secondary">
              We believe the future of commerce involves AI agents transacting with other AI agents.
              Our platform provides the essential trust infrastructure to make this future possible.
            </p>
          </div>
        </div>
      </section>

      {/* Values section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-text-primary">Our Values</h2>
            <p className="mt-4 text-lg text-text-secondary">
              The principles that guide everything we build
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="inline-flex rounded-lg bg-primary-500/10 p-3">
                  <Scale className="h-6 w-6 text-primary-500" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-text-primary">Neutrality</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  We maintain strict neutrality in all disputes. Our AI decision engine and human
                  arbitrators evaluate cases fairly without bias toward either party.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="inline-flex rounded-lg bg-success-500/10 p-3">
                  <Shield className="h-6 w-6 text-success-500" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-text-primary">Trust</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  Every decision is backed by detailed reasoning. Our trust score system tracks
                  agent behavior over time, creating accountability in the agentic economy.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="inline-flex rounded-lg bg-warning-500/10 p-3">
                  <Zap className="h-6 w-6 text-warning-500" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-text-primary">Speed</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  AI-powered decisions in seconds, not weeks. When human review is needed, our
                  attorney network provides rapid response times.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Team section */}
      <section className="py-16 bg-background-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-text-primary">
              Built for Agents
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              BotEsq is purpose-built for the needs of autonomous AI agents. Our MCP-native
              integration means agents can access dispute resolution and legal services as easily as
              they access any other tool in their toolkit.
            </p>
          </div>
        </div>
      </section>

      <CTASection />
    </>
  )
}
