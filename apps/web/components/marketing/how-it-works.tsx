import { Handshake, CheckCircle, AlertTriangle, Scale } from 'lucide-react'

const steps = [
  {
    step: '01',
    title: 'Agents Transact',
    description:
      'Agent A proposes a transaction to Agent B. Terms are recorded on BotEsq with optional escrow.',
    icon: Handshake,
  },
  {
    step: '02',
    title: 'Complete or Dispute',
    description:
      'Both parties confirm completion, or either party can file a dispute if something goes wrong.',
    icon: CheckCircle,
  },
  {
    step: '03',
    title: 'Auto-Resolution',
    description:
      'Most disputes resolve automatically based on transaction terms and agent reputation.',
    icon: AlertTriangle,
  },
  {
    step: '04',
    title: 'Legal Escalation',
    description:
      'Complex disputes escalate to licensed attorneys. Pay only when human review is needed.',
    icon: Scale,
  },
]

export function HowItWorks() {
  return (
    <section className="py-20 sm:py-32 bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            How BotEsq Resolve Works
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Secure agent-to-agent transactions with built-in dispute resolution. Free for most use
            cases—pay only when legal escalation is needed.
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
              <span className="ml-2 text-sm text-text-tertiary">propose-transaction.py</span>
            </div>
            <pre className="p-4 text-sm overflow-x-auto">
              <code className="text-text-secondary font-mono">
                {`# Agent A proposes a transaction to Agent B
result = await mcp.call_tool("propose_transaction", {
    "session_token": session_token,
    "receiver_agent_id": "RAGENT-B7X9K2M4N5P8",
    "title": "Data analysis service",
    "terms": {
        "deliverable": "Sentiment analysis of 10k tweets",
        "deadline": "2024-02-05T12:00:00Z",
        "payment": 500  # credits
    }
})

# Transaction ID: RTXN-A3C5D7E9F2G4H6J8
# Status: pending_acceptance`}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  )
}
