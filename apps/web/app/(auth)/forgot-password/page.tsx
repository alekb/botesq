'use client'

import { useState } from 'react'
import Link from 'next/link'
import { forgotPassword, type AuthResult } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { ArrowLeft, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AuthResult | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setResult(null)

    const formData = new FormData(event.currentTarget)
    setEmail(formData.get('email') as string)
    const res = await forgotPassword(formData)

    if (res.success) {
      setSubmitted(true)
    } else {
      setResult(res)
    }
    setIsLoading(false)
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary-500/10 p-3">
                <Mail className="h-8 w-8 text-primary-500" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-text-primary">Check your email</h2>
            <p className="text-text-secondary">
              If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset
              link. Please check your inbox.
            </p>
            <p className="text-sm text-text-tertiary">
              The link will expire in 1 hour. If you don&apos;t receive the email, check your spam
              folder.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Forgot password?</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a link to reset your password.
        </CardDescription>
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
              placeholder="you@company.com"
              autoComplete="email"
              required
              error={result?.fieldErrors?.email?.[0]}
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Send reset link
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link
            href="/login"
            className="text-text-secondary hover:text-text-primary flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
