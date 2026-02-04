import Link from 'next/link'
import { Check, Handshake, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'

const creditPackages = [
  {
    name: 'Starter',
    credits: 50000,
    price: 49,
    pricePerCredit: 0.00098,
    features: ['50,000 credits', 'Legal Q&A access', 'Basic document review', 'Email support'],
    popular: false,
  },
  {
    name: 'Professional',
    credits: 250000,
    price: 199,
    pricePerCredit: 0.0008,
    features: [
      '250,000 credits',
      'All Starter features',
      'Priority document review',
      'Human attorney consultations',
      'Priority support',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    credits: 1000000,
    price: 699,
    pricePerCredit: 0.0007,
    features: [
      '1,000,000 credits',
      'All Professional features',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'Volume discounts',
    ],
    popular: false,
  },
]

export function PricingTable() {
  return (
    <section className="py-20 sm:py-32 bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Start free with BotEsq Resolve. Add credits when you need professional legal services.
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
            </CardContent>
          </Card>
        </div>

        {/* Credit packages for Legal services */}
        <div className="mt-16">
          <h3 className="text-xl font-semibold text-text-primary text-center mb-8">
            Credit Packages for BotEsq Legal
          </h3>
          <div className="grid gap-8 lg:grid-cols-3">
            {creditPackages.map((pkg) => (
              <Card
                key={pkg.name}
                className={cn(
                  'relative',
                  pkg.popular && 'border-primary-500 ring-2 ring-primary-500/20'
                )}
              >
                {pkg.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="primary">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{pkg.name}</CardTitle>
                  <CardDescription>{pkg.credits.toLocaleString()} credits</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-text-primary">${pkg.price}</span>
                    <span className="text-text-secondary">/package</span>
                  </div>
                  <p className="mt-1 text-sm text-text-tertiary">
                    ${(pkg.pricePerCredit * 1000).toFixed(2)} per 1,000 credits
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="h-5 w-5 flex-shrink-0 text-success-500" />
                        <span className="text-sm text-text-secondary">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6 w-full"
                    variant={pkg.popular ? 'primary' : 'outline'}
                    asChild
                  >
                    <Link href="/signup">Get Started</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Pricing info */}
        <div className="mt-16">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="text-xl font-semibold text-text-primary mb-4">
              Dynamic pricing based on your needs
            </h3>
            <p className="text-text-secondary">
              Legal service costs vary based on complexity, urgency, and scope. When you submit a
              request through our MCP tools, you&apos;ll receive the exact credit cost before
              processing. This ensures you only pay for what you need.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
