import Link from 'next/link'
import { ArrowRight, Zap, Shield, Scale, Code } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function DocsPage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="space-y-4">
        <Badge variant="primary">Documentation</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
          BotEsq API Documentation
        </h1>
        <p className="text-lg text-text-secondary">
          Integrate licensed legal services into your AI agents using the Model Context Protocol
          (MCP). BotEsq provides a secure, compliant way for AI systems to access real legal
          expertise.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/docs/quickstart" className="group">
          <Card className="h-full transition-colors hover:border-primary-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary-500" />
                Quickstart
              </CardTitle>
              <CardDescription>Get up and running in under 5 minutes</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="inline-flex items-center text-sm text-primary-500 group-hover:underline">
                Get started <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/docs/tools" className="group">
          <Card className="h-full transition-colors hover:border-primary-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary-500" />
                MCP Tools
              </CardTitle>
              <CardDescription>Explore all 16 available tools</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="inline-flex items-center text-sm text-primary-500 group-hover:underline">
                View tools <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/docs/authentication" className="group">
          <Card className="h-full transition-colors hover:border-primary-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary-500" />
                Authentication
              </CardTitle>
              <CardDescription>Learn how to authenticate your agents</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="inline-flex items-center text-sm text-primary-500 group-hover:underline">
                Learn more <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/docs/examples" className="group">
          <Card className="h-full transition-colors hover:border-primary-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary-500" />
                Examples
              </CardTitle>
              <CardDescription>Code examples in Python and TypeScript</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="inline-flex items-center text-sm text-primary-500 group-hover:underline">
                View examples <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* What is BotEsq */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">What is BotEsq?</h2>
        <p className="text-text-secondary">
          BotEsq is an MCP server that provides licensed legal services to AI agents. It bridges the
          gap between AI capabilities and legal compliance by connecting your AI applications to
          real, licensed attorneys.
        </p>
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-text-primary">Key Features</h3>
          <ul className="list-inside list-disc space-y-2 text-text-secondary">
            <li>
              <strong className="text-text-primary">Instant Legal Q&A</strong> - Get immediate
              answers to legal questions
            </li>
            <li>
              <strong className="text-text-primary">Matter Management</strong> - Create and track
              legal matters
            </li>
            <li>
              <strong className="text-text-primary">Document Review</strong> - Submit documents for
              professional analysis
            </li>
            <li>
              <strong className="text-text-primary">Consultations</strong> - Request in-depth legal
              consultations
            </li>
            <li>
              <strong className="text-text-primary">Credit System</strong> - Pay-as-you-go pricing
              with transparent costs
            </li>
          </ul>
        </div>
      </div>

      {/* How it works */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">How It Works</h2>
        <ol className="list-inside list-decimal space-y-4 text-text-secondary">
          <li>
            <strong className="text-text-primary">Get an API Key</strong> - Sign up for an operator
            account and generate API keys
          </li>
          <li>
            <strong className="text-text-primary">Start a Session</strong> - Use the{' '}
            <code className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono text-sm">
              start_session
            </code>{' '}
            tool to authenticate
          </li>
          <li>
            <strong className="text-text-primary">Use Legal Tools</strong> - Call any of our 16 MCP
            tools for legal services
          </li>
          <li>
            <strong className="text-text-primary">Pay with Credits</strong> - Credits are deducted
            automatically based on usage
          </li>
        </ol>
      </div>

      {/* Credit pricing */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Credit Pricing</h2>
        <p className="text-text-secondary">
          BotEsq uses a credit-based system. 1 credit = $0.001 USD. Here are some example costs:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th className="py-3 text-left font-medium text-text-primary">Service</th>
                <th className="py-3 text-right font-medium text-text-primary">Credits</th>
                <th className="py-3 text-right font-medium text-text-primary">USD</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              <tr className="border-b border-border-default">
                <td className="py-3">Simple Legal Question</td>
                <td className="py-3 text-right font-mono">200</td>
                <td className="py-3 text-right">$0.20</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3">Moderate Legal Question</td>
                <td className="py-3 text-right font-mono">500</td>
                <td className="py-3 text-right">$0.50</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3">Complex Legal Question</td>
                <td className="py-3 text-right font-mono">1,000</td>
                <td className="py-3 text-right">$1.00</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3">Create Matter</td>
                <td className="py-3 text-right font-mono">10,000</td>
                <td className="py-3 text-right">$10.00</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3">Document Review (base)</td>
                <td className="py-3 text-right font-mono">2,500</td>
                <td className="py-3 text-right">$2.50</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3">Standard Consultation</td>
                <td className="py-3 text-right font-mono">5,000</td>
                <td className="py-3 text-right">$5.00</td>
              </tr>
              <tr>
                <td className="py-3">Urgent Consultation</td>
                <td className="py-3 text-right font-mono">10,000</td>
                <td className="py-3 text-right">$10.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
