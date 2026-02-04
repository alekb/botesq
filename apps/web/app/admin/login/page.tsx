'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { adminLogin, adminVerifyTotp } from '@/lib/admin-auth/actions'

type LoginStep = 'credentials' | 'totp'

export default function AdminLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<LoginStep>('credentials')
  const [adminId, setAdminId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  async function handleCredentialsSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)
    setFieldErrors({})

    try {
      const result = await adminLogin(formData)

      if (!result.success) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors)
        } else if (result.error) {
          setError(result.error)
        }
        return
      }

      if (result.requiresTwoFactor && result.adminId) {
        setAdminId(result.adminId)
        setStep('totp')
      } else {
        router.push('/admin')
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleTotpSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)
    setFieldErrors({})

    try {
      const result = await adminVerifyTotp(adminId, formData)

      if (!result.success) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors)
        } else if (result.error) {
          setError(result.error)
        }
        return
      }

      router.push('/admin')
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-primary px-4">
      <Card className="w-full max-w-md space-y-6 p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-500/10">
            <ShieldCheck className="h-6 w-6 text-error-500" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Admin Portal</h1>
          <p className="mt-2 text-sm text-text-secondary">
            {step === 'credentials'
              ? 'Sign in with admin credentials'
              : 'Enter your verification code'}
          </p>
        </div>

        {error && (
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </Alert>
        )}

        {step === 'credentials' ? (
          <form action={handleCredentialsSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@botesq.com"
                autoComplete="email"
                required
                disabled={isLoading}
              />
              {fieldErrors.email && (
                <p className="text-sm text-error-500">{fieldErrors.email[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                disabled={isLoading}
              />
              {fieldErrors.password && (
                <p className="text-sm text-error-500">{fieldErrors.password[0]}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        ) : (
          <form action={handleTotpSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                autoComplete="one-time-code"
                required
                disabled={isLoading}
                className="text-center text-2xl tracking-widest"
              />
              <p className="text-xs text-text-secondary">
                Enter the 6-digit code from your authenticator app
              </p>
              {fieldErrors.code && <p className="text-sm text-error-500">{fieldErrors.code[0]}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep('credentials')
                setAdminId('')
                setError(null)
              }}
              className="w-full text-sm text-text-secondary hover:text-text-primary"
            >
              Back to login
            </button>
          </form>
        )}

        <div className="border-t border-border pt-4 text-center">
          <Link href="/" className="text-sm text-text-secondary hover:text-primary-500">
            Back to BotEsq
          </Link>
        </div>
      </Card>
    </div>
  )
}
