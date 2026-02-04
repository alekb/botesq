'use client'

import { useState } from 'react'
import { User, Shield, Key, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import {
  attorneyChangePassword,
  enableTwoFactorStart,
  enableTwoFactorVerify,
  disableTwoFactor,
} from '@/lib/attorney-auth/actions'
import { useAttorney } from '@/lib/hooks/use-attorney'

export default function AttorneySettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary">Manage your account settings.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileSection />
        <SecuritySection />
        <TwoFactorSection />
      </div>
    </div>
  )
}

function ProfileSection() {
  const { attorney } = useAttorney()

  if (!attorney) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-text-primary">Profile</h2>
        </div>
        <p className="mt-4 text-sm text-text-secondary">Loading...</p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <User className="h-5 w-5 text-primary-500" />
        <h2 className="text-lg font-semibold text-text-primary">Profile</h2>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <Label className="text-text-secondary">Name</Label>
          <p className="text-text-primary">
            {attorney.firstName} {attorney.lastName}
          </p>
        </div>

        <div>
          <Label className="text-text-secondary">Email</Label>
          <p className="text-text-primary">{attorney.email}</p>
        </div>

        <div>
          <Label className="text-text-secondary">Role</Label>
          <div className="mt-1">
            <Badge variant="secondary">{attorney.role}</Badge>
          </div>
        </div>

        {attorney.barNumber && (
          <div>
            <Label className="text-text-secondary">Bar Number</Label>
            <p className="text-text-primary">
              {attorney.barState} #{attorney.barNumber}
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}

function SecuritySection() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleChangePassword(formData: FormData) {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await attorneyChangePassword(formData)
      if (result.success) {
        setSuccess(true)
        // Reset form
        const form = document.getElementById('password-form') as HTMLFormElement
        form?.reset()
      } else {
        setError(result.error || 'Failed to change password')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Key className="h-5 w-5 text-primary-500" />
        <h2 className="text-lg font-semibold text-text-primary">Change Password</h2>
      </div>

      <form id="password-form" action={handleChangePassword} className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            disabled={isLoading}
          />
          <p className="text-xs text-text-secondary">
            Must be at least 12 characters with uppercase, lowercase, number, and special character.
          </p>
        </div>

        {error && (
          <Alert variant="error">
            <span>{error}</span>
          </Alert>
        )}

        {success && (
          <Alert variant="success">
            <span>Password changed successfully</span>
          </Alert>
        )}

        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Changing...
            </>
          ) : (
            'Change Password'
          )}
        </Button>
      </form>
    </Card>
  )
}

function TwoFactorSection() {
  const { attorney, refresh } = useAttorney()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [setupData, setSetupData] = useState<{ secret: string; uri: string } | null>(null)

  if (!attorney) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-text-primary">Two-Factor Authentication</h2>
        </div>
        <p className="mt-4 text-sm text-text-secondary">Loading...</p>
      </Card>
    )
  }

  async function handleStartSetup() {
    setIsLoading(true)
    setError(null)

    try {
      const result = await enableTwoFactorStart()
      if (result.success && result.secret && result.uri) {
        setSetupData({ secret: result.secret, uri: result.uri })
      } else {
        setError(result.error || 'Failed to start 2FA setup')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerify(formData: FormData) {
    setIsLoading(true)
    setError(null)

    try {
      const result = await enableTwoFactorVerify(formData)
      if (result.success) {
        setSetupData(null)
        refresh()
      } else {
        setError(result.error || 'Invalid code')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDisable(formData: FormData) {
    setIsLoading(true)
    setError(null)

    try {
      const result = await disableTwoFactor(formData)
      if (result.success) {
        refresh()
      } else {
        setError(result.error || 'Failed to disable 2FA')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-6 lg:col-span-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-text-primary">Two-Factor Authentication</h2>
        </div>
        <Badge variant={attorney.totpEnabled ? 'success' : 'secondary'}>
          {attorney.totpEnabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </div>

      <p className="mt-2 text-sm text-text-secondary">
        Add an extra layer of security to your account by requiring a verification code in addition
        to your password.
      </p>

      {error && (
        <Alert variant="error" className="mt-4">
          <span>{error}</span>
        </Alert>
      )}

      {attorney.totpEnabled ? (
        <form action={handleDisable} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="disable-password">Password</Label>
            <Input
              id="disable-password"
              name="password"
              type="password"
              placeholder="Enter your password to disable 2FA"
              required
              disabled={isLoading}
            />
          </div>
          <Button type="submit" variant="danger" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disabling...
              </>
            ) : (
              'Disable 2FA'
            )}
          </Button>
        </form>
      ) : setupData ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg bg-background-primary p-4">
            <p className="mb-2 text-sm font-medium text-text-primary">
              1. Scan this QR code with your authenticator app:
            </p>
            <div className="flex justify-center rounded-lg bg-white p-4">
              {/* QR code would go here - using text fallback */}
              <div className="text-center">
                <p className="text-xs text-gray-500">QR Code (use secret below if unavailable)</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-background-primary p-4">
            <p className="mb-2 text-sm font-medium text-text-primary">
              2. Or enter this secret manually:
            </p>
            <code className="block break-all rounded bg-background-secondary p-2 text-sm">
              {setupData.secret}
            </code>
          </div>

          <form action={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verify-code">
                3. Enter the 6-digit code from your authenticator:
              </Label>
              <Input
                id="verify-code"
                name="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                required
                disabled={isLoading}
                className="text-center text-2xl tracking-widest"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Enable'
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSetupData(null)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <Button onClick={handleStartSetup} disabled={isLoading} className="mt-4">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up...
            </>
          ) : (
            'Enable 2FA'
          )}
        </Button>
      )}
    </Card>
  )
}
