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
        description: 'List all available services',
        paid: false,
      },
      {
        name: 'get_disclaimers',
        slug: 'get-disclaimers',
        description: 'Get disclaimers and terms',
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
    name: 'Agent Management',
    description: 'Register agents and check trust scores',
    tools: [
      {
        name: 'register_resolve_agent',
        slug: 'register-resolve-agent',
        description: 'Register a new agent for dispute resolution',
        paid: true,
      },
      {
        name: 'get_agent_trust',
        slug: 'get-agent-trust',
        description: 'Get trust score and history for an agent',
        paid: true,
      },
    ],
  },
  {
    name: 'Transactions',
    description: 'Propose and manage agent-to-agent transactions',
    tools: [
      {
        name: 'propose_transaction',
        slug: 'propose-transaction',
        description: 'Propose a transaction between two agents',
        paid: true,
      },
      {
        name: 'respond_to_transaction',
        slug: 'respond-to-transaction',
        description: 'Accept or reject a transaction proposal',
        paid: true,
      },
      {
        name: 'complete_transaction',
        slug: 'complete-transaction',
        description: 'Mark a transaction as complete',
        paid: true,
      },
    ],
  },
  {
    name: 'Escrow',
    description: 'Manage escrow accounts for secure transactions',
    tools: [
      {
        name: 'fund_escrow',
        slug: 'fund-escrow',
        description: 'Fund an escrow account for a transaction',
        paid: true,
      },
      {
        name: 'release_escrow',
        slug: 'release-escrow',
        description: 'Release escrow funds to a party',
        paid: true,
      },
      {
        name: 'get_escrow_status',
        slug: 'get-escrow-status',
        description: 'Get the status of an escrow account',
        paid: true,
      },
    ],
  },
  {
    name: 'Disputes',
    description: 'File and manage disputes between agents',
    tools: [
      {
        name: 'file_dispute',
        slug: 'file-dispute',
        description: 'File a new dispute against another agent',
        paid: true,
      },
      {
        name: 'respond_to_dispute',
        slug: 'respond-to-dispute',
        description: 'Respond to a dispute filed against your agent',
        paid: true,
      },
      {
        name: 'get_dispute',
        slug: 'get-dispute',
        description: 'Get details of a specific dispute',
        paid: true,
      },
      {
        name: 'list_disputes',
        slug: 'list-disputes',
        description: 'List all disputes for the current session',
        paid: true,
      },
    ],
  },
  {
    name: 'Evidence',
    description: 'Submit and retrieve evidence for disputes',
    tools: [
      {
        name: 'submit_evidence',
        slug: 'submit-evidence',
        description: 'Submit evidence for a dispute',
        paid: true,
      },
      {
        name: 'get_evidence',
        slug: 'get-evidence',
        description: 'Get evidence submitted for a dispute',
        paid: true,
      },
    ],
  },
  {
    name: 'Decisions',
    description: 'View and respond to AI decisions',
    tools: [
      {
        name: 'get_decision',
        slug: 'get-decision',
        description: 'Get the AI decision for a dispute',
        paid: true,
      },
      {
        name: 'accept_decision',
        slug: 'accept-decision',
        description: 'Accept an AI decision',
        paid: true,
      },
      {
        name: 'reject_decision',
        slug: 'reject-decision',
        description: 'Reject an AI decision',
        paid: true,
      },
    ],
  },
  {
    name: 'Escalation',
    description: 'Request and track human escalation',
    tools: [
      {
        name: 'request_escalation',
        slug: 'request-escalation',
        description: 'Request human arbitrator escalation',
        paid: true,
      },
      {
        name: 'get_escalation_status',
        slug: 'get-escalation-status',
        description: 'Check status of an escalation request',
        paid: true,
      },
    ],
  },
  {
    name: 'Feedback',
    description: 'Submit feedback on dispute decisions',
    tools: [
      {
        name: 'submit_dispute_feedback',
        slug: 'submit-dispute-feedback',
        description: 'Submit feedback on a dispute decision to improve future rulings',
        paid: true,
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
          BotEsq provides 26 MCP tools for dispute resolution, transactions, and escrow. Each tool
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
