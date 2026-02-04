import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const toolCategories = [
  {
    name: 'Session Management',
    description: 'Tools for authentication and session handling',
    tools: [
      {
        name: 'start_session',
        slug: 'start-session',
        description: 'Start a new authenticated session',
        paid: false,
      },
      {
        name: 'get_session_info',
        slug: 'get-session-info',
        description: 'Get information about the current session',
        paid: false,
      },
    ],
  },
  {
    name: 'Information',
    description: 'Tools for retrieving service information',
    tools: [
      {
        name: 'list_services',
        slug: 'list-services',
        description: 'List all available legal services',
        paid: false,
      },
      {
        name: 'get_disclaimers',
        slug: 'get-disclaimers',
        description: 'Get legal disclaimers and terms',
        paid: false,
      },
    ],
  },
  {
    name: 'Credits',
    description: 'Tools for managing credits and billing',
    tools: [
      {
        name: 'check_credits',
        slug: 'check-credits',
        description: 'Check your current credit balance',
        paid: false,
      },
      {
        name: 'add_credits',
        slug: 'add-credits',
        description: 'Add credits to your account',
        paid: false,
      },
    ],
  },
  {
    name: 'Legal Q&A',
    description: 'Instant answers to legal questions',
    tools: [
      {
        name: 'ask_legal_question',
        slug: 'ask-legal-question',
        description: 'Ask a legal question and get an instant answer',
        paid: true,
      },
    ],
  },
  {
    name: 'Matter Management',
    description: 'Tools for creating and managing legal matters',
    tools: [
      {
        name: 'create_matter',
        slug: 'create-matter',
        description: 'Create a new legal matter',
        paid: true,
      },
      {
        name: 'get_matter_status',
        slug: 'get-matter-status',
        description: 'Get the status of a matter',
        paid: false,
      },
      {
        name: 'list_matters',
        slug: 'list-matters',
        description: 'List all matters for the session',
        paid: false,
      },
    ],
  },
  {
    name: 'Retainers',
    description: 'Tools for retainer agreement management',
    tools: [
      {
        name: 'get_retainer_terms',
        slug: 'get-retainer-terms',
        description: 'Get retainer terms for a matter',
        paid: false,
      },
      {
        name: 'accept_retainer',
        slug: 'accept-retainer',
        description: 'Accept a retainer agreement',
        paid: false,
      },
    ],
  },
  {
    name: 'Documents',
    description: 'Tools for document submission and analysis',
    tools: [
      {
        name: 'submit_document',
        slug: 'submit-document',
        description: 'Submit a document for review',
        paid: true,
      },
      {
        name: 'get_document_analysis',
        slug: 'get-document-analysis',
        description: 'Get analysis results for a document',
        paid: false,
      },
    ],
  },
  {
    name: 'Consultations',
    description: 'Tools for requesting legal consultations',
    tools: [
      {
        name: 'request_consultation',
        slug: 'request-consultation',
        description: 'Request a legal consultation',
        paid: true,
      },
      {
        name: 'get_consultation_result',
        slug: 'get-consultation-result',
        description: 'Get the result of a consultation',
        paid: false,
      },
    ],
  },
]

export default function ToolsPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <Badge variant="primary">Reference</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">MCP Tools</h1>
        <p className="text-lg text-text-secondary">
          BotEsq provides 16 MCP tools for integrating legal services into your AI agents. Each tool
          is designed for a specific task and includes built-in validation and error handling.
        </p>
      </div>

      {/* Tool categories */}
      {toolCategories.map((category) => (
        <div key={category.name} className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary">{category.name}</h2>
            <p className="text-text-secondary">{category.description}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {category.tools.map((tool) => (
              <Link key={tool.slug} href={`/docs/tools/${tool.slug}`} className="group">
                <Card className="h-full transition-colors hover:border-primary-500/50">
                  <CardHeader>
                    <CardTitle className="font-mono text-base">{tool.name}</CardTitle>
                    <CardDescription>{tool.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant={tool.paid ? 'primary' : 'secondary'}>
                        {tool.paid ? 'Paid' : 'Free'}
                      </Badge>
                      <span className="text-sm text-primary-500 group-hover:underline">
                        View docs →
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
