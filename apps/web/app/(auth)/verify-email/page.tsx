'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { verifyEmail } from '@/lib/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { CheckCircle, XCircle } from 'lucide-react'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function verify() {
      if (!token) {
        setStatus('error')
        setErrorMessage('Invalid verification link. Please check your email and try again.')
        return
      }

      const result = await verifyEmail(token)

      if (result.success) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMessage(result.error || 'Verification failed. Please try again.')
      }
    }

    verify()
  }, [token])

  return (
    <Card>
      <CardContent className="pt-6">
        {status === 'loading' && (
          <div className="text-center space-y-4">
            <Spinner size="lg" className="mx-auto" />
            <p className="text-text-secondary">Verifying your email...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-12 w-12 text-success-500" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary">Email verified!</h2>
            <p className="text-text-secondary">
              Your account is now active. You can sign in to start using BotEsq.
            </p>
            <Button asChild className="mt-4">
              <Link href="/login">Sign in to your account</Link>
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <XCircle className="h-12 w-12 text-error-500" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary">Verification failed</h2>
            <p className="text-text-secondary">{errorMessage}</p>
            <div className="flex flex-col gap-2 mt-4">
              <Button asChild variant="primary">
                <Link href="/login">Try logging in</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/signup">Create a new account</Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function VerifyEmailSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <Spinner size="lg" className="mx-auto" />
          <p className="text-text-secondary">Loading...</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailSkeleton />}>
      <VerifyEmailContent />
    </Suspense>
  )
}
