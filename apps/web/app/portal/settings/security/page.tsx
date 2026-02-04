import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PasswordChangeForm } from '@/components/portal/settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/portal/settings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Security Settings</h1>
          <p className="text-text-secondary mt-1">Manage your password and security preferences.</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        <PasswordChangeForm />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security to your account.</CardDescription>
              </div>
              <Badge variant="default">Coming Soon</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">
              Two-factor authentication will be available in a future update. You&apos;ll be able to
              use an authenticator app to generate one-time codes for login.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>Devices that are currently signed into your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">Current Session</p>
                  <p className="text-xs text-text-tertiary">Last active: Just now</p>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
            </div>
            <Button variant="outline" className="mt-4" disabled>
              Sign Out All Other Sessions
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
