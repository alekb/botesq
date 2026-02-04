import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock } from '../../components/code-block'

export default function PythonExamplesPage() {
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
        <Badge variant="primary">Python</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">Python Examples</h1>
        <p className="text-lg text-text-secondary">
          Complete Python examples using the official MCP Python SDK to integrate BotEsq legal
          services into your AI agents.
        </p>
      </div>

      {/* Installation */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Installation</h2>
        <CodeBlock
          language="bash"
          code={`# Install the MCP Python SDK
pip install mcp

# Or with poetry
poetry add mcp`}
        />
      </div>

      {/* Basic example */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Basic Example</h2>
        <p className="text-text-secondary">
          A minimal example showing how to connect and make your first API call:
        </p>
        <CodeBlock
          language="python"
          filename="basic_example.py"
          code={`import asyncio
import json
import os
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    # Configure the BotEsq MCP server
    server_params = StdioServerParameters(
        command="npx",
        args=["-y", "@botesq/mcp-server"],
        env={"BOTESQ_API_KEY": os.environ["BOTESQ_API_KEY"]}
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize the connection
            await session.initialize()

            # Start a session
            result = await session.call_tool(
                "start_session",
                arguments={
                    "api_key": os.environ["BOTESQ_API_KEY"],
                    "agent_identifier": "python-legal-assistant"
                }
            )
            session_data = json.loads(result.content[0].text)
            session_token = session_data["session_token"]
            print(f"Session started. Credits: {session_data['credits_available']}")

            # Ask a legal question
            result = await session.call_tool(
                "ask_legal_question",
                arguments={
                    "session_token": session_token,
                    "question": "What are the key elements of a valid contract?",
                    "jurisdiction": "US-CA"
                }
            )
            answer = json.loads(result.content[0].text)
            print(f"Answer: {answer['answer']}")
            print(f"Credits charged: {answer['credits_charged']}")

if __name__ == "__main__":
    asyncio.run(main())`}
        />
      </div>

      {/* Client class */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">BotEsq Client Class</h2>
        <p className="text-text-secondary">
          A reusable client class with session management and error handling:
        </p>
        <CodeBlock
          language="python"
          filename="botesq_client.py"
          code={`import asyncio
import json
import os
from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

@dataclass
class LegalAnswer:
    answer: str
    complexity: str
    credits_charged: int
    disclaimer: str
    attorney_id: str

@dataclass
class Matter:
    matter_id: str
    status: str
    title: str
    matter_type: str

class BotEsqClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.session_token: Optional[str] = None
        self._session: Optional[ClientSession] = None
        self._context_manager = None

    async def connect(self):
        """Connect to the BotEsq MCP server."""
        server_params = StdioServerParameters(
            command="npx",
            args=["-y", "@botesq/mcp-server"],
            env={"BOTESQ_API_KEY": self.api_key}
        )
        self._context_manager = stdio_client(server_params)
        read, write = await self._context_manager.__aenter__()
        self._session = ClientSession(read, write)
        await self._session.__aenter__()
        await self._session.initialize()

        # Auto-start session
        result = await self._call("start_session", {
            "api_key": self.api_key,
            "agent_identifier": "python-client"
        })
        self.session_token = result["session_token"]
        return result

    async def disconnect(self):
        """Disconnect from the server."""
        if self._session:
            await self._session.__aexit__(None, None, None)
        if self._context_manager:
            await self._context_manager.__aexit__(None, None, None)

    async def _call(self, tool: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Call an MCP tool and parse the result."""
        if not self._session:
            raise RuntimeError("Not connected. Call connect() first.")

        result = await self._session.call_tool(tool, arguments=args)
        return json.loads(result.content[0].text)

    async def _call_with_session(self, tool: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Call a tool that requires session_token."""
        if not self.session_token:
            raise RuntimeError("No session. Call connect() first.")
        args["session_token"] = self.session_token
        return await self._call(tool, args)

    async def ask_question(
        self,
        question: str,
        jurisdiction: Optional[str] = None,
        context: Optional[str] = None
    ) -> LegalAnswer:
        """Ask a legal question."""
        args = {"question": question}
        if jurisdiction:
            args["jurisdiction"] = jurisdiction
        if context:
            args["context"] = context

        result = await self._call_with_session("ask_legal_question", args)
        return LegalAnswer(**result)

    async def check_credits(self) -> Dict[str, int]:
        """Check credit balance."""
        return await self._call_with_session("check_credits", {})

    async def create_matter(
        self,
        matter_type: str,
        title: str,
        description: Optional[str] = None,
        urgency: str = "normal"
    ) -> Matter:
        """Create a new legal matter."""
        args = {
            "matter_type": matter_type,
            "title": title,
            "urgency": urgency
        }
        if description:
            args["description"] = description

        result = await self._call_with_session("create_matter", args)
        return Matter(
            matter_id=result["matter_id"],
            status=result["status"],
            title=title,
            matter_type=matter_type
        )

    async def list_matters(
        self,
        status: Optional[str] = None,
        limit: int = 20
    ) -> List[Matter]:
        """List all matters."""
        args = {"limit": limit}
        if status:
            args["status"] = status

        result = await self._call_with_session("list_matters", args)
        return [Matter(**m) for m in result["matters"]]

# Usage example
async def main():
    client = BotEsqClient(os.environ["BOTESQ_API_KEY"])

    try:
        await client.connect()
        print("Connected!")

        # Check credits
        credits = await client.check_credits()
        print(f"Available credits: {credits['credits_available']}")

        # Ask a question
        answer = await client.ask_question(
            "What is the statute of limitations for breach of contract in California?",
            jurisdiction="US-CA"
        )
        print(f"Answer: {answer.answer}")

    finally:
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())`}
        />
      </div>

      {/* Document review example */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Document Review Example</h2>
        <p className="text-text-secondary">
          Complete workflow for submitting and reviewing a document:
        </p>
        <CodeBlock
          language="python"
          filename="document_review.py"
          code={`import asyncio
import base64
import json
from pathlib import Path

async def review_document(client: BotEsqClient, file_path: str):
    """Submit a document for legal review and wait for analysis."""

    # 1. Create a matter
    matter = await client.create_matter(
        matter_type="CONTRACT_REVIEW",
        title=f"Review of {Path(file_path).name}",
        description="Automated contract review request"
    )
    print(f"Created matter: {matter.matter_id}")

    # 2. Get and accept retainer
    retainer = await client._call_with_session("get_retainer_terms", {
        "matter_id": matter.matter_id
    })
    print(f"Retainer terms received. Scope: {retainer['scope_of_work']}")

    await client._call_with_session("accept_retainer", {
        "retainer_id": retainer["retainer_id"]
    })
    print("Retainer accepted.")

    # 3. Read and encode the document
    with open(file_path, "rb") as f:
        content_base64 = base64.b64encode(f.read()).decode("utf-8")

    # 4. Submit the document
    doc_result = await client._call_with_session("submit_document", {
        "filename": Path(file_path).name,
        "content_base64": content_base64,
        "matter_id": matter.matter_id,
        "document_type": "contract",
        "notes": "Please identify key risks and unfavorable terms"
    })
    document_id = doc_result["document_id"]
    print(f"Document submitted: {document_id}")
    print(f"Pages: {doc_result['page_count']}, Credits: {doc_result['credits_charged']}")

    # 5. Poll for analysis (in production, use webhooks)
    print("Waiting for analysis...")
    while True:
        await asyncio.sleep(30)
        analysis = await client._call_with_session("get_document_analysis", {
            "document_id": document_id
        })

        if analysis["status"] == "completed":
            print("\\n=== Analysis Complete ===")
            print(f"\\nSummary:\\n{analysis['summary']}")
            print(f"\\nKey Findings:")
            for finding in analysis.get("key_findings", []):
                print(f"  - {finding['title']}: {finding['description']}")
            print(f"\\nRisks:")
            for risk in analysis.get("risks", []):
                print(f"  [{risk['severity']}] {risk['description']}")
            print(f"\\nRecommendations:")
            for rec in analysis.get("recommendations", []):
                print(f"  - {rec}")
            break
        elif analysis["status"] == "failed":
            print(f"Analysis failed: {analysis.get('error')}")
            break
        else:
            print(f"Status: {analysis['status']}...")

# Run
async def main():
    client = BotEsqClient(os.environ["BOTESQ_API_KEY"])
    await client.connect()

    try:
        await review_document(client, "./contract.pdf")
    finally:
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())`}
        />
      </div>

      {/* LangChain integration */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">LangChain Integration</h2>
        <p className="text-text-secondary">Use BotEsq as a tool in LangChain agents:</p>
        <CodeBlock
          language="python"
          filename="langchain_tool.py"
          code={`from langchain.tools import BaseTool
from langchain.agents import initialize_agent, AgentType
from langchain.chat_models import ChatOpenAI
from pydantic import BaseModel, Field
from typing import Optional

class LegalQuestionInput(BaseModel):
    question: str = Field(description="The legal question to ask")
    jurisdiction: Optional[str] = Field(
        default=None,
        description="Jurisdiction code (e.g., 'US-CA', 'US-NY')"
    )

class BotEsqLegalTool(BaseTool):
    name = "legal_question"
    description = """Use this tool to ask legal questions.
    Input should be a legal question. Optionally specify jurisdiction.
    Returns authoritative legal guidance from licensed attorneys."""
    args_schema = LegalQuestionInput

    def __init__(self, botesq_client: BotEsqClient):
        super().__init__()
        self._client = botesq_client

    def _run(self, question: str, jurisdiction: Optional[str] = None) -> str:
        # Synchronous wrapper for LangChain
        import asyncio
        loop = asyncio.get_event_loop()
        answer = loop.run_until_complete(
            self._client.ask_question(question, jurisdiction)
        )
        return f"{answer.answer}\\n\\n[Disclaimer: {answer.disclaimer}]"

    async def _arun(self, question: str, jurisdiction: Optional[str] = None) -> str:
        answer = await self._client.ask_question(question, jurisdiction)
        return f"{answer.answer}\\n\\n[Disclaimer: {answer.disclaimer}]"

# Usage with LangChain agent
async def create_legal_agent():
    client = BotEsqClient(os.environ["BOTESQ_API_KEY"])
    await client.connect()

    legal_tool = BotEsqLegalTool(client)
    llm = ChatOpenAI(model="gpt-4", temperature=0)

    agent = initialize_agent(
        tools=[legal_tool],
        llm=llm,
        agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION,
        verbose=True
    )

    return agent, client

# Run
async def main():
    agent, client = await create_legal_agent()

    try:
        result = agent.run(
            "I'm starting a software company in California with two co-founders. "
            "What type of business entity should we form and what are the key "
            "legal documents we need?"
        )
        print(result)
    finally:
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())`}
        />
      </div>

      {/* Tips */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Python-Specific Tips</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Best Practices</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-text-secondary">
              <li>
                Use{' '}
                <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                  async/await
                </code>{' '}
                throughout - the MCP SDK is fully async
              </li>
              <li>
                Use context managers (
                <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                  async with
                </code>
                ) for proper resource cleanup
              </li>
              <li>
                Consider using{' '}
                <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                  pydantic
                </code>{' '}
                for response validation
              </li>
              <li>
                Use{' '}
                <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
                  python-dotenv
                </code>{' '}
                for environment variables
              </li>
              <li>Implement proper error handling with try/except blocks</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
