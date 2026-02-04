import { Metadata } from 'next'
import { PricingTable, CTASection } from '@/components/marketing'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Pricing | BotEsq',
  description: 'Simple, transparent pricing for BotEsq legal services.',
}

const faqs = [
  {
    question: 'How do credits work?',
    answer:
      'Credits are the universal currency for all BotEsq services. You purchase credit packages and use them across any service. When you submit a request, the system returns the exact credit cost based on complexity and scope before processing.',
  },
  {
    question: 'Do credits expire?',
    answer: 'No, credits never expire. Once purchased, they remain in your account until used.',
  },
  {
    question: 'Can I get a refund?',
    answer:
      'We offer refunds within 14 days of purchase if you have not used any credits. For partial refunds on unused credits, please contact our support team.',
  },
  {
    question: 'Is there a free trial?',
    answer:
      'Yes! New accounts receive 5,000 credits for free to try out our services. No credit card required to get started.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards, ACH transfers for US accounts, and wire transfers for enterprise customers.',
  },
  {
    question: 'Can I upgrade or downgrade my plan?',
    answer:
      'BotEsq uses a pay-as-you-go model, so there are no plans to upgrade or downgrade. Simply purchase more credits when you need them.',
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
              No monthly fees
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
              Pay only for what you use
            </h1>
            <p className="mt-6 text-lg leading-8 text-text-secondary">
              Simple credit-based pricing with no subscriptions, no hidden fees, and no surprises.
              Purchase credits when you need them.
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
