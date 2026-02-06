'use client'

import { useState } from 'react'
import { Scale, FileText, Zap, CheckCircle, MessageSquare, Gavel } from 'lucide-react'

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

const legalSteps = [
  {
    step: '01',
    title: 'Ask Question',
    description: 'Submit a legal question through the MCP interface. Provide context and details.',
    icon: MessageSquare,
  },
  {
    step: '02',
    title: 'AI Analysis',
    description: 'BotEsq AI analyzes your question using legal knowledge and generates a response.',
    icon: Zap,
  },
  {
    step: '03',
    title: 'Attorney Review',
    description: 'For complex questions, licensed attorneys review the AI response for accuracy.',
    icon: Gavel,
  },
  {
    step: '04',
    title: 'Get Answer',
    description: 'Receive your answer with confidence scoring. Request consultation if needed.',
    icon: CheckCircle,
  },
]

const disputeCode = `# Agent A files a dispute against Agent B
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

const legalCode = `# Agent asks a legal question
result = await mcp.call_tool("ask_legal_question", {
    "session_token": session_token,
    "question": "Can I use this public dataset for training my model?",
    "context": "The dataset is scraped from public social media posts",
    "jurisdiction": "US",
    "urgency": "standard"
})

# Response includes legal analysis with confidence score
# Confidence: 0.85 | Attorney reviewed: true`

type TabType = 'dispute' | 'legal'

export function HowItWorks() {
  const [activeTab, setActiveTab] = useState<TabType>('dispute')

  const steps = activeTab === 'dispute' ? disputeSteps : legalSteps
  const exampleCode = activeTab === 'dispute' ? disputeCode : legalCode
  const fileName = activeTab === 'dispute' ? 'file-dispute.py' : 'ask-legal.py'

  return (
    <section className="py-20 sm:py-32 bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Two products, one MCP server. Choose the service that fits your needs.
          </p>

          {/* Tabs */}
          <div className="mt-8 inline-flex rounded-lg border border-border-default bg-background-primary p-1">
            <button
              onClick={() => setActiveTab('dispute')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'dispute'
                  ? 'bg-primary-500 text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Scale className="h-4 w-4" />
              Dispute Resolution
            </button>
            <button
              onClick={() => setActiveTab('legal')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'legal'
                  ? 'bg-success-500 text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Gavel className="h-4 w-4" />
              Legal Services
            </button>
          </div>

          <p className="mt-4 text-sm text-text-tertiary">
            {activeTab === 'dispute'
              ? 'Token-based pricing — pay only for what you use'
              : 'Custom pricing — determined per engagement'}
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
                <div
                  className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-background-primary border ${
                    activeTab === 'dispute' ? 'border-primary-500/30' : 'border-success-500/30'
                  }`}
                >
                  <item.icon
                    className={`h-8 w-8 ${
                      activeTab === 'dispute' ? 'text-primary-500' : 'text-success-500'
                    }`}
                  />
                </div>

                {/* Step number */}
                <span
                  className={`mt-4 text-sm font-semibold ${
                    activeTab === 'dispute' ? 'text-primary-500' : 'text-success-500'
                  }`}
                >
                  {item.step}
                </span>

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
              <span className="ml-2 text-sm text-text-tertiary">{fileName}</span>
            </div>
            <pre className="p-4 text-sm overflow-x-auto">
              <code className="text-text-secondary font-mono">{exampleCode}</code>
            </pre>
          </div>
        </div>

        {/* When to use each */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 max-w-4xl mx-auto">
          <div className="rounded-lg border border-primary-500/30 bg-primary-500/5 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Scale className="h-5 w-5 text-primary-500" />
              <h3 className="font-semibold text-text-primary">Use Dispute Resolution when:</h3>
            </div>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-1">•</span>
                Two agents disagree about a transaction
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-1">•</span>
                You need escrow for agent-to-agent payments
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-1">•</span>
                You want to check another agent&apos;s trust score
              </li>
            </ul>
          </div>
          <div className="rounded-lg border border-success-500/30 bg-success-500/5 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Gavel className="h-5 w-5 text-success-500" />
              <h3 className="font-semibold text-text-primary">Use Legal Services when:</h3>
            </div>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-success-500 mt-1">•</span>
                Your agent has a legal question
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success-500 mt-1">•</span>
                You need a contract or document reviewed
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success-500 mt-1">•</span>
                You need ongoing legal support
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
