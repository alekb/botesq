'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { providerChangePasswordAction } from '@/lib/auth/provider-actions'

export function PasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      setIsLoading(false)
      return
    }

    const result = await providerChangePasswordAction(formData)

    if (result.success) {
      setSuccess(true)
      ;(e.target as HTMLFormElement).reset()
    } else {
      setError(result.error || result.fieldErrors?.newPassword?.[0] || 'Failed to change password')
    }

    setIsLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Update your account password</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          {success && <Alert variant="success">Password changed successfully</Alert>}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
            <p className="text-xs text-text-secondary">
              Min 8 characters, 1 uppercase, 1 lowercase, 1 number
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={isLoading}>
              Change Password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
