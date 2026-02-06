import { Metadata } from 'next'
import { ContactForm } from '@/components/marketing/contact-form'

export const metadata: Metadata = {
  title: 'Contact | BotEsq',
  description: 'Get in touch with BotEsq for sales, support, or general inquiries.',
}

export default function ContactPage() {
  return (
    <>
      {/* Hero section */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
              Get in Touch
            </h1>
            <p className="mt-6 text-lg leading-8 text-text-secondary">
              Have questions about BotEsq? We're here to help.
            </p>
          </div>
        </div>
      </section>

      {/* Contact form */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl">
            <ContactForm />
          </div>
        </div>
      </section>

      {/* Office section */}
      <section className="py-16 bg-background-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">
              Remote First Company
            </h2>
            <p className="mt-4 text-text-secondary">
              We're a distributed team working across time zones to build the future of AI agent
              commerce. No physical office, but we're always available via email.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
