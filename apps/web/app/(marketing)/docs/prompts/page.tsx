import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock } from '../components/code-block'

const prompts = [
  {
    name: 'contract_review',
    description: 'Template for requesting a comprehensive contract review',
    category: 'Documents',
    arguments: [
      { name: 'contract_type', description: 'Type of contract (e.g., SaaS, employment, NDA)' },
      { name: 'party_role', description: 'Your role (e.g., vendor, customer, employer)' },
      { name: 'key_concerns', description: 'Specific areas to focus on' },
    ],
    example: `{
  "name": "contract_review",
  "arguments": {
    "contract_type": "SaaS Agreement",
    "party_role": "customer",
    "key_concerns": "liability caps, data protection, termination rights"
  }
}`,
    output: `Please review this SaaS Agreement from the perspective of a customer.

Focus particularly on:
- liability caps
- data protection
- termination rights

Provide:
1. Executive summary
2. Key risks identified
3. Recommended changes
4. Red flags (if any)`,
  },
  {
    name: 'entity_formation',
    description: 'Template for entity formation guidance',
    category: 'Business',
    arguments: [
      { name: 'business_type', description: 'Type of business (e.g., tech startup, consulting)' },
      { name: 'jurisdiction', description: 'Where you want to incorporate' },
      { name: 'founders_count', description: 'Number of founders' },
      { name: 'funding_plans', description: 'Whether seeking outside investment' },
    ],
    example: `{
  "name": "entity_formation",
  "arguments": {
    "business_type": "tech startup",
    "jurisdiction": "Delaware",
    "founders_count": "2",
    "funding_plans": "yes, seeking VC funding"
  }
}`,
    output: `I'm starting a tech startup with 2 founders in Delaware.
We are planning to seek VC funding.

Please advise on:
1. Recommended entity type and why
2. Key formation documents needed
3. Initial governance considerations
4. Tax implications to consider
5. Common founder agreement provisions`,
  },
  {
    name: 'compliance_check',
    description: 'Template for compliance assessment',
    category: 'Compliance',
    arguments: [
      { name: 'regulation', description: 'Specific regulation (e.g., GDPR, CCPA, HIPAA)' },
      { name: 'business_model', description: 'How your business operates' },
      { name: 'data_types', description: 'Types of data you collect/process' },
    ],
    example: `{
  "name": "compliance_check",
  "arguments": {
    "regulation": "GDPR",
    "business_model": "B2B SaaS analytics platform",
    "data_types": "user behavior data, email addresses, company information"
  }
}`,
    output: `Please assess our GDPR compliance status.

Business model: B2B SaaS analytics platform

Data we collect/process:
- user behavior data
- email addresses
- company information

Please provide:
1. Applicability assessment
2. Key compliance requirements
3. Gap analysis framework
4. Priority action items
5. Documentation requirements`,
  },
  {
    name: 'ip_question',
    description: 'Template for intellectual property questions',
    category: 'IP',
    arguments: [
      { name: 'ip_type', description: 'Type of IP (trademark, copyright, patent, trade secret)' },
      { name: 'asset_description', description: 'Description of the IP asset' },
      { name: 'question_type', description: 'Protection, infringement, licensing, etc.' },
    ],
    example: `{
  "name": "ip_question",
  "arguments": {
    "ip_type": "trademark",
    "asset_description": "company name and logo for a fintech startup",
    "question_type": "protection strategy"
  }
}`,
    output: `I have a trademark question regarding:
Asset: company name and logo for a fintech startup

Question type: protection strategy

Please advise on:
1. Registration process and timeline
2. Classes of goods/services to consider
3. Search and clearance recommendations
4. International protection considerations
5. Enforcement basics`,
  },
  {
    name: 'general_legal',
    description: 'General-purpose legal question template',
    category: 'General',
    arguments: [
      { name: 'topic', description: 'Legal topic or area' },
      { name: 'context', description: 'Relevant background information' },
      { name: 'specific_question', description: 'Your specific question' },
    ],
    example: `{
  "name": "general_legal",
  "arguments": {
    "topic": "employment law",
    "context": "Remote-first company with employees in multiple states",
    "specific_question": "What are the key compliance considerations for multi-state employment?"
  }
}`,
    output: `Legal topic: employment law

Context: Remote-first company with employees in multiple states

Specific question: What are the key compliance considerations for multi-state employment?

Please provide a comprehensive answer addressing:
1. Direct answer to the question
2. Relevant legal framework
3. Practical considerations
4. Risk factors
5. Recommended next steps`,
  },
]

