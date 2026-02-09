import Link from 'next/link'
import { Check, Scale, Users, ArrowRight } from 'lucide-react'
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
            Token-based pricing for all dispute resolution services. Pay only for what you use.
          </p>
        </div>

        {/* Pricing tiers */}
        <div className="mt-12 grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {/* Dispute Resolution */}
          <Card className="border-primary-500/30 bg-gradient-to-br from-primary-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex rounded-lg bg-primary-500/10 p-2">
                  <Scale className="h-5 w-5 text-primary-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">Dispute Resolution</h3>
                  <Badge variant="secondary" className="text-primary-600">
                    Token-based
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                AI-powered dispute resolution, transactions, escrow, and trust scores.
              </p>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary-500 flex-shrink-0" />
                  File and manage disputes
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary-500 flex-shrink-0" />
                  Submit evidence and positions
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary-500 flex-shrink-0" />
                  AI-powered neutral decisions
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary-500 flex-shrink-0" />
                  Escrow and trust scores
                </li>
              </ul>
              <Button className="mt-6 w-full" variant="outline" asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Human Escalation */}
          <Card className="border-warning-500/30 bg-gradient-to-br from-warning-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex rounded-lg bg-warning-500/10 p-2">
                  <Users className="h-5 w-5 text-warning-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">Human Escalation</h3>
                  <Badge variant="secondary">Additional cost</Badge>
                </div>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                Human arbitrators for complex disputes that need expert judgment.
              </p>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-warning-500 flex-shrink-0" />
                  Human arbitrator review
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-warning-500 flex-shrink-0" />
                  Complex dispute handling
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-warning-500 flex-shrink-0" />
                  Binding arbitration option
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-warning-500 flex-shrink-0" />
                  Expert domain knowledge
                </li>
              </ul>
              <Button className="mt-6 w-full" variant="outline" asChild>
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
              All services use token-based pricing—you pay for the tokens used during processing.
              Human escalation incurs additional arbitrator fees.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 text-left max-w-xl mx-auto">
              <div className="rounded-lg border border-border-default bg-background-primary p-4">
                <h4 className="font-medium text-text-primary">Cost Split Options</h4>
                <ul className="mt-2 text-sm text-text-secondary space-y-1">
                  <li>• EQUAL — 50/50 split</li>
                  <li>• FILING_PARTY — Claimant pays</li>
                  <li>• LOSER_PAYS — By decision</li>
                  <li>• CUSTOM — Negotiate %</li>
                </ul>
              </div>
              <div className="rounded-lg border border-border-default bg-background-primary p-4">
                <h4 className="font-medium text-text-primary">What&apos;s Included</h4>
                <ul className="mt-2 text-sm text-text-secondary space-y-1">
                  <li>• Submission processing</li>
                  <li>• Evidence analysis</li>
                  <li>• Decision generation</li>
                  <li>• Usage tracking tools</li>
                </ul>
              </div>
            </div>
            <p className="mt-6 text-sm text-text-tertiary">
              Sign up to view detailed pricing in your dashboard.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
