import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock } from '../../components/code-block'

export default function TypeScriptExamplesPage() {
  return (
    <div className="space-y-12">
      {/* Back link */}
      <Link
        href="/docs/examples"
        className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Examples
      </Link>

      {/* Header */}
      <div className="space-y-4">
        <Badge variant="primary">TypeScript</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">TypeScript Examples</h1>
        <p className="text-lg text-text-secondary">
          Complete TypeScript examples using the official MCP SDK to integrate BotEsq legal services
          into your AI agents.
        </p>
      </div>

      {/* Installation */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Installation</h2>
        <CodeBlock
          language="bash"
          code={`# Install the MCP SDK
npm install @modelcontextprotocol/sdk

# Or with pnpm
pnpm add @modelcontextprotocol/sdk`}
        />
      </div>

      {/* Basic example */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Basic Example</h2>
        <p className="text-text-secondary">
          A minimal example showing how to connect and make your first API call:
        </p>
        <CodeBlock
          language="typescript"
          filename="basic-example.ts"
          code={`import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

interface SessionResponse {
  session_token: string;
  operator_name: string;
  credits_available: number;
  services_enabled: string[];
}

interface LegalAnswer {
  answer: string;
  complexity: "simple" | "moderate" | "complex";
  credits_charged: number;
  disclaimer: string;
  attorney_id: string;
}

async function main() {
  // Configure the BotEsq MCP server
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "@botesq/mcp-server"],
    env: { BOTESQ_API_KEY: process.env.BOTESQ_API_KEY! },
  });

  const client = new Client(
    { name: "typescript-legal-assistant", version: "1.0.0" },
    {}
  );

  await client.connect(transport);

  try {
    // Start a session
    const sessionResult = await client.callTool("start_session", {
      api_key: process.env.BOTESQ_API_KEY!,
      agent_identifier: "typescript-example",
    });

    const session: SessionResponse = JSON.parse(
      sessionResult.content[0].text as string
    );
    console.log(\`Session started. Credits: \${session.credits_available}\`);

    // Ask a legal question
    const answerResult = await client.callTool("ask_legal_question", {
      session_token: session.session_token,
      question: "What are the key elements of a valid contract?",
      jurisdiction: "US-CA",
    });

    const answer: LegalAnswer = JSON.parse(
      answerResult.content[0].text as string
    );
    console.log(\`Answer: \${answer.answer}\`);
    console.log(\`Complexity: \${answer.complexity}\`);
    console.log(\`Credits charged: \${answer.credits_charged}\`);
  } finally {
    await client.close();
  }
}

main().catch(console.error);`}
        />
      </div>

      {/* Client class */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">BotEsq Client Class</h2>
        <p className="text-text-secondary">
          A typed, reusable client class with full error handling:
        </p>
        <CodeBlock
          language="typescript"
          filename="botesq-client.ts"
          code={`import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Type definitions
interface SessionResponse {
  session_token: string;
  operator_name: string;
  credits_available: number;
  services_enabled: string[];
}

interface LegalAnswer {
  answer: string;
  complexity: "simple" | "moderate" | "complex";
  credits_charged: number;
  disclaimer: string;
  attorney_id: string;
}

interface Credits {
  credits_available: number;
  credits_used_this_session: number;
  credits_used_all_time: number;
}

interface Matter {
  matter_id: string;
  status: string;
  title: string;
  matter_type: string;
}

type MatterType =
  | "CONTRACT_REVIEW"
  | "ENTITY_FORMATION"
  | "COMPLIANCE"
  | "IP_TRADEMARK"
  | "IP_COPYRIGHT"
  | "IP_PATENT"
  | "EMPLOYMENT"
  | "LITIGATION_CONSULTATION";

interface BotEsqError extends Error {
  code: string;
  details?: Record<string, unknown>;
  request_id?: string;
}

class BotEsqClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private sessionToken: string | null = null;

  constructor(private apiKey: string) {
    this.client = new Client(
      { name: "botesq-ts-client", version: "1.0.0" },
      {}
    );
  }

  async connect(): Promise<SessionResponse> {
    this.transport = new StdioClientTransport({
      command: "npx",
      args: ["-y", "@botesq/mcp-server"],
      env: { BOTESQ_API_KEY: this.apiKey },
    });

    await this.client.connect(this.transport);

    // Auto-start session
    const session = await this.call<SessionResponse>("start_session", {
      api_key: this.apiKey,
      agent_identifier: "botesq-ts-client",
    });

    this.sessionToken = session.session_token;
    return session;
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  private async call<T>(
    tool: string,
    args: Record<string, unknown>
  ): Promise<T> {
    const result = await this.client.callTool(tool, args);

    if (!result.content?.[0]) {
      throw new Error("Empty response from BotEsq");
    }

    const parsed = JSON.parse(result.content[0].text as string);

    if (parsed.error) {
      const error = new Error(parsed.error.message) as BotEsqError;
      error.code = parsed.error.code;
      error.details = parsed.error.details;
      error.request_id = parsed.error.request_id;
      throw error;
    }

    return parsed as T;
  }

  private async callWithSession<T>(
    tool: string,
    args: Record<string, unknown>
  ): Promise<T> {
    if (!this.sessionToken) {
      throw new Error("Not connected. Call connect() first.");
    }
    return this.call<T>(tool, { ...args, session_token: this.sessionToken });
  }

  async askQuestion(
    question: string,
    options?: { jurisdiction?: string; context?: string }
  ): Promise<LegalAnswer> {
    return this.callWithSession<LegalAnswer>("ask_legal_question", {
      question,
      ...options,
    });
  }

  async checkCredits(): Promise<Credits> {
    return this.callWithSession<Credits>("check_credits", {});
  }

  async createMatter(
    type: MatterType,
    title: string,
    options?: { description?: string; urgency?: string }
  ): Promise<Matter> {
    return this.callWithSession<Matter>("create_matter", {
      matter_type: type,
      title,
      ...options,
    });
  }

  async listMatters(options?: {
    status?: string;
    limit?: number;
  }): Promise<{ matters: Matter[]; total: number; has_more: boolean }> {
    return this.callWithSession("list_matters", options || {});
  }

  // Helper to ensure sufficient credits
  async ensureCredits(required: number): Promise<void> {
    const credits = await this.checkCredits();
    if (credits.credits_available < required) {
      const deficit = required - credits.credits_available;
      const amountUsd = Math.max(10, Math.ceil(deficit / 10000) * 10);
      await this.callWithSession("add_credits", {
        amount_usd: Math.min(amountUsd, 1000),
      });
    }
  }
}

// Usage
async function main() {
  const client = new BotEsqClient(process.env.BOTESQ_API_KEY!);

  try {
    const session = await client.connect();
    console.log(\`Connected as \${session.operator_name}\`);

    // Check credits
    const credits = await client.checkCredits();
    console.log(\`Available credits: \${credits.credits_available}\`);

    // Ask a question
    const answer = await client.askQuestion(
      "What is a non-disclosure agreement?",
      { jurisdiction: "US-CA" }
    );
    console.log(answer.answer);
  } finally {
    await client.disconnect();
  }
}

main().catch(console.error);

export { BotEsqClient };`}
        />
      </div>

      {/* Consultation workflow */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Consultation Workflow</h2>
        <p className="text-text-secondary">
          Request an attorney consultation and handle the async response:
        </p>
        <CodeBlock
          language="typescript"
          filename="consultation-workflow.ts"
          code={`interface ConsultationRequest {
  consultation_id: string;
  status: string;
  estimated_completion: string;
  credits_charged: number;
}

interface ConsultationResult {
  consultation_id: string;
  status: "pending" | "in_progress" | "completed";
  response?: string;
  attorney_id?: string;
  completed_at?: string;
  follow_up_available?: boolean;
}

async function requestConsultation(
  client: BotEsqClient,
  question: string,
  options?: {
    matterId?: string;
    context?: string;
    jurisdiction?: string;
    urgent?: boolean;
  }
): Promise<string> {
  // Ensure we have enough credits
  const creditsCost = options?.urgent ? 10000 : 5000;
  await client.ensureCredits(creditsCost);

  // Request the consultation
  const request = await client["callWithSession"]<ConsultationRequest>(
    "request_consultation",
    {
      question,
      matter_id: options?.matterId,
      context: options?.context,
      jurisdiction: options?.jurisdiction,
      urgency: options?.urgent ? "urgent" : "standard",
    }
  );

  console.log(\`Consultation requested: \${request.consultation_id}\`);
  console.log(\`Estimated completion: \${request.estimated_completion}\`);
  console.log(\`Credits charged: \${request.credits_charged}\`);

  // Poll for results (in production, use webhooks)
  console.log("\\nWaiting for attorney response...");

  while (true) {
    await sleep(30000); // Wait 30 seconds

    const result = await client["callWithSession"]<ConsultationResult>(
      "get_consultation_result",
      { consultation_id: request.consultation_id }
    );

    if (result.status === "completed") {
      console.log("\\n=== Consultation Complete ===");
      console.log(\`\\nAttorney Response:\\n\${result.response}\`);
      console.log(\`\\nCompleted at: \${result.completed_at}\`);

      if (result.follow_up_available) {
        console.log("\\nFollow-up questions are available for this consultation.");
      }

      return result.response!;
    }

    console.log(\`Status: \${result.status}...\`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Usage
async function main() {
  const client = new BotEsqClient(process.env.BOTESQ_API_KEY!);
  await client.connect();

  try {
    const response = await requestConsultation(
      client,
      "We are planning to expand our software business to the European Union. " +
        "What are the key legal considerations we should be aware of, " +
        "particularly around GDPR compliance and data transfers?",
      {
        context:
          "We are a B2B SaaS company based in California with " +
          "customers in multiple countries. We process customer data " +
          "including email addresses and usage analytics.",
        jurisdiction: "EU",
        urgent: false,
      }
    );
  } finally {
    await client.disconnect();
  }
}

main().catch(console.error);`}
        />
      </div>

      {/* Vercel AI SDK integration */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Vercel AI SDK Integration</h2>
        <p className="text-text-secondary">Use BotEsq as a tool with the Vercel AI SDK:</p>
        <CodeBlock
          language="typescript"
          filename="vercel-ai-integration.ts"
          code={`import { generateText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Create BotEsq tools for AI SDK
function createBotEsqTools(client: BotEsqClient) {
  return {
    askLegalQuestion: tool({
      description:
        "Ask a legal question and get an authoritative answer from licensed attorneys",
      parameters: z.object({
        question: z.string().describe("The legal question to ask"),
        jurisdiction: z
          .string()
          .optional()
          .describe("Jurisdiction code (e.g., 'US-CA', 'US-NY')"),
      }),
      execute: async ({ question, jurisdiction }) => {
        const answer = await client.askQuestion(question, { jurisdiction });
        return {
          answer: answer.answer,
          complexity: answer.complexity,
          disclaimer: answer.disclaimer,
        };
      },
    }),

    checkCredits: tool({
      description: "Check the current credit balance",
      parameters: z.object({}),
      execute: async () => {
        return client.checkCredits();
      },
    }),

    createMatter: tool({
      description: "Create a new legal matter for organizing documents and consultations",
      parameters: z.object({
        matterType: z.enum([
          "CONTRACT_REVIEW",
          "ENTITY_FORMATION",
          "COMPLIANCE",
          "IP_TRADEMARK",
          "IP_COPYRIGHT",
          "IP_PATENT",
          "EMPLOYMENT",
          "LITIGATION_CONSULTATION",
        ]),
        title: z.string().describe("Brief title for the matter"),
        description: z.string().optional(),
      }),
      execute: async ({ matterType, title, description }) => {
        return client.createMatter(matterType, title, { description });
      },
    }),
  };
}

// Usage with AI SDK
async function main() {
  const botesq = new BotEsqClient(process.env.BOTESQ_API_KEY!);
  await botesq.connect();

  try {
    const result = await generateText({
      model: openai("gpt-4-turbo"),
      tools: createBotEsqTools(botesq),
      maxSteps: 5,
      prompt: \`I'm starting a tech company in California with two co-founders.
        We want to build an AI product. Can you help me understand:
        1. What type of business entity we should form?
        2. What legal agreements we need between founders?
        3. Any IP considerations for AI products?\`,
    });

    console.log(result.text);
  } finally {
    await botesq.disconnect();
  }
}

main().catch(console.error);`}
        />
      </div>

      {/* Error handling */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Error Handling</h2>
        <p className="text-text-secondary">Robust error handling with TypeScript:</p>
        <CodeBlock
          language="typescript"
          filename="error-handling.ts"
          code={`interface BotEsqError extends Error {
  code: string;
  details?: Record<string, unknown>;
  request_id?: string;
}

function isBotEsqError(error: unknown): error is BotEsqError {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof (error as BotEsqError).code === "string"
  );
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000 } = options;
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (isBotEsqError(error)) {
        // Don't retry client errors (except rate limits)
        if (error.code !== "RATE_LIMITED" && !error.code.includes("500")) {
          throw error;
        }
      }

      // Calculate delay with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Usage
async function safeLegalQuery(client: BotEsqClient, question: string) {
  try {
    return await withRetry(() => client.askQuestion(question));
  } catch (error) {
    if (isBotEsqError(error)) {
      switch (error.code) {
        case "INSUFFICIENT_CREDITS":
          console.error("Not enough credits. Please add more.");
          break;
        case "SESSION_EXPIRED":
          // Reconnect and retry
          await client.connect();
          return client.askQuestion(question);
        case "RATE_LIMITED":
          console.error("Rate limited. Please slow down requests.");
          break;
        default:
          console.error(\`BotEsq error [\${error.code}]: \${error.message}\`);
      }

      if (error.request_id) {
        console.error(\`Request ID for support: \${error.request_id}\`);
      }
    }
    throw error;
  }
}`}
        />
      </div>

      {/* Tips */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">TypeScript-Specific Tips</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Best Practices</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-text-secondary">
              <li>Define interfaces for all API responses to get full type safety</li>
              <li>
                Use{' '}
                <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                  zod
                </code>{' '}
                for runtime validation of API responses
              </li>
              <li>Create a singleton client instance for connection reuse</li>
              <li>Use async/await consistently throughout your codebase</li>
              <li>
                Implement proper cleanup with{' '}
                <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                  try/finally
                </code>{' '}
                blocks
              </li>
              <li>Type guard functions help with error handling</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
