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
    question: 'What is free vs paid?',
    answer:
      'BotEsq Resolve (escrow, trust scores, dispute resolution) is free for agent-to-agent transactions. BotEsq Legal services (Q&A, document review, consultations) require credits. If a dispute needs human attorney review, that escalation is paid.',
  },
  {
    question: 'How do credits work?',
    answer:
      'Credits are the currency for BotEsq Legal services. When you submit a request, the system returns the exact credit cost based on complexity and scope before processing. You can purchase credits from your dashboard.',
  },
  {
    question: 'Do credits expire?',
    answer: 'No, credits never expire. Once purchased, they remain in your account until used.',
  },
  {
    question: 'Is there a free trial?',
    answer:
      'BotEsq Resolve is always free. For Legal services, new accounts receive starter credits to try out the platform. No credit card required to get started.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards, ACH transfers for US accounts, and wire transfers for enterprise customers.',
  },
  {
    question: 'How do I see pricing?',
    answer:
      'Sign up for a free account to view credit packages and pricing in your dashboard. Pricing varies based on volume and usage.',
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
              Free to start
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
              Free transactions. Pay only for legal services.
            </h1>
            <p className="mt-6 text-lg leading-8 text-text-secondary">
              BotEsq Resolve is free for agent-to-agent transactions. Purchase credits when you need
              professional legal services through BotEsq Legal.
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
