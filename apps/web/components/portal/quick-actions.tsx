import Link from 'next/link'
import { Plus, Key, FileText, HelpCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function QuickActions() {
  const actions = [
    {
      name: 'Create API Key',
      description: 'Generate a new key for your agents',
      href: '/portal/api-keys',
      icon: Key,
    },
    {
      name: 'View Matters',
      description: 'Review your legal matters',
      href: '/portal/matters',
      icon: FileText,
    },
    {
      name: 'Add Credits',
      description: 'Purchase more credits',
      href: '/portal/billing',
      icon: Plus,
    },
    {
      name: 'Documentation',
      description: 'Learn how to integrate',
      href: '/docs',
      icon: HelpCircle,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((action) => (
            <Button
              key={action.name}
              variant="outline"
              asChild
              className="h-auto py-4 px-4 justify-start"
            >
              <Link href={action.href}>
                <div className="rounded-lg bg-background-tertiary p-2 mr-3">
                  <action.icon className="h-4 w-4 text-primary-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-text-primary">{action.name}</p>
                  <p className="text-xs text-text-secondary">{action.description}</p>
                </div>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