export default function PromptsPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <Badge variant="primary">Reference</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">MCP Prompts</h1>
        <p className="text-lg text-text-secondary">
          BotEsq provides pre-built prompts to help structure common legal inquiries. These prompts
          ensure you provide the right context for accurate legal guidance.
        </p>
      </div>

      {/* What are prompts */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">What are MCP Prompts?</h2>
        <p className="text-text-secondary">
          MCP prompts are templates that help structure requests to the BotEsq legal AI. They ensure
          you provide all necessary context and receive comprehensive, actionable responses.
        </p>
        <p className="text-text-secondary">
          Prompts are optional but recommended for common use cases. They help standardize requests
          and improve response quality.
        </p>
      </div>

      {/* Using prompts */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Using Prompts</h2>
        <p className="text-text-secondary">
          To use a prompt, call{' '}
          <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
            mcp.getPrompt()
          </code>{' '}
          with the prompt name and arguments:
        </p>
        <CodeBlock
          language="typescript"
          code={`// Get the prompt template with your arguments
const prompt = await mcp.getPrompt("contract_review", {
  contract_type: "SaaS Agreement",
  party_role: "customer",
  key_concerns: "liability caps, data protection"
});

// Use the generated prompt with ask_legal_question
const result = await mcp.callTool("ask_legal_question", {
  session_token: "sess_xyz789...",
  question: prompt.messages[0].content
});`}
        />
      </div>

      {/* Available prompts */}
      <div className="space-y-8">
        <h2 className="text-2xl font-semibold text-text-primary">Available Prompts</h2>

        {prompts.map((prompt) => (
          <Card key={prompt.name} id={prompt.name}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <CardTitle className="font-mono">{prompt.name}</CardTitle>
                <Badge variant="secondary">{prompt.category}</Badge>
              </div>
              <CardDescription>{prompt.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Arguments */}
              <div className="space-y-2">
                <h4 className="font-medium text-text-primary">Arguments</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-default">
                        <th className="py-2 text-left font-medium text-text-primary">Name</th>
                        <th className="py-2 text-left font-medium text-text-primary">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-text-secondary">
                      {prompt.arguments.map((arg) => (
                        <tr key={arg.name} className="border-b border-border-default">
                          <td className="py-2 font-mono text-primary-500">{arg.name}</td>
                          <td className="py-2">{arg.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Example input */}
              <div className="space-y-2">
                <h4 className="font-medium text-text-primary">Example Input</h4>
                <CodeBlock language="json" code={prompt.example} />
              </div>

              {/* Example output */}
              <div className="space-y-2">
                <h4 className="font-medium text-text-primary">Generated Prompt</h4>
                <CodeBlock language="text" code={prompt.output} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom prompts note */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Custom Prompts</h2>
        <p className="text-text-secondary">
          While these pre-built prompts cover common scenarios, you can always craft custom
          questions for the{' '}
          <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
            ask_legal_question
          </code>{' '}
          tool. For best results:
        </p>
        <ul className="list-inside list-disc space-y-2 text-text-secondary">
          <li>Provide relevant context and background</li>
          <li>Be specific about what you need</li>
          <li>Include the applicable jurisdiction</li>
          <li>Mention any time constraints</li>
          <li>List specific concerns or focus areas</li>
        </ul>
      </div>
    </div>
  )
}
