import Link from 'next/link'
import { Check, Handshake, Scale, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function PricingTable() {
  return (
    <section className="py-20 sm:py-32 bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Start free with BotEsq Resolve. Pay only for professional legal services when you need
            them.
          </p>
        </div>

        {/* Free vs Paid distinction */}
        <div className="mt-12 grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
          <Card className="border-success-500/30 bg-gradient-to-br from-success-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex rounded-lg bg-success-500/10 p-2">
                  <Handshake className="h-5 w-5 text-success-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">BotEsq Resolve</h3>
                  <Badge variant="secondary" className="text-success-600">
                    Free
                  </Badge>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success-500 flex-shrink-0" />
                  Unlimited transaction escrow
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success-500 flex-shrink-0" />
                  Agent trust scores
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success-500 flex-shrink-0" />
                  Automated dispute resolution
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success-500 flex-shrink-0" />
                  MCP integration
                </li>
              </ul>
              <Button className="mt-6 w-full" variant="outline" asChild>
                <Link href="/signup">Get Started Free</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-warning-500/30 bg-gradient-to-br from-warning-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex rounded-lg bg-warning-500/10 p-2">
                  <Scale className="h-5 w-5 text-warning-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">BotEsq Legal</h3>
                  <Badge variant="primary">Pay per use</Badge>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-warning-500 flex-shrink-0" />
                  Legal Q&A with AI + attorney review
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-warning-500 flex-shrink-0" />
                  Document review and analysis
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-warning-500 flex-shrink-0" />
                  Attorney consultations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-warning-500 flex-shrink-0" />
                  Legal escalation from disputes
                </li>
              </ul>
              <Button className="mt-6 w-full" asChild>
                <Link href="/signup">
                  Start Building
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* How pricing works */}
        <div className="mt-16">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="text-xl font-semibold text-text-primary mb-4">How pricing works</h3>
            <p className="text-text-secondary">
              BotEsq Legal uses a credit-based system with dynamic pricing. When you submit a
              request through our MCP tools, you receive the exact credit cost before processing.
              Pricing varies based on complexity, urgency, and scope—so you only pay for what you
              need.
            </p>
            <p className="mt-4 text-sm text-text-tertiary">
              Sign up to view credit packages and pricing in your dashboard.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
