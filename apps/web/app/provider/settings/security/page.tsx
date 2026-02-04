'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { PasswordForm } from '@/components/provider/settings'
import { Button } from '@/components/ui/button'

export default function ProviderSecuritySettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/provider/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Security Settings</h1>
          <p className="text-text-secondary">Manage your account security</p>
        </div>
      </div>

      <PasswordForm />
    </div>
  )
}
