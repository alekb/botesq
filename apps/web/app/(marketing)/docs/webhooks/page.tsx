import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock } from '../components/code-block'

const events = [
  {
    name: 'consultation.completed',
    description: 'A consultation has been completed by an attorney',
    payload: `{
  "event": "consultation.completed",
  "timestamp": "2024-01-15T14:30:00Z",
  "data": {
    "consultation_id": "con_abc123...",
    "matter_id": "mat_xyz789...",
    "status": "completed",
    "attorney_id": "atty_def456...",
    "completed_at": "2024-01-15T14:30:00Z"
  }
}`,
  },
  {
    name: 'document.analyzed',
    description: 'Document analysis has been completed',
    payload: `{
  "event": "document.analyzed",
  "timestamp": "2024-01-15T12:00:00Z",
  "data": {
    "document_id": "doc_ghi789...",
    "matter_id": "mat_xyz789...",
    "status": "completed",
    "page_count": 15,
    "attorney_id": "atty_def456..."
  }
}`,
  },
  {
    name: 'matter.status_changed',
    description: 'A matter status has changed',
    payload: `{
  "event": "matter.status_changed",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "matter_id": "mat_xyz789...",
    "previous_status": "pending_retainer",
    "new_status": "active"
  }
}`,
  },
  {
    name: 'credits.low',
    description: 'Account credits have fallen below threshold',
    payload: `{
  "event": "credits.low",
  "timestamp": "2024-01-15T09:00:00Z",
  "data": {
    "operator_id": "op_abc123...",
    "credits_remaining": 5000,
    "threshold": 10000
  }
}`,
  },
  {
    name: 'retainer.expiring',
    description: 'A retainer offer is about to expire',
    payload: `{
  "event": "retainer.expiring",
  "timestamp": "2024-01-15T08:00:00Z",
  "data": {
    "retainer_id": "ret_abc123...",
    "matter_id": "mat_xyz789...",
    "expires_at": "2024-01-16T08:00:00Z"
  }
}`,
  },
]

export default function WebhooksPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <Badge variant="primary">Reference</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">Webhooks</h1>
        <p className="text-lg text-text-secondary">
          Receive real-time notifications when events occur in your BotEsq account. Webhooks enable
          you to build responsive integrations without polling.
        </p>
      </div>

      {/* Overview */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Overview</h2>
        <p className="text-text-secondary">
          Webhooks are HTTP callbacks that notify your application when events occur. When an event
          happens (e.g., consultation completed), BotEsq sends an HTTP POST request to your
          configured endpoint with event details.
        </p>
        <Card className="border-primary-500/50 bg-primary-500/10">
          <CardHeader>
            <CardTitle className="text-primary-500">Coming Soon</CardTitle>
          </CardHeader>
          <CardContent className="text-text-secondary">
            Webhooks are currently in beta. Contact support to enable webhooks for your operator
            account.
          </CardContent>
        </Card>
      </div>

      {/* Setup */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Setting Up Webhooks</h2>
        <ol className="list-inside list-decimal space-y-2 text-text-secondary">
          <li>Log in to your operator dashboard</li>
          <li>Navigate to Settings &gt; Webhooks</li>
          <li>Click &quot;Add Endpoint&quot;</li>
          <li>Enter your webhook URL (must be HTTPS)</li>
          <li>Select the events you want to receive</li>
          <li>Copy the signing secret for verification</li>
        </ol>
      </div>

      {/* Webhook format */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Webhook Format</h2>
        <p className="text-text-secondary">
          All webhooks are sent as HTTP POST requests with a JSON body:
        </p>
        <CodeBlock
          language="json"
          code={`{
  "event": "consultation.completed",
  "timestamp": "2024-01-15T14:30:00Z",
  "webhook_id": "wh_abc123...",
  "data": {
    // Event-specific payload
  }
}`}
        />
        <h3 className="text-lg font-medium text-text-primary">Headers</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th className="py-3 text-left font-medium text-text-primary">Header</th>
                <th className="py-3 text-left font-medium text-text-primary">Description</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              <tr className="border-b border-border-default">
                <td className="py-3 font-mono">Content-Type</td>
                <td className="py-3">application/json</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3 font-mono">X-BotEsq-Signature</td>
                <td className="py-3">HMAC-SHA256 signature for verification</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3 font-mono">X-BotEsq-Timestamp</td>
                <td className="py-3">Unix timestamp when webhook was sent</td>
              </tr>
              <tr>
                <td className="py-3 font-mono">X-BotEsq-Webhook-ID</td>
                <td className="py-3">Unique webhook delivery ID</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Signature verification */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Signature Verification</h2>
        <p className="text-text-secondary">
          Always verify webhook signatures to ensure requests are from BotEsq:
        </p>
        <CodeBlock
          language="typescript"
          code={`import { createHmac } from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  // Check timestamp to prevent replay attacks
  const webhookTime = parseInt(timestamp);
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - webhookTime) > 300) {
    return false; // Reject webhooks older than 5 minutes
  }

  // Compute expected signature
  const signedPayload = \`\${timestamp}.\${payload}\`;
  const expectedSignature = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  return signature === \`sha256=\${expectedSignature}\`;
}

// Express.js example
app.post('/webhooks/botesq', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-botesq-signature'];
  const timestamp = req.headers['x-botesq-timestamp'];
  const payload = req.body.toString();

  if (!verifyWebhookSignature(payload, signature, timestamp, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(payload);
  // Handle the event...

  res.status(200).send('OK');
});`}
        />
      </div>

      {/* Events */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Available Events</h2>
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.name}>
              <CardHeader>
                <CardTitle className="font-mono text-base">{event.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-text-secondary">{event.description}</p>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-text-primary">Example Payload</h4>
                  <CodeBlock language="json" code={event.payload} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Best practices */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Best Practices</h2>
        <ul className="list-inside list-disc space-y-2 text-text-secondary">
          <li>
            <strong className="text-text-primary">Respond quickly (under 5 seconds)</strong> -
            Process webhooks asynchronously if needed
          </li>
          <li>
            <strong className="text-text-primary">Return 2xx status</strong> - Any other status
            triggers retries
          </li>
          <li>
            <strong className="text-text-primary">Handle duplicates</strong> - Use webhook_id for
            idempotency
          </li>
          <li>
            <strong className="text-text-primary">Verify signatures</strong> - Always validate the
            X-BotEsq-Signature header
          </li>
          <li>
            <strong className="text-text-primary">Log webhook_id</strong> - For debugging and
            support requests
          </li>
        </ul>
      </div>

      {/* Retry policy */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Retry Policy</h2>
        <p className="text-text-secondary">
          If your endpoint returns a non-2xx status or times out, BotEsq retries with exponential
          backoff:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th className="py-3 text-left font-medium text-text-primary">Attempt</th>
                <th className="py-3 text-left font-medium text-text-primary">Delay</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              <tr className="border-b border-border-default">
                <td className="py-3">1st retry</td>
                <td className="py-3">1 minute</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3">2nd retry</td>
                <td className="py-3">5 minutes</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3">3rd retry</td>
                <td className="py-3">30 minutes</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3">4th retry</td>
                <td className="py-3">2 hours</td>
              </tr>
              <tr>
                <td className="py-3">5th retry (final)</td>
                <td className="py-3">24 hours</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-text-secondary">
          After 5 failed attempts, the webhook is marked as failed and will not be retried. You can
          manually retry failed webhooks from the dashboard.
        </p>
      </div>
    </div>
  )
}
