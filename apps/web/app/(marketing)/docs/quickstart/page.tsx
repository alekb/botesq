import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock } from '../components/code-block'

export default function QuickstartPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <Badge variant="primary">Getting Started</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">Quickstart Guide</h1>
        <p className="text-lg text-text-secondary">
          Get up and running with BotEsq in under 5 minutes. This guide walks you through the
          essential steps to integrate legal services into your AI agent.
        </p>
      </div>

      {/* Prerequisites */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Prerequisites</h2>
        <ul className="list-inside list-disc space-y-2 text-text-secondary">
          <li>An MCP-compatible AI agent or application</li>
          <li>A BotEsq operator account with API keys</li>
          <li>Credits loaded in your account</li>
        </ul>
      </div>

      {/* Step 1 */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">
          Step 1: Configure MCP Connection
        </h2>
        <p className="text-text-secondary">Add the BotEsq MCP server to your MCP configuration:</p>
        <CodeBlock
          language="json"
          filename="mcp.json"
          code={`{
  "mcpServers": {
    "botesq": {
      "command": "npx",
      "args": ["-y", "@botesq/mcp-server"],
      "env": {
        "BOTESQ_API_KEY": "your-api-key-here"
      }
    }
  }
}`}
        />
      </div>

      {/* Step 2 */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Step 2: Start a Session</h2>
        <p className="text-text-secondary">
          Before using any legal services, start a session with the{' '}
          <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
            start_session
          </code>{' '}
          tool:
        </p>
        <CodeBlock
          language="typescript"
          code={`// Call the start_session tool
const result = await mcp.callTool("start_session", {
  api_key: "your-api-key-here",
  agent_identifier: "my-legal-assistant"
});

// Response includes your session token
// {
//   session_token: "sess_abc123...",
//   operator_name: "Acme Corp",
//   credits_available: 50000,
//   services_enabled: ["legal_qa", "matters", "documents", "consultations"]
// }`}
        />
        <Card className="border-warning-500/50 bg-warning-500/10">
          <CardHeader>
            <CardTitle className="text-warning-500">Important</CardTitle>
          </CardHeader>
          <CardContent className="text-text-secondary">
            Store the{' '}
            <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
              session_token
            </code>{' '}
            securely. You will need it for all subsequent API calls. Sessions expire after 24 hours
            of inactivity.
          </CardContent>
        </Card>
      </div>

      {/* Step 3 */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Step 3: Ask a Legal Question</h2>
        <p className="text-text-secondary">
          Try the instant legal Q&A with the{' '}
          <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
            ask_legal_question
          </code>{' '}
          tool:
        </p>
        <CodeBlock
          language="typescript"
          code={`const answer = await mcp.callTool("ask_legal_question", {
  session_token: "sess_abc123...",
  question: "What are the key elements of a valid contract?",
  jurisdiction: "US-CA"
});

// Response includes the legal answer
// {
//   answer: "A valid contract requires four key elements...",
//   complexity: "simple",
//   credits_charged: 200,
//   disclaimer: "This information is for educational purposes...",
//   attorney_id: "atty_xyz789"
// }`}
        />
      </div>

      {/* Step 4 */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Step 4: Check Your Credits</h2>
        <p className="text-text-secondary">
          Monitor your credit balance with the{' '}
          <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
            check_credits
          </code>{' '}
          tool:
        </p>
        <CodeBlock
          language="typescript"
          code={`const credits = await mcp.callTool("check_credits", {
  session_token: "sess_abc123..."
});

// {
//   credits_available: 49800,
//   credits_used_this_session: 200,
//   credits_used_all_time: 15000
// }`}
        />
      </div>

      {/* Next steps */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Next Steps</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Explore Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">
                Learn about all 16 MCP tools available for legal services.
              </p>
              <a
                href="/docs/tools"
                className="mt-2 inline-block text-sm text-primary-500 hover:underline"
              >
                View all tools →
              </a>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Code Examples</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">
                See complete examples in Python and TypeScript.
              </p>
              <a
                href="/docs/examples"
                className="mt-2 inline-block text-sm text-primary-500 hover:underline"
              >
                View examples →
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
