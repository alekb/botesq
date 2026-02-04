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
          Here is a minimal example showing the core BotEsq integration flow:
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
    agent_identifier: "legal-assistant"
  });

  const sessionToken = session.content[0].text;
  const { session_token } = JSON.parse(sessionToken);

  // 3. Ask a legal question
  const answer = await client.callTool("ask_legal_question", {
    session_token,
    question: "What are the key elements of a valid contract under California law?",
    jurisdiction: "US-CA"
  });

  console.log(answer.content[0].text);

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
              <CardTitle className="text-lg">Contract Review Workflow</CardTitle>
              <CardDescription>
                Create a matter, submit a document, and get the analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                language="typescript"
                code={`// 1. Create a matter for the contract
const matter = await client.callTool("create_matter", {
  session_token,
  matter_type: "CONTRACT_REVIEW",
  title: "Vendor Agreement Review",
  description: "Review of new vendor agreement with Acme Corp"
});
const { matter_id } = JSON.parse(matter.content[0].text);

// 2. Get and accept the retainer
const retainer = await client.callTool("get_retainer_terms", {
  session_token,
  matter_id
});
const { retainer_id } = JSON.parse(retainer.content[0].text);

await client.callTool("accept_retainer", {
  session_token,
  retainer_id
});

// 3. Submit the document
const documentContent = fs.readFileSync("./contract.pdf");
const doc = await client.callTool("submit_document", {
  session_token,
  filename: "vendor-agreement.pdf",
  content_base64: documentContent.toString("base64"),
  matter_id,
  document_type: "contract",
  notes: "Focus on liability and indemnification"
});
const { document_id } = JSON.parse(doc.content[0].text);

// 4. Poll for analysis (in production, use webhooks)
let analysis;
do {
  await sleep(30000); // Wait 30 seconds
  analysis = await client.callTool("get_document_analysis", {
    session_token,
    document_id
  });
} while (JSON.parse(analysis.content[0].text).status !== "completed");

console.log(analysis.content[0].text);`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Legal Q&A with Context</CardTitle>
              <CardDescription>Ask follow-up questions with accumulated context</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                language="typescript"
                code={`class LegalAssistant {
  private context: string[] = [];

  async ask(question: string, jurisdiction?: string): Promise<string> {
    const result = await this.client.callTool("ask_legal_question", {
      session_token: this.sessionToken,
      question,
      jurisdiction,
      context: this.context.join("\\n\\n")
    });

    const response = JSON.parse(result.content[0].text);

    // Accumulate context for follow-ups
    this.context.push(\`Q: \${question}\`);
    this.context.push(\`A: \${response.answer}\`);

    // Keep context manageable
    if (this.context.length > 10) {
      this.context = this.context.slice(-10);
    }

    return response.answer;
  }
}

// Usage
const assistant = new LegalAssistant(client, sessionToken);
await assistant.ask("What is a non-compete agreement?");
await assistant.ask("Are they enforceable in California?", "US-CA");
await assistant.ask("What about for executives?"); // Context carries over`}
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
await client.callTool("create_matter", { ... });`}
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
            polling for consultations and document analysis
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
