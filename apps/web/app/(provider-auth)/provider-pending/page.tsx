'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Clock, Mail, CheckCircle } from 'lucide-react'
import { getCurrentProvider, providerLogoutAction } from '@/lib/auth/provider-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Provider } from '@/types/provider'

export default function ProviderPendingPage() {
  const router = useRouter()
  const [provider, setProvider] = useState<Provider | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkStatus() {
      const { provider } = await getCurrentProvider()
      if (!provider) {
        router.push('/provider-login')
        return
      }
      if (provider.status === 'ACTIVE') {
        router.push('/provider')
        return
      }
      setProvider(provider)
      setIsLoading(false)
    }
    checkStatus()
  }, [router])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning-500/10">
          <Clock className="h-8 w-8 text-warning-500" />
        </div>
        <CardTitle className="text-2xl">Application Pending</CardTitle>
        <CardDescription>Your provider application is being reviewed</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg bg-background-secondary p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-text-secondary mt-0.5" />
            <div>
              <p className="text-sm font-medium">We&apos;ll email you</p>
              <p className="text-sm text-text-secondary">
                Once your application is approved, we&apos;ll notify you at{' '}
                <span className="text-text-primary">{provider?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-text-secondary mt-0.5" />
            <div>
              <p className="text-sm font-medium">What happens next?</p>
              <p className="text-sm text-text-secondary">
                Our team reviews all applications within 1-2 business days. We may reach out if we
                need additional information.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center space-y-3">
          <form action={providerLogoutAction}>
            <Button type="submit" variant="outline" className="w-full">
              Sign out
            </Button>
          </form>

          <p className="text-sm text-text-secondary">
            Questions?{' '}
            <Link href="/contact" className="text-primary-500 hover:text-primary-400">
              Contact support
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
