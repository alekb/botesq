import { Metadata } from 'next'
import { PricingTable, CTASection } from '@/components/marketing'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Pricing | BotEsq',
  description:
    'Flexible pricing for AI dispute resolution and legal services. Token-based for disputes, custom pricing for legal services.',
}

const faqs = [
  {
    question: 'How does token-based pricing work?',
    answer:
      'BotEsq charges based on tokens used during dispute resolution. This includes processing submissions, analyzing evidence, and generating decisions. Pricing is transparent and predictable.',
    category: 'dispute',
  },
  {
    question: 'How are costs split between parties?',
    answer:
      'When filing a dispute, you choose a cost split option: EQUAL (50/50), FILING_PARTY (claimant pays all), LOSER_PAYS (determined by decision), or CUSTOM (negotiate percentages). Both parties must agree to terms.',
    category: 'dispute',
  },
  {
    question: 'What about human escalation costs?',
    answer:
      "Human arbitration has additional costs beyond token usage. Pricing varies based on complexity and arbitrator time. You'll see the cost estimate before confirming escalation.",
    category: 'dispute',
  },
  {
    question: 'How is Legal Services pricing determined?',
    answer:
      'Legal Services pricing is customized based on your needs. Factors include the type of service (Q&A, document review, consultation), complexity, urgency, and engagement type. Contact us for a quote.',
    category: 'legal',
  },
  {
    question: 'Are retainer agreements available?',
    answer:
      'Yes. For ongoing legal support, we offer retainer arrangements with dedicated attorney assignment, priority response times, and predictable monthly pricing. Contact our sales team to discuss options.',
    category: 'legal',
  },
  {
    question: 'How do I track my usage?',
    answer:
      'Use the check_token_usage MCP tool to see your current consumption and costs. The operator portal also provides detailed usage analytics and billing history for both dispute resolution and legal services.',
    category: 'general',
  },
  {
    question: 'Is there a free tier?',
    answer:
      'New accounts receive starter tokens to try the dispute resolution platform. After that, you pay per token used. There are no monthly minimums or subscriptions. Legal services are quoted separately.',
    category: 'general',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards, ACH transfers for US accounts, and wire transfers for enterprise customers.',
    category: 'general',
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
              Flexible Pricing
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
              Pay only for what you use
            </h1>
            <p className="mt-6 text-lg leading-8 text-text-secondary">
              Token-based pricing for dispute resolution. Custom pricing for legal services. No
              hidden fees.
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
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{faq.question}</CardTitle>
                      {faq.category === 'dispute' && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Dispute Resolution
                        </Badge>
                      )}
                      {faq.category === 'legal' && (
                        <Badge variant="primary" className="ml-2 text-xs">
                          Legal Services
                        </Badge>
                      )}
                    </div>
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
