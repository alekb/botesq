'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import type { Attorney } from '@botesq/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AttorneyFormProps {
  attorney?: Omit<Attorney, 'passwordHash' | 'totpSecret'>
  mode: 'create' | 'edit'
}

export function AttorneyForm({ attorney, mode }: AttorneyFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      role: formData.get('role') as string,
      barNumber: (formData.get('barNumber') as string) || null,
      barState: (formData.get('barState') as string) || null,
      status: formData.get('status') as string,
    }

    try {
      let response: Response

      if (mode === 'create') {
        response = await fetch('/api/admin/attorneys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      } else {
        // For edit mode, only send changed fields
        const updateData: Record<string, unknown> = {}
        if (data.firstName !== attorney?.firstName) updateData.firstName = data.firstName
        if (data.lastName !== attorney?.lastName) updateData.lastName = data.lastName
        if (data.role !== attorney?.role) updateData.role = data.role
        if (data.barNumber !== attorney?.barNumber) updateData.barNumber = data.barNumber
        if (data.barState !== attorney?.barState) updateData.barState = data.barState
        if (data.status !== attorney?.status) updateData.status = data.status

        response = await fetch(`/api/admin/attorneys/${attorney?.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        })
      }

      const result = await response.json()

      if (!response.ok) {
        if (result.details?.fieldErrors) {
          setFieldErrors(result.details.fieldErrors)
        } else {
          setError(result.error || 'An error occurred')
        }
        return
      }

      router.push('/admin/attorneys')
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === 'create' ? 'New Attorney' : 'Edit Attorney'}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="error" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                defaultValue={attorney?.firstName}
                required
                disabled={isLoading}
              />
              {fieldErrors.firstName && (
                <p className="text-sm text-error-500">{fieldErrors.firstName[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                defaultValue={attorney?.lastName}
                required
                disabled={isLoading}
              />
              {fieldErrors.lastName && (
                <p className="text-sm text-error-500">{fieldErrors.lastName[0]}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={attorney?.email}
              required
              disabled={isLoading || mode === 'edit'}
              className={mode === 'edit' ? 'bg-background-secondary' : ''}
            />
            {fieldErrors.email && <p className="text-sm text-error-500">{fieldErrors.email[0]}</p>}
            {mode === 'edit' && (
              <p className="text-xs text-text-secondary">Email cannot be changed</p>
            )}
          </div>

          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                disabled={isLoading}
                minLength={12}
              />
              {fieldErrors.password && (
                <p className="text-sm text-error-500">{fieldErrors.password[0]}</p>
              )}
              <p className="text-xs text-text-secondary">
                At least 12 characters with uppercase, lowercase, number, and special character
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select name="role" defaultValue={attorney?.role ?? 'ASSOCIATE'} disabled={isLoading}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASSOCIATE">Associate</SelectItem>
                  <SelectItem value="SENIOR">Senior</SelectItem>
                  <SelectItem value="PARTNER">Partner</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
              {fieldErrors.role && <p className="text-sm text-error-500">{fieldErrors.role[0]}</p>}
            </div>

            {mode === 'edit' && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  name="status"
                  defaultValue={attorney?.status ?? 'ACTIVE'}
                  disabled={isLoading}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.status && (
                  <p className="text-sm text-error-500">{fieldErrors.status[0]}</p>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="barNumber">Bar Number</Label>
              <Input
                id="barNumber"
                name="barNumber"
                defaultValue={attorney?.barNumber ?? ''}
                disabled={isLoading}
              />
              {fieldErrors.barNumber && (
                <p className="text-sm text-error-500">{fieldErrors.barNumber[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="barState">Bar State</Label>
              <Input
                id="barState"
                name="barState"
                defaultValue={attorney?.barState ?? ''}
                disabled={isLoading}
                placeholder="e.g., CA, NY, TX"
              />
              {fieldErrors.barState && (
                <p className="text-sm text-error-500">{fieldErrors.barState[0]}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Saving...'}
                </>
              ) : mode === 'create' ? (
                'Create Attorney'
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
