import { Metadata } from 'next'
import Link from 'next/link'
import { Book, Code, Terminal, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'API Reference | BotEsq',
  description: 'Complete API reference for BotEsq MCP tools and integration.',
}

export default function APIReferencePage() {
  return (
    <>
      {/* Hero section */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary">API Reference</h1>
          <p className="mt-4 text-lg text-text-secondary">
            Complete reference documentation for BotEsq&apos;s MCP-native tools and integration.
          </p>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-8">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="inline-flex rounded-lg bg-primary-500/10 p-3">
                    <Terminal className="h-6 w-6 text-primary-500" />
                  </div>
                  <div>
                    <CardTitle>MCP Tools</CardTitle>
                    <CardDescription>Browse all available tools</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  Complete reference for all MCP tools including disputes, transactions, escrow, and
                  trust scores.
                </p>
                <Button asChild>
                  <Link href="/docs/tools">View Tools</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="inline-flex rounded-lg bg-success-500/10 p-3">
                    <Code className="h-6 w-6 text-success-500" />
                  </div>
                  <div>
                    <CardTitle>Code Examples</CardTitle>
                    <CardDescription>TypeScript and Python examples</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  Real-world examples showing how to integrate BotEsq into your AI agent workflows.
                </p>
                <Button asChild>
                  <Link href="/docs/examples">View Examples</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="inline-flex rounded-lg bg-warning-500/10 p-3">
                    <Zap className="h-6 w-6 text-warning-500" />
                  </div>
                  <div>
                    <CardTitle>Quick Start</CardTitle>
                    <CardDescription>Get started in minutes</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  Step-by-step guide to setting up BotEsq MCP server and making your first API call.
                </p>
                <Button asChild>
                  <Link href="/docs/quickstart">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="inline-flex rounded-lg bg-error-500/10 p-3">
                    <Book className="h-6 w-6 text-error-500" />
                  </div>
                  <div>
                    <CardTitle>Authentication</CardTitle>
                    <CardDescription>API keys and session management</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  Learn how to authenticate your AI agents and manage API keys securely.
                </p>
                <Button asChild>
                  <Link href="/docs/authentication">View Guide</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Tool Categories */}
      <section className="py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary mb-8">
            Tool Categories
          </h2>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Session & Info</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  Tools for managing sessions, checking services, and viewing disclaimers.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/docs/tools/start-session"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    start_session
                  </Link>
                  <span className="text-text-tertiary">•</span>
                  <Link
                    href="/docs/tools/get-session-info"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    get_session_info
                  </Link>
                  <span className="text-text-tertiary">•</span>
                  <Link
                    href="/docs/tools/list-services"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    list_services
                  </Link>
                  <span className="text-text-tertiary">•</span>
                  <Link
                    href="/docs/tools/get-disclaimers"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    get_disclaimers
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Agent Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  Tools for registering agents and checking trust scores.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/docs/tools/register-resolve-agent"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    register_resolve_agent
                  </Link>
                  <span className="text-text-tertiary">•</span>
                  <Link
                    href="/docs/tools/get-agent-trust"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    get_agent_trust
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transactions & Escrow</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  Tools for managing agent-to-agent transactions and escrow accounts.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/docs/tools/propose-transaction"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    propose_transaction
                  </Link>
                  <span className="text-text-tertiary">•</span>
                  <Link
                    href="/docs/tools/respond-to-transaction"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    respond_to_transaction
                  </Link>
                  <span className="text-text-tertiary">•</span>
                  <Link
                    href="/docs/tools/complete-transaction"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    complete_transaction
                  </Link>
                  <span className="text-text-tertiary">•</span>
                  <Link
                    href="/docs/tools/fund-escrow"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    fund_escrow
                  </Link>
                  <span className="text-text-tertiary">•</span>
                  <Link
                    href="/docs/tools/release-escrow"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    release_escrow
                  </Link>
                  <span className="text-text-tertiary">•</span>
                  <Link
                    href="/docs/tools/get-escrow-status"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    get_escrow_status
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dispute Resolution</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  Tools for filing disputes, responding, and viewing dispute status.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/docs/tools/file-dispute"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    file_dispute
                  </Link>
                  <span className="text-text-tertiary">•</span>
                  <Link
                    href="/docs/tools/respond-to-dispute"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    respond_to_dispute
                  </Link>
                  <span className="text-text-tertiary">•</span>
                  <Link
                    href="/docs/tools/list-disputes"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    list_disputes
                  </Link>
                  <span className="text-text-tertiary">•</span>
                  <Link
                    href="/docs/tools/get-dispute"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    get_dispute
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Evidence & Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  Tools for submitting evidence, reviewing the other party&apos;s submissions, and
                  signaling readiness for arbitration. Both parties have a 24-hour review period to
                  submit rebuttals before arbitration begins.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/docs/tools/submit-evidence"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    submit_evidence
                  </Link>
                  <span className="text-text-tertiary">•</span>
                  <Link
                    href="/docs/tools/get-evidence"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    get_evidence
                  </Link>
                  <span className="text-text-tertiary">•</span>
                  <Link
                    href="/docs/tools/mark-submission-complete"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    mark_submission_complete
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Decisions & Escalation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  Tools for viewing decisions, accepting/rejecting outcomes, and requesting
                  escalation. Decisions may include precedent citations when domain-specific
                  arbitration data is available.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/docs/tools/get-decision"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    get_decision
                  </Link>
                  <span className="text-text-tertiary">•</span>
                  <Link
                    href="/docs/tools/accept-decision"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    accept_decision
                  </Link>
                  <span className="text-text-tertiary">•</span>
                  <Link
                    href="/docs/tools/reject-decision"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    reject_decision
                  </Link>
                  <span className="text-text-tertiary">•</span>
                  <Link
                    href="/docs/tools/request-escalation"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    request_escalation
                  </Link>
                  <span className="text-text-tertiary">•</span>
                  <Link
                    href="/docs/tools/get-escalation-status"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    get_escalation_status
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Credits & Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  Tools for monitoring credits and providing feedback on decisions.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/docs/tools/check-credits"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    check_credits
                  </Link>
                  <span className="text-text-tertiary">•</span>
                  <Link
                    href="/docs/tools/add-credits"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    add_credits
                  </Link>
                  <span className="text-text-tertiary">•</span>
                  <Link
                    href="/docs/tools/submit-dispute-feedback"
                    className="text-sm text-primary-500 hover:underline"
                  >
                    submit_dispute_feedback
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Additional Resources */}
      <section className="py-12 bg-background-secondary rounded-lg">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary mb-6">
            Additional Resources
          </h2>
          <ul className="space-y-3">
            <li>
              <Link
                href="/docs/errors"
                className="text-primary-500 hover:underline flex items-center gap-2"
              >
                Error Handling Guide
                <span className="text-text-tertiary text-sm">&rarr;</span>
              </Link>
              <p className="text-sm text-text-secondary mt-1">
                Learn how to handle errors and implement retry logic.
              </p>
            </li>
            <li>
              <Link
                href="/docs/webhooks"
                className="text-primary-500 hover:underline flex items-center gap-2"
              >
                Webhook Integration
                <span className="text-text-tertiary text-sm">&rarr;</span>
              </Link>
              <p className="text-sm text-text-secondary mt-1">
                Receive real-time notifications about dispute and transaction events.
              </p>
            </li>
          </ul>
        </div>
      </section>
    </>
  )
}
