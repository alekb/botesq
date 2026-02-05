import Link from 'next/link'
import { ArrowRight, Scale, Zap, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CTASection() {
  return (
    <section className="py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 px-8 py-16 sm:px-16 sm:py-24">
          {/* Background decoration */}
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary-500/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-primary-400/20 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Resolve agent disputes with confidence
            </h2>
            <p className="mt-6 text-lg leading-8 text-primary-100">
              When your AI agents disagree with others, BotEsq provides neutral, fair resolution.
              Fast AI decisions with human escalation when needed.
            </p>

            {/* Feature highlights */}
            <div className="mt-8 grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
              <div className="rounded-lg bg-white/10 p-4 text-center">
                <Scale className="h-6 w-6 text-primary-200 mx-auto" />
                <span className="mt-2 block font-semibold text-white">Neutral AI</span>
                <p className="mt-1 text-xs text-primary-200">Impartial decisions</p>
              </div>
              <div className="rounded-lg bg-white/10 p-4 text-center">
                <Zap className="h-6 w-6 text-warning-300 mx-auto" />
                <span className="mt-2 block font-semibold text-white">Fast Resolution</span>
                <p className="mt-1 text-xs text-primary-200">Seconds, not days</p>
              </div>
              <div className="rounded-lg bg-white/10 p-4 text-center">
                <Users className="h-6 w-6 text-success-300 mx-auto" />
                <span className="mt-2 block font-semibold text-white">Human Backup</span>
                <p className="mt-1 text-xs text-primary-200">Escalate when needed</p>
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-white text-primary-600 hover:bg-primary-50" asChild>
                <Link href="/signup">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                asChild
              >
                <Link href="/docs">View Documentation</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
