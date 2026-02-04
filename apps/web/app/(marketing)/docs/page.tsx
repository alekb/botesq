import { Metadata } from 'next'
import Link from 'next/link'
import { Book, Code, Zap, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Documentation | BotEsq',
  description: 'Learn how to integrate BotEsq legal services into your AI applications.',
}

const sections = [
  {
    title: 'Getting Started',
    icon: Zap,
    description: 'Quick start guide to get your AI agent connected to BotEsq.',
    href: '/docs/getting-started',
    color: 'text-warning-500',
    bgColor: 'bg-warning-500/10',
  },
  {
    title: 'API Reference',
    icon: Code,
    description: 'Complete reference for all MCP tools and endpoints.',
    href: '/docs/api',
    color: 'text-primary-500',
    bgColor: 'bg-primary-500/10',
  },
  {
    title: 'Guides',
    icon: Book,
    description: 'In-depth tutorials and best practices.',
    href: '/docs/guides',
    color: 'text-success-500',
    bgColor: 'bg-success-500/10',
  },
]

const tools = [
  {
    name: 'start_session',
    description: 'Initiate a new session for your AI agent.',
    category: 'Session',
  },
  {
    name: 'ask_legal_question',
    description: 'Get instant answers to legal questions.',
    category: 'Legal Q&A',
  },
  {
    name: 'create_matter',
    description: 'Create a new legal matter.',
    category: 'Matters',
  },
  {
    name: 'get_retainer_terms',
    description: 'Get engagement terms for a matter.',
    category: 'Retainers',
  },
  {
    name: 'submit_document',
    description: 'Submit a document for AI analysis.',
    category: 'Documents',
  },
  {
    name: 'request_consultation',
    description: 'Request a human attorney consultation.',
    category: 'Consultations',
  },
  {
    name: 'check_credits',
    description: 'Check current credit balance.',
    category: 'Credits',
  },
  {
    name: 'add_credits',
    description: 'Purchase additional credits.',
    category: 'Credits',
  },
]

export default function DocsPage() {
  return (
    <>
      {/* Hero section */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
              Documentation
            </h1>
            <p className="mt-6 text-lg leading-8 text-text-secondary">
              Everything you need to integrate BotEsq legal services into your AI applications.
            </p>
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-3">
            {sections.map((section) => (
              <Link key={section.title} href={section.href}>
                <Card className="h-full transition-all hover:border-primary-500/50 hover:shadow-lg">
                  <CardHeader>
                    <div className={`inline-flex w-fit rounded-lg p-3 ${section.bgColor}`}>
                      <section.icon className={`h-6 w-6 ${section.color}`} />
                    </div>
                    <CardTitle className="flex items-center gap-2">
                      {section.title}
                      <ArrowRight className="h-4 w-4" />
                    </CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Quick start */}
      <section className="py-12 bg-background-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-text-primary mb-8">Quick Start</h2>

          <div className="space-y-8">
            {/* Step 1 */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                1. Add BotEsq to your MCP config
              </h3>
              <div className="rounded-lg bg-background-tertiary border border-border-default overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border-default px-4 py-3">
                  <span className="text-sm text-text-tertiary">mcp-config.json</span>
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

            {/* Step 2 */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">2. Start a session</h3>
              <div className="rounded-lg bg-background-tertiary border border-border-default overflow-hidden">
                <pre className="p-4 text-sm overflow-x-auto">
                  <code className="text-text-secondary font-mono">
                    {`// Call the start_session tool
{
  "operator_id": "your-operator-id"
}`}
                  </code>
                </pre>
              </div>
            </div>

            {/* Step 3 */}
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                3. Make your first legal query
              </h3>
              <div className="rounded-lg bg-background-tertiary border border-border-default overflow-hidden">
                <pre className="p-4 text-sm overflow-x-auto">
                  <code className="text-text-secondary font-mono">
                    {`// Call the ask_legal_question tool
{
  "session_id": "session_abc123",
  "question": "What are the key elements of a valid contract?",
  "category": "general_legal"
}`}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Available tools */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-text-primary mb-8">Available Tools</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tools.map((tool) => (
              <Card key={tool.name}>
                <CardContent className="pt-6">
                  <code className="text-sm font-mono text-primary-400">{tool.name}</code>
                  <p className="mt-2 text-sm text-text-secondary">{tool.description}</p>
                  <p className="mt-2 text-xs text-text-tertiary">{tool.category}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
