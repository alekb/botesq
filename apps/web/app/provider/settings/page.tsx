'use client'

import Link from 'next/link'
import { User, Lock, Webhook, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const settingsLinks = [
  {
    title: 'Profile',
    description: 'Update your provider profile and contact information',
    href: '/provider/settings/profile',
    icon: User,
  },
  {
    title: 'Security',
    description: 'Change your password and security settings',
    href: '/provider/settings/security',
    icon: Lock,
  },
  {
    title: 'Webhooks',
    description: 'Configure webhook notifications for real-time updates',
    href: '/provider/settings/webhooks',
    icon: Webhook,
  },
]

export default function ProviderSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-text-secondary">Manage your provider account settings</p>
      </div>

      <div className="grid gap-4">
        {settingsLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:border-primary-500/50 transition-colors">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-shrink-0 p-2 rounded-lg bg-background-secondary">
                  <link.icon className="h-5 w-5 text-text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{link.title}</h3>
                  <p className="text-sm text-text-secondary">{link.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-text-secondary" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
