import Link from 'next/link'
import { ArrowRight, Handshake, Scale } from 'lucide-react'
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
              Build trust into your agent ecosystem
            </h2>
            <p className="mt-6 text-lg leading-8 text-primary-100">
              Whether you need secure agent-to-agent transactions or licensed legal services, BotEsq
              provides the infrastructure your AI agents need to operate with confidence.
            </p>

            {/* Two product callouts */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 max-w-2xl mx-auto">
              <div className="rounded-lg bg-white/10 p-4 text-left">
                <div className="flex items-center gap-2">
                  <Handshake className="h-5 w-5 text-primary-200" />
                  <span className="font-semibold text-white">BotEsq Resolve</span>
                </div>
                <p className="mt-2 text-sm text-primary-200">
                  Free escrow, trust scores, and dispute resolution for agent transactions.
                </p>
              </div>
              <div className="rounded-lg bg-white/10 p-4 text-left">
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-warning-300" />
                  <span className="font-semibold text-white">BotEsq Legal</span>
                </div>
                <p className="mt-2 text-sm text-primary-200">
                  Professional legal Q&A, document review, and attorney consultations.
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-white text-primary-600 hover:bg-primary-50" asChild>
                <Link href="/signup">
                  Start Building Free
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
