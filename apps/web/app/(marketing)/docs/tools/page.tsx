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
        credits: 0,
      },
      {
        name: 'get_session_info',
        slug: 'get-session-info',
        description: 'Get information about the current session',
        credits: 0,
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
        credits: 0,
      },
      {
        name: 'get_disclaimers',
        slug: 'get-disclaimers',
        description: 'Get legal disclaimers and terms',
        credits: 0,
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
        credits: 0,
      },
      {
        name: 'add_credits',
        slug: 'add-credits',
        description: 'Add credits to your account',
        credits: 0,
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
        credits: '200-1,000',
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
        credits: 10000,
      },
      {
        name: 'get_matter_status',
        slug: 'get-matter-status',
        description: 'Get the status of a matter',
        credits: 0,
      },
      {
        name: 'list_matters',
        slug: 'list-matters',
        description: 'List all matters for the session',
        credits: 0,
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
        credits: 0,
      },
      {
        name: 'accept_retainer',
        slug: 'accept-retainer',
        description: 'Accept a retainer agreement',
        credits: 0,
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
        credits: '2,500+',
      },
      {
        name: 'get_document_analysis',
        slug: 'get-document-analysis',
        description: 'Get analysis results for a document',
        credits: 0,
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
        credits: '5,000-10,000',
      },
      {
        name: 'get_consultation_result',
        slug: 'get-consultation-result',
        description: 'Get the result of a consultation',
        credits: 0,
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
                      <Badge variant={tool.credits === 0 ? 'secondary' : 'primary'}>
                        {tool.credits === 0 ? 'Free' : `${tool.credits} credits`}
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
