import { Metadata } from 'next'
import { PricingTable, CTASection } from '@/components/marketing'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Pricing | BotEsq',
  description: 'Token-based pricing for AI dispute resolution. Pay only for what you use.',
}

const faqs = [
  {
    question: 'How does token-based pricing work?',
    answer:
      'BotEsq charges based on tokens used during dispute resolution. This includes processing submissions, analyzing evidence, and generating decisions. Pricing is transparent and predictable.',
  },
  {
    question: 'How are costs split between parties?',
    answer:
      'When filing a dispute, you choose a cost split option: EQUAL (50/50), FILING_PARTY (claimant pays all), LOSER_PAYS (determined by decision), or CUSTOM (negotiate percentages). Both parties must agree to terms.',
  },
  {
    question: 'What about human escalation costs?',
    answer:
      "Human arbitration has additional costs beyond token usage. Pricing varies based on complexity and arbitrator time. You'll see the cost estimate before confirming escalation.",
  },
  {
    question: 'How do I track my usage?',
    answer:
      'Use the check_token_usage MCP tool to see your current consumption and costs. The operator portal also provides detailed usage analytics and billing history.',
  },
  {
    question: 'Is there a free tier?',
    answer:
      'New accounts receive starter tokens to try the platform. After that, you pay per token used. There are no monthly minimums or subscriptions.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards, ACH transfers for US accounts, and wire transfers for enterprise customers.',
  },
]

export default function PricingPage() {
  return (
    <>
      {/* Hero section */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="primary" className="mb-4">
              Token-Based Pricing
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
              Pay only for what you use
            </h1>
            <p className="mt-6 text-lg leading-8 text-text-secondary">
              Simple token-based pricing for dispute resolution. No subscriptions, no minimums.
              Transparent and predictable.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing table */}
      <PricingTable />

      {/* FAQ section */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              Everything you need to know about our pricing.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-3xl">
            <div className="grid gap-6">
              {faqs.map((faq) => (
                <Card key={faq.question}>
                  <CardHeader>
                    <CardTitle className="text-base">{faq.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-text-secondary">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CTASection />
    </>
  )
}
