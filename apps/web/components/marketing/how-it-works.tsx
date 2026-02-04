import { Plug, Send, CheckCircle } from 'lucide-react'

const steps = [
  {
    step: '01',
    title: 'Connect Your Agent',
    description:
      'Add BotEsq as an MCP server to your AI agent. Works with any MCP-compatible system.',
    icon: Plug,
  },
  {
    step: '02',
    title: 'Send Requests',
    description:
      'Your agent calls BotEsq tools for legal questions, document review, or consultations.',
    icon: Send,
  },
  {
    step: '03',
    title: 'Get Results',
    description:
      'Receive AI-powered legal insights instantly, with human attorney review when needed.',
    icon: CheckCircle,
  },
]

export function HowItWorks() {
  return (
    <section className="py-20 sm:py-32 bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Get your AI agents connected to legal services in three simple steps.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((item, index) => (
            <div key={item.step} className="relative">
              {/* Connector line (hidden on mobile) */}
              {index < steps.length - 1 && (
                <div className="absolute top-12 left-1/2 hidden w-full border-t-2 border-dashed border-border-default md:block" />
              )}

              <div className="relative flex flex-col items-center text-center">
                {/* Icon circle */}
                <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-background-primary border border-border-default">
                  <item.icon className="h-10 w-10 text-primary-500" />
                </div>

                {/* Step number */}
                <span className="mt-6 text-sm font-semibold text-primary-500">{item.step}</span>

                {/* Title */}
                <h3 className="mt-2 text-xl font-semibold text-text-primary">{item.title}</h3>

                {/* Description */}
                <p className="mt-3 text-text-secondary">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Code example */}
        <div className="mt-20 mx-auto max-w-2xl">
          <div className="rounded-lg bg-background-tertiary border border-border-default overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border-default px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-error-500" />
              <div className="h-3 w-3 rounded-full bg-warning-500" />
              <div className="h-3 w-3 rounded-full bg-success-500" />
              <span className="ml-2 text-sm text-text-tertiary">mcp-config.json</span>
            </div>
            <pre className="p-4 text-sm overflow-x-auto">
              <code className="text-text-secondary font-mono">
                {`{
  "mcpServers": {
    "botesq": {
      "command": "npx",
      "args": ["@botesq/mcp-server"],
      "env": {
        "BOTESQ_API_KEY": "be_your_api_key"
      }
    }
  }
}`}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  )
}
