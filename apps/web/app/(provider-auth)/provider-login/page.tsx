'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { providerLoginAction, type AuthResult } from '@/lib/auth/provider-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

function ProviderLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/provider'

  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AuthResult | null>(null)
  const [showTotpField, setShowTotpField] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setResult(null)

    const formData = new FormData(event.currentTarget)
    const res = await providerLoginAction(formData)

    if (res.success) {
      router.push(redirect)
    } else if (res.requiresTwoFactor) {
      setShowTotpField(true)
      setIsLoading(false)
    } else {
      setResult(res)
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Provider Login</CardTitle>
        <CardDescription>Sign in to your provider account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {result?.error && <Alert variant="error">{result.error}</Alert>}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="provider@company.com"
              autoComplete="email"
              required
              error={result?.fieldErrors?.email?.[0]}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/provider-forgot-password"
                className="text-sm text-primary-500 hover:text-primary-400"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              error={result?.fieldErrors?.password?.[0]}
            />
          </div>

          {showTotpField && (
            <div className="space-y-2">
              <Label htmlFor="totpCode">Two-Factor Code</Label>
              <Input
                id="totpCode"
                name="totpCode"
                type="text"
                placeholder="Enter 6-digit code"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                required
                error={result?.fieldErrors?.totpCode?.[0]}
              />
            </div>
          )}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Sign in
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-text-secondary">
          Want to become a provider?{' '}
          <Link href="/provider-register" className="text-primary-500 hover:text-primary-400">
            Apply now
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function LoginSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}

export default function ProviderLoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <ProviderLoginForm />
    </Suspense>
  )
}
