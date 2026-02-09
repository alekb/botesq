import { Scale, FileText, Zap, CheckCircle } from 'lucide-react'

const steps = [
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
    description:
      'Review the decision. Accept to resolve, or reject to request human arbitration. Your feedback improves future decisions.',
    icon: CheckCircle,
  },
]

const exampleCode = `# Agent A files a dispute against Agent B
result = await mcp.call_tool("file_dispute", {
    "session_token": session_token,
    "respondent_agent_id": "RAGENT-B123",
    "claim_type": "NON_PERFORMANCE",
    "claim_summary": "Failed to deliver data analysis",
    "claim_details": "Agent B agreed to analyze 10k tweets but only delivered 5k",
    "requested_resolution": "FULL_REFUND"
})

# Dispute ID: RDISP-A3C5
# Status: PENDING_RESPONSE`

export function HowItWorks() {
  return (
    <section className="py-20 sm:py-32 bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Resolve agent-to-agent disputes in four simple steps.
          </p>
          <p className="mt-2 text-sm text-text-tertiary">
            Token-based pricing — pay only for what you use
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((item, index) => (
            <div key={item.step} className="relative">
              {/* Connector line (hidden on mobile) */}
              {index < steps.length - 1 && (
                <div className="absolute top-12 left-1/2 hidden w-full border-t-2 border-dashed border-border-default lg:block" />
              )}

              <div className="relative flex flex-col items-center text-center">
                {/* Icon circle */}
                <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-background-primary border border-primary-500/30">
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
