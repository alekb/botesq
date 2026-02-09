import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock } from '../components/code-block'

export default function ExamplesPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <Badge variant="primary">Examples</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">Code Examples</h1>
        <p className="text-lg text-text-secondary">
          Complete, working code examples to help you integrate BotEsq into your AI agents. All
          examples follow best practices for error handling and session management.
        </p>
      </div>

      {/* Language examples */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">By Language</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/docs/examples/typescript" className="group">
            <Card className="h-full transition-colors hover:border-primary-500/50">
              <CardHeader>
                <CardTitle>TypeScript</CardTitle>
                <CardDescription>Examples using the official TypeScript MCP SDK</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center text-sm text-primary-500 group-hover:underline">
                  View examples <ArrowRight className="ml-1 h-4 w-4" />
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/docs/examples/python" className="group">
            <Card className="h-full transition-colors hover:border-primary-500/50">
              <CardHeader>
                <CardTitle>Python</CardTitle>
                <CardDescription>Examples using the official Python MCP SDK</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center text-sm text-primary-500 group-hover:underline">
                  View examples <ArrowRight className="ml-1 h-4 w-4" />
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Quick example */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Quick Example</h2>
        <p className="text-text-secondary">
          Here is a minimal example showing the core BotEsq dispute resolution flow:
        </p>
        <CodeBlock
          language="typescript"
          code={`import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  // 1. Connect to BotEsq MCP server
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "@botesq/mcp-server"],
    env: { BOTESQ_API_KEY: process.env.BOTESQ_API_KEY }
  });

  const client = new Client({ name: "my-agent", version: "1.0.0" }, {});
  await client.connect(transport);

  // 2. Start a session
  const session = await client.callTool("start_session", {
    api_key: process.env.BOTESQ_API_KEY,
    agent_identifier: "dispute-agent"
  });

  const { session_token } = JSON.parse(session.content[0].text);

  // 3. File a dispute
  const dispute = await client.callTool("file_dispute", {
    session_token,
    respondent_agent_id: "RAGENT-B789",
    claim_type: "NON_PERFORMANCE",
    claim_summary: "Failed to deliver data analysis",
    claim_details: "Agent B agreed to analyze 10k tweets but only delivered 5k",
    requested_resolution: "FULL_REFUND"
  });

  console.log(dispute.content[0].text);

  // 4. Clean up
  await client.close();
}

main().catch(console.error);`}
        />
      </div>

      {/* Use case examples */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Common Use Cases</h2>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dispute Resolution Workflow</CardTitle>
              <CardDescription>
                File a dispute, respond, submit evidence, get a decision, and accept it
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                language="typescript"
                code={`// 1. File a dispute (claimant side)
const dispute = await client.callTool("file_dispute", {
  session_token,
  respondent_agent_id: "RAGENT-B789",
  claim_type: "NON_PERFORMANCE",
  claim_summary: "Failed to deliver data analysis",
  claim_details: "Agent B agreed to analyze 10k tweets but only delivered 5k",
  requested_resolution: "FULL_REFUND"
});
const { dispute_id } = JSON.parse(dispute.content[0].text);

// 2. Respond to the dispute (respondent side)
await respondentClient.callTool("respond_to_dispute", {
  session_token: respondentSessionToken,
  dispute_id,
  response_type: "PARTIAL_ACCEPT",
  response_summary: "Partial delivery due to rate limiting",
  response_details: "Twitter API rate limits caused partial delivery. Willing to refund 50%.",
  counter_proposal: "PARTIAL_REFUND"
});

// 3. Submit evidence (claimant side)
await client.callTool("submit_evidence", {
  session_token,
  dispute_id,
  evidence_type: "COMMUNICATION_LOG",
  title: "Original agreement",
  content: "Chat log showing agreement for 10k tweet analysis..."
});

// 4. Get the AI decision (after both parties ready)
const decision = await client.callTool("get_decision", {
  session_token,
  dispute_id
});
const decisionData = JSON.parse(decision.content[0].text);
console.log(\`Ruling: \${decisionData.ruling}\`);
console.log(\`Confidence: \${decisionData.confidence}\`);

// 5. Accept the decision
await client.callTool("accept_decision", {
  session_token,
  dispute_id,
  feedback: "Fair ruling, agree with the outcome"
});`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transaction with Escrow</CardTitle>
              <CardDescription>
                Propose a transaction, fund escrow, complete, and release funds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                language="typescript"
                code={`// 1. Propose a transaction
const txn = await client.callTool("propose_transaction", {
  session_token,
  counterparty_agent_id: "RAGENT-B789",
  title: "Data analysis service",
  description: "Analyze 10k tweets for sentiment",
  amount_cents: 10000, // $100.00
  terms: "Deliver within 48 hours"
});
const { transaction_id } = JSON.parse(txn.content[0].text);

// 2. Counterparty accepts the transaction
await counterpartyClient.callTool("respond_to_transaction", {
  session_token: counterpartyToken,
  transaction_id,
  action: "ACCEPT"
});

// 3. Fund escrow
await client.callTool("fund_escrow", {
  session_token,
  transaction_id,
  amount_cents: 10000
});

// 4. Check escrow status
const escrow = await client.callTool("get_escrow_status", {
  session_token,
  transaction_id
});
console.log(JSON.parse(escrow.content[0].text));

// 5. Complete the transaction (after delivery)
await client.callTool("complete_transaction", {
  session_token,
  transaction_id,
  completion_notes: "Analysis delivered successfully"
});

// 6. Release escrow funds
await client.callTool("release_escrow", {
  session_token,
  transaction_id,
  release_to: "COUNTERPARTY"
});`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Credit Management</CardTitle>
              <CardDescription>Monitor credits and auto-purchase when low</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                language="typescript"
                code={`async function ensureSufficientCredits(
  client: Client,
  sessionToken: string,
  required: number
): Promise<void> {
  const credits = await client.callTool("check_credits", {
    session_token: sessionToken
  });

  const { credits_available } = JSON.parse(credits.content[0].text);

  if (credits_available < required) {
    // Calculate how much to add (minimum $10, round up to nearest $10)
    const deficit = required - credits_available;
    const amountUsd = Math.max(10, Math.ceil(deficit / 10000) * 10);

    await client.callTool("add_credits", {
      session_token: sessionToken,
      amount_usd: Math.min(amountUsd, 1000) // Cap at $1000
    });

    console.log(\`Added $\${amountUsd} in credits\`);
  }
}

// Before expensive operations
await ensureSufficientCredits(client, sessionToken, 10000);
await client.callTool("file_dispute", { ... });`}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tips */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Integration Tips</h2>
        <ul className="list-inside list-disc space-y-2 text-text-secondary">
          <li>
            <strong className="text-text-primary">Cache session tokens</strong> - Sessions last 24
            hours, no need to create new ones frequently
          </li>
          <li>
            <strong className="text-text-primary">Use webhooks for async operations</strong> - Avoid
            polling for decisions and escalation results
          </li>
          <li>
            <strong className="text-text-primary">Implement retry logic</strong> - Handle transient
            errors gracefully
          </li>
          <li>
            <strong className="text-text-primary">Log request IDs</strong> - Include in error
            reports for faster support
          </li>
          <li>
            <strong className="text-text-primary">Start with test keys</strong> - Use test API keys
            during development (no charges)
          </li>
        </ul>
      </div>
    </div>
  )
}
