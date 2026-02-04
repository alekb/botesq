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
          Integrate licensed legal services into your AI agents using the Model Context Protocol
          (MCP). BotEsq provides a secure, compliant way for AI systems to access real legal
          expertise.
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
              <CardDescription>Explore all 16 available tools</CardDescription>
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
              <CardDescription>Receive real-time notifications for async events</CardDescription>
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
          BotEsq is an MCP server that provides licensed legal services to AI agents. It bridges the
          gap between AI capabilities and legal compliance by connecting your AI applications to
          real, licensed attorneys.
        </p>
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-text-primary">Key Features</h3>
          <ul className="list-inside list-disc space-y-2 text-text-secondary">
            <li>
              <strong className="text-text-primary">Instant Legal Q&A</strong> - Get immediate
              answers to legal questions
            </li>
            <li>
              <strong className="text-text-primary">Matter Management</strong> - Create and track
              legal matters
            </li>
            <li>
              <strong className="text-text-primary">Document Review</strong> - Submit documents for
              professional analysis
            </li>
            <li>
              <strong className="text-text-primary">Consultations</strong> - Request in-depth legal
              consultations
            </li>
            <li>
              <strong className="text-text-primary">Credit System</strong> - Pay-as-you-go pricing
              with transparent costs
            </li>
          </ul>
        </div>
      </div>

      {/* How it works */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">How It Works</h2>
        <ol className="list-inside list-decimal space-y-4 text-text-secondary">
          <li>
            <strong className="text-text-primary">Get an API Key</strong> - Sign up for an operator
            account and generate API keys
          </li>
          <li>
            <strong className="text-text-primary">Start a Session</strong> - Use the{' '}
            <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
              start_session
            </code>{' '}
            tool to authenticate
          </li>
          <li>
            <strong className="text-text-primary">Use Legal Tools</strong> - Call any of our 16 MCP
            tools for legal services
          </li>
          <li>
            <strong className="text-text-primary">Pay with Credits</strong> - Credits are deducted
            automatically based on usage
          </li>
        </ol>
      </div>

      {/* Credit pricing */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Credit Pricing</h2>
        <p className="text-text-secondary">
          BotEsq uses a credit-based system. 1 credit = $0.001 USD. Here are some example costs:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th className="py-3 text-left font-medium text-text-primary">Service</th>
                <th className="py-3 text-right font-medium text-text-primary">Credits</th>
                <th className="py-3 text-right font-medium text-text-primary">USD</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              <tr className="border-b border-border-default">
                <td className="py-3">Simple Legal Question</td>
                <td className="py-3 text-right font-mono">200</td>
                <td className="py-3 text-right">$0.20</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3">Moderate Legal Question</td>
                <td className="py-3 text-right font-mono">500</td>
                <td className="py-3 text-right">$0.50</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3">Complex Legal Question</td>
                <td className="py-3 text-right font-mono">1,000</td>
                <td className="py-3 text-right">$1.00</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3">Create Matter</td>
                <td className="py-3 text-right font-mono">10,000</td>
                <td className="py-3 text-right">$10.00</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3">Document Review (base)</td>
                <td className="py-3 text-right font-mono">2,500</td>
                <td className="py-3 text-right">$2.50</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3">Standard Consultation</td>
                <td className="py-3 text-right font-mono">5,000</td>
                <td className="py-3 text-right">$5.00</td>
              </tr>
              <tr>
                <td className="py-3">Urgent Consultation</td>
                <td className="py-3 text-right font-mono">10,000</td>
                <td className="py-3 text-right">$10.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhooks */}
      <div id="webhooks" className="space-y-4 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-text-primary">Webhooks</h2>
        <p className="text-text-secondary">
          Receive real-time notifications when async operations complete. Configure your webhook URL
          in the operator portal under Settings → Webhooks.
        </p>

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
                      consultation.completed
                    </code>
                  </td>
                  <td className="py-3">Attorney has submitted a response to your consultation</td>
                </tr>
                <tr className="border-b border-border-default">
                  <td className="py-3">
                    <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                      document.analysis_completed
                    </code>
                  </td>
                  <td className="py-3">Document analysis has finished</td>
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
  "event": "consultation.completed",
  "timestamp": "2026-02-04T12:34:56.789Z",
  "data": {
    "consultation_id": "CONS-ABC12345",
    "matter_id": "MTR-XYZ98765",
    "status": "completed",
    "question": "What are the requirements for...",
    "response": "Based on applicable law...",
    "attorney_reviewed": true,
    "completed_at": "2026-02-04T12:34:56.789Z"
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
              - HMAC-SHA256 signature
            </li>
            <li>
              <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                X-BotEsq-Timestamp
              </code>{' '}
              - Unix timestamp when sent
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

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-text-primary">Example Handler</h3>
          <pre className="overflow-x-auto rounded-lg bg-background-tertiary p-4 font-mono text-sm">
            {`// Express.js webhook handler
app.post('/webhooks/botesq', express.json(), (req, res) => {
  const signature = req.headers['x-botesq-signature']
  const timestamp = req.headers['x-botesq-timestamp']
  const payload = JSON.stringify(req.body)

  if (!verifySignature(payload, signature, timestamp, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const { event, data } = req.body

  switch (event) {
    case 'consultation.completed':
      // Notify your agent the response is ready
      notifyAgent(data.consultation_id, data.response)
      break
  }

  res.json({ received: true })
})`}
          </pre>
        </div>
      </div>
    </div>
  )
}
