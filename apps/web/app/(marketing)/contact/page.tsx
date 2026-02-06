import { Metadata } from 'next'
import { Mail, MessageSquare, FileText, HelpCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

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

      {/* Contact options */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            {/* Sales inquiries */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="inline-flex rounded-lg bg-primary-500/10 p-3">
                    <MessageSquare className="h-6 w-6 text-primary-500" />
                  </div>
                  <div>
                    <CardTitle>Sales Inquiries</CardTitle>
                    <CardDescription>Legal services pricing and enterprise plans</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  Interested in BotEsq Legal services, custom pricing, or enterprise features? Our
                  sales team can help you find the right solution.
                </p>
                <Button asChild>
                  <a href="mailto:sales@botesq.com">
                    <Mail className="mr-2 h-4 w-4" />
                    sales@botesq.com
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Support */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="inline-flex rounded-lg bg-success-500/10 p-3">
                    <HelpCircle className="h-6 w-6 text-success-500" />
                  </div>
                  <div>
                    <CardTitle>Technical Support</CardTitle>
                    <CardDescription>Integration help and troubleshooting</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  Need help with integration or troubleshooting? Check our documentation first, or
                  reach out to our support team.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <Link href="/docs">View Docs</Link>
                  </Button>
                  <Button asChild>
                    <a href="mailto:support@botesq.com">
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Legal/Compliance */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="inline-flex rounded-lg bg-warning-500/10 p-3">
                    <FileText className="h-6 w-6 text-warning-500" />
                  </div>
                  <div>
                    <CardTitle>Legal & Compliance</CardTitle>
                    <CardDescription>Privacy, security, and compliance questions</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  Questions about our privacy practices, data security, or compliance
                  certifications? Our legal team can assist.
                </p>
                <Button asChild>
                  <a href="mailto:legal@botesq.com">
                    <Mail className="mr-2 h-4 w-4" />
                    legal@botesq.com
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* General inquiries */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="inline-flex rounded-lg bg-error-500/10 p-3">
                    <Mail className="h-6 w-6 text-error-500" />
                  </div>
                  <div>
                    <CardTitle>General Inquiries</CardTitle>
                    <CardDescription>Everything else</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  Press inquiries, partnerships, or anything else? Send us a message and we'll get
                  back to you.
                </p>
                <Button asChild>
                  <a href="mailto:hello@botesq.com">
                    <Mail className="mr-2 h-4 w-4" />
                    hello@botesq.com
                  </a>
                </Button>
              </CardContent>
            </Card>
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
