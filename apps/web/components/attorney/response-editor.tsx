'use client'

import { useState, useTransition } from 'react'
import { Send, Loader2, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { submitConsultationResponse } from '@/lib/attorney-auth/consultation-actions'
import { useRouter } from 'next/navigation'

interface ResponseEditorProps {
  consultationId: string
  initialResponse: string | null
  aiDraft: string | null
}

export function ResponseEditor({ consultationId, initialResponse, aiDraft }: ResponseEditorProps) {
  const router = useRouter()
  const [response, setResponse] = useState(initialResponse || '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleUseAiDraft() {
    if (aiDraft) {
      setResponse(aiDraft)
    }
  }

  function handleSubmit() {
    if (!response.trim()) {
      setError('Please enter a response')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await submitConsultationResponse(consultationId, response)
      if (result.success) {
        router.push('/attorney/queue')
        router.refresh()
      } else {
        setError(result.error || 'Failed to submit response')
      }
    })
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-text-primary">Your Response</h3>
        {aiDraft && (
          <Button variant="ghost" size="sm" onClick={handleUseAiDraft}>
            <Sparkles className="mr-1 h-4 w-4" />
            Use AI Draft
          </Button>
        )}
      </div>

      <Textarea
        placeholder="Enter your legal response..."
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        rows={12}
        className="mb-4 resize-none"
        disabled={isPending}
      />

      {error && <p className="mb-4 text-sm text-error-500">{error}</p>}

      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary">
          {response.length} characters
          {response.split(/\s+/).filter(Boolean).length > 0 &&
            ` / ${response.split(/\s+/).filter(Boolean).length} words`}
        </p>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setResponse('')}
            disabled={isPending || !response}
          >
            Clear
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !response.trim()}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Response
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}
