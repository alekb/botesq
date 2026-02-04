'use client'

import Link from 'next/link'
import { User, Lock, Shield, Webhook, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const settingsSections = [
  {
    name: 'Profile',
    description: 'Update your company details and contact information',
    href: '/portal/settings/profile',
    icon: User,
  },
  {
    name: 'Security',
    description: 'Change your password and manage security settings',
    href: '/portal/settings/security',
    icon: Lock,
  },
  {
    name: 'Pre-Authorization',
    description: 'Configure automatic retainer approval for your agents',
    href: '/portal/settings/preauth',
    icon: Shield,
  },
  {
    name: 'Webhooks',
    description: 'Set up webhooks to receive real-time event notifications',
    href: '/portal/settings/webhooks',
    icon: Webhook,
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your account settings and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsSections.map((section) => (
          <Link key={section.name} href={section.href}>
            <Card className="hover:border-primary-500 transition-colors cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-background-tertiary p-3">
                      <section.icon className="h-5 w-5 text-primary-500" />
                    </div>
                    <div>
                      <h3 className="font-medium text-text-primary">{section.name}</h3>
                      <p className="text-sm text-text-secondary mt-1">{section.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-tertiary flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
