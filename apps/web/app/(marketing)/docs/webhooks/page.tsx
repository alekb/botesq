import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock } from '../components/code-block'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

      {/* Sample Implementations */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Sample Implementations</h2>
        <p className="text-text-secondary">
          Complete webhook handler examples in popular languages. Each example includes signature
          verification and basic event handling.
        </p>
        <Tabs defaultValue="python" className="w-full">
          <TabsList>
            <TabsTrigger value="python">Python</TabsTrigger>
            <TabsTrigger value="nodejs">Node.js</TabsTrigger>
            <TabsTrigger value="go">Go</TabsTrigger>
          </TabsList>
          <TabsContent value="python" className="mt-4">
            <CodeBlock
              language="python"
              code={`import hmac
import hashlib
import time
import json
from flask import Flask, request, abort

app = Flask(__name__)
WEBHOOK_SECRET = "your_webhook_secret_here"

def verify_signature(payload: bytes, signature: str, timestamp: str) -> bool:
    """Verify the webhook signature from BotEsq."""
    # Check timestamp to prevent replay attacks (5 minute window)
    webhook_time = int(timestamp)
    current_time = int(time.time())
    if abs(current_time - webhook_time) > 300:
        return False

    # Compute expected signature
    signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
    expected_signature = hmac.new(
        WEBHOOK_SECRET.encode('utf-8'),
        signed_payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    # Constant-time comparison
    return hmac.compare_digest(signature, f"sha256={expected_signature}")

@app.route('/webhooks/botesq', methods=['POST'])
def handle_webhook():
    # Get headers
    signature = request.headers.get('X-BotEsq-Signature', '')
    timestamp = request.headers.get('X-BotEsq-Timestamp', '')
    webhook_id = request.headers.get('X-BotEsq-Webhook-ID', '')

    # Verify signature
    if not verify_signature(request.data, signature, timestamp):
        abort(401, 'Invalid signature')

    # Parse event
    event = json.loads(request.data)
    event_type = event.get('event')

    # Handle different event types
    if event_type == 'consultation.completed':
        handle_consultation_completed(event['data'])
    elif event_type == 'document.analyzed':
        handle_document_analyzed(event['data'])
    elif event_type == 'matter.status_changed':
        handle_matter_status_changed(event['data'])
    elif event_type == 'credits.low':
        handle_credits_low(event['data'])
    elif event_type == 'retainer.expiring':
        handle_retainer_expiring(event['data'])
    else:
        print(f"Unhandled event type: {event_type}")

    return 'OK', 200

def handle_consultation_completed(data: dict):
    print(f"Consultation {data['consultation_id']} completed")
    # Add your business logic here

def handle_document_analyzed(data: dict):
    print(f"Document {data['document_id']} analyzed ({data['page_count']} pages)")
    # Add your business logic here

def handle_matter_status_changed(data: dict):
    print(f"Matter {data['matter_id']}: {data['previous_status']} -> {data['new_status']}")
    # Add your business logic here

def handle_credits_low(data: dict):
    print(f"Low credits warning: {data['credits_remaining']} remaining")
    # Add your business logic here

def handle_retainer_expiring(data: dict):
    print(f"Retainer {data['retainer_id']} expiring at {data['expires_at']}")
    # Add your business logic here

if __name__ == '__main__':
    app.run(port=3000)`}
            />
          </TabsContent>
          <TabsContent value="nodejs" className="mt-4">
            <CodeBlock
              language="typescript"
              code={`import express from 'express';
import crypto from 'crypto';

const app = express();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!;

// Use raw body for signature verification
app.use('/webhooks/botesq', express.raw({ type: 'application/json' }));

function verifySignature(
  payload: Buffer,
  signature: string,
  timestamp: string
): boolean {
  // Check timestamp to prevent replay attacks (5 minute window)
  const webhookTime = parseInt(timestamp);
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - webhookTime) > 300) {
    return false;
  }

  // Compute expected signature
  const signedPayload = \`\${timestamp}.\${payload.toString()}\`;
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');

  // Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(\`sha256=\${expectedSignature}\`)
  );
}

app.post('/webhooks/botesq', (req, res) => {
  const signature = req.headers['x-botesq-signature'] as string;
  const timestamp = req.headers['x-botesq-timestamp'] as string;
  const webhookId = req.headers['x-botesq-webhook-id'] as string;

  // Verify signature
  if (!verifySignature(req.body, signature, timestamp)) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body.toString());

  // Handle different event types
  switch (event.event) {
    case 'consultation.completed':
      handleConsultationCompleted(event.data);
      break;
    case 'document.analyzed':
      handleDocumentAnalyzed(event.data);
      break;
    case 'matter.status_changed':
      handleMatterStatusChanged(event.data);
      break;
    case 'credits.low':
      handleCreditsLow(event.data);
      break;
    case 'retainer.expiring':
      handleRetainerExpiring(event.data);
      break;
    default:
      console.log(\`Unhandled event type: \${event.event}\`);
  }

  res.status(200).send('OK');
});

function handleConsultationCompleted(data: any) {
  console.log(\`Consultation \${data.consultation_id} completed\`);
  // Add your business logic here
}

function handleDocumentAnalyzed(data: any) {
  console.log(\`Document \${data.document_id} analyzed (\${data.page_count} pages)\`);
  // Add your business logic here
}

function handleMatterStatusChanged(data: any) {
  console.log(\`Matter \${data.matter_id}: \${data.previous_status} -> \${data.new_status}\`);
  // Add your business logic here
}

function handleCreditsLow(data: any) {
  console.log(\`Low credits warning: \${data.credits_remaining} remaining\`);
  // Add your business logic here
}

function handleRetainerExpiring(data: any) {
  console.log(\`Retainer \${data.retainer_id} expiring at \${data.expires_at}\`);
  // Add your business logic here
}

app.listen(3000, () => {
  console.log('Webhook server listening on port 3000');
});`}
            />
          </TabsContent>
          <TabsContent value="go" className="mt-4">
            <CodeBlock
              language="go"
              code={`package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"strconv"
	"time"
)

var webhookSecret = "your_webhook_secret_here"

type WebhookEvent struct {
	Event     string                 \`json:"event"\`
	Timestamp string                 \`json:"timestamp"\`
	WebhookID string                 \`json:"webhook_id"\`
	Data      map[string]interface{} \`json:"data"\`
}

func verifySignature(payload []byte, signature, timestamp string) bool {
	// Check timestamp to prevent replay attacks (5 minute window)
	webhookTime, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return false
	}
	currentTime := time.Now().Unix()
	if math.Abs(float64(currentTime-webhookTime)) > 300 {
		return false
	}

	// Compute expected signature
	signedPayload := fmt.Sprintf("%s.%s", timestamp, string(payload))
	mac := hmac.New(sha256.New, []byte(webhookSecret))
	mac.Write([]byte(signedPayload))
	expectedSignature := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	// Constant-time comparison
	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get headers
	signature := r.Header.Get("X-BotEsq-Signature")
	timestamp := r.Header.Get("X-BotEsq-Timestamp")
	webhookID := r.Header.Get("X-BotEsq-Webhook-ID")

	// Read body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Verify signature
	if !verifySignature(body, signature, timestamp) {
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	// Parse event
	var event WebhookEvent
	if err := json.Unmarshal(body, &event); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	log.Printf("Received webhook %s: %s", webhookID, event.Event)

	// Handle different event types
	switch event.Event {
	case "consultation.completed":
		handleConsultationCompleted(event.Data)
	case "document.analyzed":
		handleDocumentAnalyzed(event.Data)
	case "matter.status_changed":
		handleMatterStatusChanged(event.Data)
	case "credits.low":
		handleCreditsLow(event.Data)
	case "retainer.expiring":
		handleRetainerExpiring(event.Data)
	default:
		log.Printf("Unhandled event type: %s", event.Event)
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func handleConsultationCompleted(data map[string]interface{}) {
	log.Printf("Consultation %s completed", data["consultation_id"])
	// Add your business logic here
}

func handleDocumentAnalyzed(data map[string]interface{}) {
	log.Printf("Document %s analyzed (%v pages)", data["document_id"], data["page_count"])
	// Add your business logic here
}

func handleMatterStatusChanged(data map[string]interface{}) {
	log.Printf("Matter %s: %s -> %s", data["matter_id"], data["previous_status"], data["new_status"])
	// Add your business logic here
}

func handleCreditsLow(data map[string]interface{}) {
	log.Printf("Low credits warning: %v remaining", data["credits_remaining"])
	// Add your business logic here
}

func handleRetainerExpiring(data map[string]interface{}) {
	log.Printf("Retainer %s expiring at %s", data["retainer_id"], data["expires_at"])
	// Add your business logic here
}

func main() {
	http.HandleFunc("/webhooks/botesq", webhookHandler)
	log.Println("Webhook server listening on port 3000")
	log.Fatal(http.ListenAndServe(":3000", nil))
}`}
            />
          </TabsContent>
        </Tabs>
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
