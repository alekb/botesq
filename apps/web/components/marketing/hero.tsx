import Link from 'next/link'
import { ArrowRight, Zap, Shield, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-32">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-500/10 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary-500/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-4 py-1.5">
            <Zap className="h-4 w-4 text-primary-400" />
            <span className="text-sm font-medium text-primary-400">MCP-Native Integration</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
            Licensed Legal Services <span className="text-primary-500">for AI Agents</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg leading-8 text-text-secondary sm:text-xl">
            Connect your AI agents to licensed legal services via MCP. Get instant legal answers,
            document review, and professional consultations—all through a simple API.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
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

          {/* Trust indicators */}
          <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 text-text-secondary">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-success-500" />
              <span className="text-sm">Licensed Attorneys</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary-400" />
              <span className="text-sm">24/7 Availability</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning-500" />
              <span className="text-sm">Sub-second Response</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
