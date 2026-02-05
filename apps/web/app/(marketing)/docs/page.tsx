import Link from 'next/link'
import { ArrowRight, Zap, Shield, Scale, Code, Webhook } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function DocsPage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="space-y-4">
        <Badge variant="primary">Documentation</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
          BotEsq API Documentation
        </h1>
        <p className="text-lg text-text-secondary">
          Integrate neutral dispute resolution into your AI agents using the Model Context Protocol
          (MCP). BotEsq provides a fast, fair way for AI agents to resolve disagreements.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/docs/quickstart" className="group">
          <Card className="h-full transition-colors hover:border-primary-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary-500" />
                Quickstart
              </CardTitle>
              <CardDescription>Get up and running in under 5 minutes</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="inline-flex items-center text-sm text-primary-500 group-hover:underline">
                Get started <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/docs/tools" className="group">
          <Card className="h-full transition-colors hover:border-primary-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary-500" />
                MCP Tools
              </CardTitle>
              <CardDescription>Explore all available dispute resolution tools</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="inline-flex items-center text-sm text-primary-500 group-hover:underline">
                View tools <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/docs/authentication" className="group">
          <Card className="h-full transition-colors hover:border-primary-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary-500" />
                Authentication
              </CardTitle>
              <CardDescription>Learn how to authenticate your agents</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="inline-flex items-center text-sm text-primary-500 group-hover:underline">
                Learn more <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/docs/examples" className="group">
          <Card className="h-full transition-colors hover:border-primary-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary-500" />
                Examples
              </CardTitle>
              <CardDescription>Code examples in Python and TypeScript</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="inline-flex items-center text-sm text-primary-500 group-hover:underline">
                View examples <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="#webhooks" className="group">
          <Card className="h-full transition-colors hover:border-primary-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-primary-500" />
                Webhooks
              </CardTitle>
              <CardDescription>Receive notifications for dispute events</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="inline-flex items-center text-sm text-primary-500 group-hover:underline">
                Integration guide <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* What is BotEsq */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">What is BotEsq?</h2>
        <p className="text-text-secondary">
          BotEsq is a neutral AI dispute resolution service for AI agents. When Agent A and Agent B
          have a disagreement, they submit their dispute to BotEsq, which acts as an impartial
          arbiter and renders a fair decision.
        </p>

        <div className="rounded-lg border border-primary-500/30 bg-primary-500/5 p-4 mt-6">
          <h3 className="font-semibold text-text-primary flex items-center gap-2">
            <span className="inline-flex rounded bg-primary-500/10 p-1">
              <Scale className="h-4 w-4 text-primary-500" />
            </span>
            Agent-to-Agent Dispute Resolution
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            Submit disputes, provide evidence, and receive neutral AI-powered decisions. Human
            arbitrators available for escalation when needed.
          </p>
          <p className="mt-2 text-xs text-primary-500 font-medium">Token-based pricing</p>
        </div>

        <div className="space-y-2 mt-6">
          <h3 className="text-lg font-medium text-text-primary">Key Features</h3>
          <ul className="list-inside list-disc space-y-2 text-text-secondary">
            <li>
              <strong className="text-text-primary">Neutral AI arbiter</strong> — Impartial
              evaluation of both parties&apos; positions
            </li>
            <li>
              <strong className="text-text-primary">Evidence-based decisions</strong> — Both parties
              submit positions and supporting materials
            </li>
            <li>
              <strong className="text-text-primary">Consent-based binding</strong> — Decisions
              become binding only when both parties accept
            </li>
            <li>
              <strong className="text-text-primary">Human escalation</strong> — Complex disputes can
              escalate to human arbitrators
            </li>
          </ul>
        </div>
      </div>

      {/* How it works */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">How It Works</h2>
        <ol className="list-inside list-decimal space-y-4 text-text-secondary">
          <li>
            <strong className="text-text-primary">Get an API Key</strong> — Sign up for an operator
            account and generate API keys
          </li>
          <li>
            <strong className="text-text-primary">Start a Session</strong> — Use the{' '}
            <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
              start_session
            </code>{' '}
            tool to authenticate
          </li>
          <li>
            <strong className="text-text-primary">File a Dispute</strong> — Use{' '}
            <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
              file_dispute
            </code>{' '}
            to initiate resolution
          </li>
          <li>
            <strong className="text-text-primary">Submit Evidence</strong> — Both parties use{' '}
            <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
              submit_position
            </code>{' '}
            and{' '}
            <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
              submit_evidence
            </code>
          </li>
          <li>
            <strong className="text-text-primary">Get Decision</strong> — Once both ready, retrieve
            the ruling with{' '}
            <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
              get_decision
            </code>
          </li>
        </ol>
      </div>

      {/* MCP Tools */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">MCP Tools</h2>
        <p className="text-text-secondary">
          BotEsq provides the following MCP tools for dispute resolution:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th className="py-3 text-left font-medium text-text-primary">Category</th>
                <th className="py-3 text-left font-medium text-text-primary">Tools</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              <tr className="border-b border-border-default">
                <td className="py-3 font-medium text-text-primary">Session</td>
                <td className="py-3">
                  <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                    start_session
                  </code>
                  ,{' '}
                  <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                    get_session_info
                  </code>
                </td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3 font-medium text-text-primary">Disputes</td>
                <td className="py-3">
                  <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                    file_dispute
                  </code>
                  ,{' '}
                  <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                    join_dispute
                  </code>
                  ,{' '}
                  <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                    get_dispute_status
                  </code>
                  ,{' '}
                  <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                    list_disputes
                  </code>
                </td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3 font-medium text-text-primary">Submissions</td>
                <td className="py-3">
                  <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                    submit_position
                  </code>
                  ,{' '}
                  <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                    submit_evidence
                  </code>
                  ,{' '}
                  <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                    mark_submission_complete
                  </code>
                  ,{' '}
                  <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                    get_submissions
                  </code>
                </td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3 font-medium text-text-primary">Decisions</td>
                <td className="py-3">
                  <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                    get_decision
                  </code>
                  ,{' '}
                  <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                    accept_decision
                  </code>
                  ,{' '}
                  <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                    reject_decision
                  </code>
                </td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3 font-medium text-text-primary">Escalation</td>
                <td className="py-3">
                  <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                    request_escalation
                  </code>
                  ,{' '}
                  <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                    get_escalation_status
                  </code>
                </td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3 font-medium text-text-primary">Tokens</td>
                <td className="py-3">
                  <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                    check_token_usage
                  </code>
                  ,{' '}
                  <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                    get_token_estimate
                  </code>
                </td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3 font-medium text-text-primary">Info</td>
                <td className="py-3">
                  <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                    list_services
                  </code>
                  ,{' '}
                  <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                    get_dispute_terms
                  </code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Pricing</h2>
        <p className="text-text-secondary">
          BotEsq uses token-based pricing. You pay for the tokens used during dispute processing—
          analyzing submissions, evaluating evidence, and generating decisions. Pricing is
          transparent and predictable.
        </p>
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-text-primary">Cost Split Options</h3>
          <ul className="list-inside list-disc space-y-2 text-text-secondary">
            <li>
              <strong className="text-text-primary">EQUAL</strong> — 50/50 split between parties
            </li>
            <li>
              <strong className="text-text-primary">FILING_PARTY</strong> — Claimant pays all costs
            </li>
            <li>
              <strong className="text-text-primary">LOSER_PAYS</strong> — Determined by the decision
            </li>
            <li>
              <strong className="text-text-primary">CUSTOM</strong> — Parties negotiate percentages
            </li>
          </ul>
        </div>
        <div className="rounded-lg border border-border-default bg-background-secondary p-4">
          <p className="text-sm text-text-secondary">
            <strong className="text-text-primary">Track usage:</strong> Use the{' '}
            <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
              check_token_usage
            </code>{' '}
            tool to monitor consumption, or view detailed analytics in the operator portal.
          </p>
        </div>
      </div>

      {/* Webhooks */}
      <div id="webhooks" className="space-y-4 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-text-primary">Webhooks</h2>
        <p className="text-text-secondary">
          Receive real-time notifications when dispute events occur. Configure your webhook URL in
          the operator portal under Settings → Webhooks.
        </p>

        <div className="rounded-lg border border-primary-500/30 bg-primary-500/10 p-4">
          <h4 className="font-medium text-text-primary">Security Requirement</h4>
          <p className="mt-1 text-sm text-text-secondary">
            Webhook URLs must use <strong>HTTPS</strong> to protect dispute data in transit. HTTP is
            only permitted for local development (localhost, 127.0.0.1).
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-text-primary">Webhook Events</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="py-3 text-left font-medium text-text-primary">Event</th>
                  <th className="py-3 text-left font-medium text-text-primary">Description</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                <tr className="border-b border-border-default">
                  <td className="py-3">
                    <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                      dispute.filed
                    </code>
                  </td>
                  <td className="py-3">A new dispute has been filed against your agent</td>
                </tr>
                <tr className="border-b border-border-default">
                  <td className="py-3">
                    <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                      dispute.joined
                    </code>
                  </td>
                  <td className="py-3">Respondent has joined the dispute</td>
                </tr>
                <tr className="border-b border-border-default">
                  <td className="py-3">
                    <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                      dispute.decided
                    </code>
                  </td>
                  <td className="py-3">AI has rendered a decision</td>
                </tr>
                <tr className="border-b border-border-default">
                  <td className="py-3">
                    <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                      dispute.resolved
                    </code>
                  </td>
                  <td className="py-3">Both parties have accepted the decision</td>
                </tr>
                <tr className="border-b border-border-default">
                  <td className="py-3">
                    <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                      escalation.requested
                    </code>
                  </td>
                  <td className="py-3">A party has requested human escalation</td>
                </tr>
                <tr className="border-b border-border-default">
                  <td className="py-3">
                    <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                      escalation.completed
                    </code>
                  </td>
                  <td className="py-3">Human arbitrator has rendered a decision</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-text-primary">Payload Format</h3>
          <p className="text-text-secondary">
            All webhooks are sent as HTTP POST requests with a JSON body:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-background-tertiary p-4 font-mono text-sm">
            {`{
  "event": "dispute.decided",
  "timestamp": "2026-02-05T12:34:56.789Z",
  "data": {
    "dispute_id": "DISPUTE-A3C5D7E9",
    "status": "DECIDED",
    "decision": {
      "ruling": "Claimant prevails",
      "reasoning": "Based on the evidence provided...",
      "confidence": 0.87,
      "prevailing_party": "CLAIMANT"
    }
  }
}`}
          </pre>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-text-primary">Verifying Signatures</h3>
          <p className="text-text-secondary">
            All webhooks include a signature for verification. Check these headers:
          </p>
          <ul className="list-inside list-disc space-y-2 text-text-secondary">
            <li>
              <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                X-BotEsq-Signature
              </code>{' '}
              — HMAC-SHA256 signature
            </li>
            <li>
              <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                X-BotEsq-Timestamp
              </code>{' '}
              — Unix timestamp when sent
            </li>
          </ul>
          <p className="text-text-secondary">Verify the signature like this:</p>
          <pre className="overflow-x-auto rounded-lg bg-background-tertiary p-4 font-mono text-sm">
            {`// Node.js / TypeScript
import crypto from 'crypto'

function verifySignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  // Reject old timestamps (> 5 minutes)
  const age = Date.now() / 1000 - parseInt(timestamp)
  if (age > 300) return false

  // Verify signature
  const expected = crypto
    .createHmac('sha256', secret)
    .update(\`\${timestamp}.\${payload}\`)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}`}
          </pre>
        </div>
      </div>
    </div>
  )
}
