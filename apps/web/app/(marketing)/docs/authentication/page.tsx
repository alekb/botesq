import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock } from '../components/code-block'
import { MultiLanguageCodeBlock } from '../components/multi-language-code-block'
import { TYPESCRIPT_PYTHON } from '../components/code-samples'

export default function AuthenticationPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <Badge variant="primary">Authentication</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">Authentication</h1>
        <p className="text-lg text-text-secondary">
          Learn how to authenticate your AI agents with BotEsq using API keys and session tokens.
        </p>
      </div>

      {/* Overview */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Overview</h2>
        <p className="text-text-secondary">BotEsq uses a two-step authentication process:</p>
        <ol className="list-inside list-decimal space-y-2 text-text-secondary">
          <li>
            <strong className="text-text-primary">API Key</strong> - Used to identify your operator
            account and start sessions
          </li>
          <li>
            <strong className="text-text-primary">Session Token</strong> - Short-lived token used
            for all subsequent API calls
          </li>
        </ol>
      </div>

      {/* API Keys */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">API Keys</h2>
        <p className="text-text-secondary">
          API keys are long-lived credentials that identify your operator account. They are used
          only for starting sessions.
        </p>
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-text-primary">Key Format</h3>
          <CodeBlock
            language="text"
            code={`botesq_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
botesq_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}
          />
          <ul className="list-inside list-disc space-y-2 text-text-secondary">
            <li>
              <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                botesq_live_
              </code>{' '}
              - Production API keys
            </li>
            <li>
              <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                botesq_test_
              </code>{' '}
              - Test/sandbox API keys (no real charges)
            </li>
          </ul>
        </div>
        <Card className="border-error-500/50 bg-error-500/10">
          <CardHeader>
            <CardTitle className="text-error-500">Security Warning</CardTitle>
          </CardHeader>
          <CardContent className="text-text-secondary">
            Never expose your API keys in client-side code, public repositories, or logs. Treat them
            like passwords.
          </CardContent>
        </Card>
      </div>

      {/* Session Tokens */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Session Tokens</h2>
        <p className="text-text-secondary">
          Session tokens are short-lived credentials created by the{' '}
          <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
            start_session
          </code>{' '}
          tool. They are used for all subsequent API calls.
        </p>
        <MultiLanguageCodeBlock
          samples={TYPESCRIPT_PYTHON(
            `const session = await mcp.callTool("start_session", {
  api_key: process.env.BOTESQ_API_KEY,
  agent_identifier: "my-legal-assistant-v1"
});

// Store the session token for subsequent calls
const sessionToken = session.session_token;`,
            `import os

session = await mcp_session.call_tool(
    "start_session",
    arguments={
        "api_key": os.environ["BOTESQ_API_KEY"],
        "agent_identifier": "my-legal-assistant-v1"
    }
)
session_data = json.loads(session.content[0].text)

# Store the session token for subsequent calls
session_token = session_data["session_token"]`
          )}
        />
        <h3 className="text-lg font-medium text-text-primary">Session Properties</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th className="py-3 text-left font-medium text-text-primary">Property</th>
                <th className="py-3 text-left font-medium text-text-primary">Value</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              <tr className="border-b border-border-default">
                <td className="py-3">Expiration</td>
                <td className="py-3">24 hours after last activity</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3">Renewal</td>
                <td className="py-3">Automatic on each API call</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3">Format</td>
                <td className="py-3">
                  <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                    sess_xxxxxxxx...
                  </code>
                </td>
              </tr>
              <tr>
                <td className="py-3">Scope</td>
                <td className="py-3">Single agent instance</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Environment Variables */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Environment Variables</h2>
        <p className="text-text-secondary">
          We recommend storing your API key in an environment variable:
        </p>
        <CodeBlock
          language="bash"
          filename=".env"
          code={`# BotEsq API Configuration
BOTESQ_API_KEY=botesq_live_your_api_key_here

# Optional: Override the default server URL
BOTESQ_SERVER_URL=https://api.botesq.com`}
        />
      </div>

      {/* Session Management */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Session Management</h2>
        <p className="text-text-secondary">
          Best practices for managing sessions in your application:
        </p>
        <MultiLanguageCodeBlock
          samples={TYPESCRIPT_PYTHON(
            `class BotEsqClient {
  private sessionToken: string | null = null;
  private sessionExpiry: Date | null = null;

  async ensureSession(): Promise<string> {
    // Check if we have a valid session
    if (this.sessionToken && this.sessionExpiry && this.sessionExpiry > new Date()) {
      return this.sessionToken;
    }

    // Start a new session
    const session = await this.mcp.callTool("start_session", {
      api_key: process.env.BOTESQ_API_KEY,
      agent_identifier: "my-agent"
    });

    this.sessionToken = session.session_token;
    // Sessions last 24 hours, but refresh on activity
    this.sessionExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000);

    return this.sessionToken;
  }

  async askQuestion(question: string): Promise<string> {
    const token = await this.ensureSession();

    const result = await this.mcp.callTool("ask_legal_question", {
      session_token: token,
      question
    });

    return result.answer;
  }
}`,
            `import os
import json
from datetime import datetime, timedelta
from typing import Optional

class BotEsqClient:
    def __init__(self, mcp_session):
        self.mcp = mcp_session
        self.session_token: Optional[str] = None
        self.session_expiry: Optional[datetime] = None

    async def ensure_session(self) -> str:
        # Check if we have a valid session
        if self.session_token and self.session_expiry and self.session_expiry > datetime.now():
            return self.session_token

        # Start a new session
        result = await self.mcp.call_tool(
            "start_session",
            arguments={
                "api_key": os.environ["BOTESQ_API_KEY"],
                "agent_identifier": "my-agent"
            }
        )
        session_data = json.loads(result.content[0].text)

        self.session_token = session_data["session_token"]
        # Sessions last 24 hours, but refresh on activity
        self.session_expiry = datetime.now() + timedelta(hours=23)

        return self.session_token

    async def ask_question(self, question: str) -> str:
        token = await self.ensure_session()

        result = await self.mcp.call_tool(
            "ask_legal_question",
            arguments={
                "session_token": token,
                "question": question
            }
        )
        answer_data = json.loads(result.content[0].text)

        return answer_data["answer"]`
          )}
        />
      </div>

      {/* Error Handling */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Authentication Errors</h2>
        <p className="text-text-secondary">Handle these common authentication errors:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th className="py-3 text-left font-medium text-text-primary">Error Code</th>
                <th className="py-3 text-left font-medium text-text-primary">Description</th>
                <th className="py-3 text-left font-medium text-text-primary">Resolution</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              <tr className="border-b border-border-default">
                <td className="py-3 font-mono">INVALID_API_KEY</td>
                <td className="py-3">API key is malformed or revoked</td>
                <td className="py-3">Check your API key in the dashboard</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3 font-mono">SESSION_EXPIRED</td>
                <td className="py-3">Session token has expired</td>
                <td className="py-3">Call start_session again</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3 font-mono">INVALID_SESSION</td>
                <td className="py-3">Session token is invalid</td>
                <td className="py-3">Call start_session again</td>
              </tr>
              <tr>
                <td className="py-3 font-mono">RATE_LIMITED</td>
                <td className="py-3">Too many requests</td>
                <td className="py-3">Implement exponential backoff</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
