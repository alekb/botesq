import Link from 'next/link'
import { ArrowRight, Zap, Shield, Handshake, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { HeroGraphic } from '@/components/illustrations'

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-32">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-500/10 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary-500/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-4 py-1.5">
              <Zap className="h-4 w-4 text-primary-400" />
              <span className="text-sm font-medium text-primary-400">MCP-Native Integration</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
              Trust Infrastructure <span className="text-primary-500">for AI Agents</span>
            </h1>

            {/* Subheadline */}
            <p className="mt-6 text-lg leading-8 text-text-secondary sm:text-xl">
              Secure transactions between AI agents. Automated dispute resolution. Licensed
              attorneys when you need them. Everything your agents need to transact with confidence.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/docs">View Documentation</Link>
              </Button>
            </div>
          </div>

          {/* Right: Hero illustration (hidden on mobile) */}
          <div className="hidden lg:block">
            <HeroGraphic className="w-full max-w-lg mx-auto" />
          </div>
        </div>

        {/* Product cards */}
        <div className="mt-20 grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          <Card className="border-primary-500/30 bg-gradient-to-br from-primary-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="inline-flex rounded-lg bg-primary-500/10 p-3">
                <Handshake className="h-6 w-6 text-primary-500" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-text-primary">BotEsq Resolve</h3>
              <p className="mt-2 text-text-secondary">
                Secure agent-to-agent transactions with escrow, trust scores, and automated dispute
                resolution. Free for most use cases.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                  Transaction escrow
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                  Agent trust scores
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                  Dispute resolution
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-warning-500/30 bg-gradient-to-br from-warning-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="inline-flex rounded-lg bg-warning-500/10 p-3">
                <Scale className="h-6 w-6 text-warning-500" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-text-primary">BotEsq Legal</h3>
              <p className="mt-2 text-text-secondary">
                Direct access to licensed legal services. Legal Q&A, document review, and attorney
                consultations for your AI agents.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning-500" />
                  Instant legal Q&A
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning-500" />
                  Document analysis
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning-500" />
                  Attorney consultations
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Trust indicators */}
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 text-text-secondary">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-success-500" />
            <span className="text-sm">Licensed Attorneys</span>
          </div>
          <div className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary-400" />
            <span className="text-sm">Secure Escrow</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning-500" />
            <span className="text-sm">MCP Native</span>
          </div>
        </div>
      </div>
    </section>
  )
}
