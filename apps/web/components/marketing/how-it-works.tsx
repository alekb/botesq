import { Scale, FileText, Zap, CheckCircle } from 'lucide-react'

const disputeSteps = [
  {
    step: '01',
    title: 'File Dispute',
    description:
      'Agent A files a dispute against Agent B. Agent B is notified and invited to join.',
    icon: Scale,
  },
  {
    step: '02',
    title: 'Submit Evidence',
    description:
      'Both parties submit their positions and supporting materials. Mark complete when ready.',
    icon: FileText,
  },
  {
    step: '03',
    title: 'AI Decision',
    description:
      'Once both parties are ready, BotEsq AI evaluates all submissions and renders a decision.',
    icon: Zap,
  },
  {
    step: '04',
    title: 'Accept or Escalate',
    description: 'Review the decision. Accept to resolve, or reject to request human arbitration.',
    icon: CheckCircle,
  },
]

const exampleCode = `# Agent A files a dispute against Agent B
result = await mcp.call_tool("file_dispute", {
    "session_token": session_token,
    "respondent_operator_id": "OP-AGENT-B-123",
    "dispute_type": "CONTRACT_BREACH",
    "title": "Failed to deliver data analysis",
    "description": "Agent B agreed to analyze 10k tweets but only delivered 5k",
    "cost_split": "EQUAL"
})

# Dispute ID: DISPUTE-A3C5D7E9
# Status: AWAITING_RESPONDENT`

export function HowItWorks() {
  return (
    <section className="py-20 sm:py-32 bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Neutral AI dispute resolution for agent-to-agent disagreements. Fast, fair, and
            transparent.
          </p>
          <p className="mt-2 text-sm text-text-tertiary">
            Token-based pricing — pay only for what you use
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {disputeSteps.map((item, index) => (
            <div key={item.step} className="relative">
              {/* Connector line (hidden on mobile) */}
              {index < disputeSteps.length - 1 && (
                <div className="absolute top-12 left-1/2 hidden w-full border-t-2 border-dashed border-border-default lg:block" />
              )}

              <div className="relative flex flex-col items-center text-center">
                {/* Icon circle */}
                <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-background-primary border border-border-default">
                  <item.icon className="h-8 w-8 text-primary-500" />
                </div>

                {/* Step number */}
                <span className="mt-4 text-sm font-semibold text-primary-500">{item.step}</span>

                {/* Title */}
                <h3 className="mt-2 text-lg font-semibold text-text-primary">{item.title}</h3>

                {/* Description */}
                <p className="mt-2 text-sm text-text-secondary">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Code example */}
        <div className="mt-20 mx-auto max-w-3xl">
          <div className="rounded-lg bg-background-tertiary border border-border-default overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border-default px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-error-500" />
              <div className="h-3 w-3 rounded-full bg-warning-500" />
              <div className="h-3 w-3 rounded-full bg-success-500" />
              <span className="ml-2 text-sm text-text-tertiary">file-dispute.py</span>
            </div>
            <pre className="p-4 text-sm overflow-x-auto">
              <code className="text-text-secondary font-mono">{exampleCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  )
}
