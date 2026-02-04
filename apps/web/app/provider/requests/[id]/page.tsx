'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Play } from 'lucide-react'
import Link from 'next/link'
import { RequestDetail, ResponseForm, EscalationDialog } from '@/components/provider/requests'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { getProviderToken } from '@/lib/auth/provider-session'
import {
  getProviderRequest,
  claimProviderRequest,
  submitProviderRequestResponse,
  escalateProviderRequest,
} from '@/lib/api/provider-requests'
import type { ProviderRequest } from '@/types/provider'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ProviderRequestDetailPage({ params }: PageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const requestId = resolvedParams.id

  const [request, setRequest] = useState<ProviderRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClaiming, setIsClaiming] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEscalation, setShowEscalation] = useState(false)

  useEffect(() => {
    async function loadRequest() {
      const token = await getProviderToken()
      if (!token) return

      try {
        const data = await getProviderRequest(token, requestId)
        setRequest(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load request')
      } finally {
        setIsLoading(false)
      }
    }

    loadRequest()
  }, [requestId])

  const handleClaim = async () => {
    const token = await getProviderToken()
    if (!token || !request) return

    setIsClaiming(true)
    setError(null)

    try {
      const updated = await claimProviderRequest(token, request.id)
      setRequest(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim request')
    } finally {
      setIsClaiming(false)
    }
  }

  const handleSubmitResponse = async (response: Record<string, unknown>) => {
    const token = await getProviderToken()
    if (!token || !request) return

    setIsSubmitting(true)
    setError(null)

    try {
      await submitProviderRequestResponse(token, request.id, { response })
      router.push('/provider/requests')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response')
      setIsSubmitting(false)
    }
  }

  const handleEscalate = async (reason: string, notes?: string) => {
    const token = await getProviderToken()
    if (!token || !request) return

    setIsSubmitting(true)
    setError(null)

    try {
      await escalateProviderRequest(token, request.id, { reason, notes })
      router.push('/provider/requests')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to escalate request')
      setIsSubmitting(false)
      throw err // Let the dialog handle it
    }
  }

  const isPending = request?.status === 'PENDING' || request?.status === 'SENT_TO_PROVIDER'
  const isInProgress = request?.status === 'IN_PROGRESS'
  const isCompleted =
    request?.status === 'COMPLETED' ||
    request?.status === 'FAILED' ||
    request?.status === 'CANCELLED'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/provider/requests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Request Details</h1>
          <p className="text-text-secondary">Review and respond to this request</p>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Request detail */}
      <RequestDetail request={request ?? undefined} isLoading={isLoading} />

      {/* Claim button for pending requests */}
      {isPending && request && (
        <div className="flex justify-end">
          <Button onClick={handleClaim} isLoading={isClaiming} className="gap-2">
            <Play className="h-4 w-4" />
            Claim & Start Working
          </Button>
        </div>
      )}

      {/* Response form for in-progress requests */}
      {isInProgress && request && (
        <ResponseForm
          request={request}
          onSubmit={handleSubmitResponse}
          onEscalate={() => setShowEscalation(true)}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Completed state message */}
      {isCompleted && (
        <div className="text-center py-6 text-text-secondary">
          This request has been {request?.status.toLowerCase()}.
        </div>
      )}

      {/* Escalation dialog */}
      <EscalationDialog
        open={showEscalation}
        onOpenChange={setShowEscalation}
        onConfirm={handleEscalate}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
