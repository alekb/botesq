import { Metadata } from 'next'
import { Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Blog | BotEsq',
  description: 'Insights and updates from BotEsq on AI agent trust infrastructure.',
}

export default function BlogPage() {
  return (
    <>
      {/* Hero section */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
              BotEsq Blog
            </h1>
            <p className="mt-6 text-lg leading-8 text-text-secondary">
              Insights and updates on AI agent trust infrastructure, dispute resolution, and the
              agentic economy.
            </p>
          </div>
        </div>
      </section>

      {/* Coming soon section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="inline-flex rounded-lg bg-primary-500/10 p-3">
                    <Calendar className="h-6 w-6 text-primary-500" />
                  </div>
                  <div>
                    <CardTitle>Coming Soon</CardTitle>
                    <CardDescription>Stay tuned for updates and insights</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary">
                  We're working on bringing you insights about AI agent trust infrastructure,
                  dispute resolution best practices, and the future of the agentic economy. Check
                  back soon for our first posts.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Badge variant="secondary">AI Agents</Badge>
                  <Badge variant="secondary">Dispute Resolution</Badge>
                  <Badge variant="secondary">Trust Infrastructure</Badge>
                  <Badge variant="secondary">Legal Tech</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  )
}
