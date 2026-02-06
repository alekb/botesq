import Link from 'next/link'
import { ArrowRight, Zap, Shield, Scale, Gavel, FileText, CheckCircle, Users } from 'lucide-react'
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
              Dispute resolution and legal services for the agentic economy. Escrow, trust scores,
              AI arbitration, and licensed attorney support—all through one MCP server.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Get Started
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

        {/* Two Products */}
        <div className="mt-20 grid gap-6 lg:grid-cols-2 max-w-5xl mx-auto">
          {/* Dispute Resolution */}
          <Card className="border-primary-500/30 bg-gradient-to-br from-primary-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex rounded-lg bg-primary-500/10 p-3">
                  <Scale className="h-6 w-6 text-primary-500" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">Dispute Resolution</h3>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                When AI agents disagree, BotEsq resolves it. File disputes, submit evidence, and
                receive neutral AI-powered decisions. Human arbitrators available for escalation.
              </p>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary-500 flex-shrink-0" />
                  Agent-to-agent transaction escrow
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary-500 flex-shrink-0" />
                  Trust scores based on history
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary-500 flex-shrink-0" />
                  Consent-based binding decisions
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Legal Services */}
          <Card className="border-success-500/30 bg-gradient-to-br from-success-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex rounded-lg bg-success-500/10 p-3">
                  <Gavel className="h-6 w-6 text-success-500" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">Legal Services</h3>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                AI-powered legal Q&A with licensed attorney oversight. Get answers to legal
                questions, document review, and expert consultations when your agent needs help.
              </p>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success-500 flex-shrink-0" />
                  AI-powered legal Q&A
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success-500 flex-shrink-0" />
                  Document review and analysis
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success-500 flex-shrink-0" />
                  Licensed attorney consultations
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Feature highlights */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
          <Card className="border-primary-500/30 bg-gradient-to-br from-primary-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="inline-flex rounded-lg bg-primary-500/10 p-3">
                <Scale className="h-6 w-6 text-primary-500" />
              </div>
              <h3 className="mt-4 font-semibold text-text-primary">Neutral Resolution</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Impartial AI agent evaluates both sides and renders fair decisions.
              </p>
            </CardContent>
          </Card>

          <Card className="border-success-500/30 bg-gradient-to-br from-success-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="inline-flex rounded-lg bg-success-500/10 p-3">
                <FileText className="h-6 w-6 text-success-500" />
              </div>
              <h3 className="mt-4 font-semibold text-text-primary">Evidence-Based</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Both parties submit positions and evidence for thorough evaluation.
              </p>
            </CardContent>
          </Card>

          <Card className="border-warning-500/30 bg-gradient-to-br from-warning-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="inline-flex rounded-lg bg-warning-500/10 p-3">
                <Shield className="h-6 w-6 text-warning-500" />
              </div>
              <h3 className="mt-4 font-semibold text-text-primary">Attorney Backed</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Licensed attorneys review complex cases and provide expert oversight.
              </p>
            </CardContent>
          </Card>

          <Card className="border-error-500/30 bg-gradient-to-br from-error-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="inline-flex rounded-lg bg-error-500/10 p-3">
                <Users className="h-6 w-6 text-error-500" />
              </div>
              <h3 className="mt-4 font-semibold text-text-primary">Human Escalation</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Complex disputes can escalate to human arbitrators when needed.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trust indicators */}
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 text-text-secondary">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary-500" />
            <span className="text-sm">Neutral AI Arbiter</span>
          </div>
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-success-500" />
            <span className="text-sm">Licensed Attorneys</span>
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
