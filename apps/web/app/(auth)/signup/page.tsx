'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signup, type AuthResult } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { CheckCircle } from 'lucide-react'

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AuthResult | null>(null)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setResult(null)

    const formData = new FormData(event.currentTarget)
    setEmail(formData.get('email') as string)
    const res = await signup(formData)

    if (res.success) {
      setSuccess(true)
    } else {
      setResult(res)
    }
    setIsLoading(false)
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-12 w-12 text-success-500" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary">Check your email</h2>
            <p className="text-text-secondary">
              We&apos;ve sent a verification link to <strong>{email}</strong>. Please check your
              inbox and click the link to activate your account.
            </p>
            <p className="text-sm text-text-tertiary">
              Didn&apos;t receive the email? Check your spam folder or{' '}
              <Link href="/login" className="text-primary-500 hover:text-primary-400">
                try logging in
              </Link>{' '}
              to request a new verification email.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>Get started with BotEsq for your AI agents</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {result?.error && <Alert variant="error">{result.error}</Alert>}

          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              name="companyName"
              type="text"
              placeholder="Acme Inc."
              required
              error={result?.fieldErrors?.companyName?.[0]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              required
              error={result?.fieldErrors?.email?.[0]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Create a strong password"
              autoComplete="new-password"
              required
              error={result?.fieldErrors?.password?.[0]}
            />
            <p className="text-xs text-text-tertiary">
              Must be at least 8 characters with uppercase, lowercase, and a number
            </p>
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Create account
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-text-tertiary">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="text-primary-500 hover:text-primary-400">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-primary-500 hover:text-primary-400">
            Privacy Policy
          </Link>
        </p>

        <div className="mt-6 text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-500 hover:text-primary-400">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
