'use client'

import { useState } from 'react'
import { Sparkles, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AiDraftPanelProps {
  draft: string
  confidence: number | null
  metadata: Record<string, unknown> | null
}

export function AiDraftPanel({ draft, confidence, metadata }: AiDraftPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const confidencePercent = confidence ? Math.round(confidence * 100) : null
  const confidenceColor =
    confidencePercent !== null
      ? confidencePercent >= 80
        ? 'text-success-500'
        : confidencePercent >= 60
          ? 'text-warning-500'
          : 'text-error-500'
      : ''

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center justify-between bg-primary-500/5 p-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary-500" />
          <h3 className="font-semibold text-text-primary">AI Draft</h3>
          {confidencePercent !== null && (
            <Badge variant="secondary" className={confidenceColor}>
              {confidencePercent}% confidence
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Metadata - simplified display */}
          {metadata && Object.keys(metadata).length > 0 && (
            <div className="mb-4">
              <Badge variant="secondary">{Object.keys(metadata).length} metadata field(s)</Badge>
            </div>
          )}

          {/* Draft content */}
          <div className="relative">
            <div className="max-h-96 overflow-y-auto rounded-lg bg-background-primary p-4">
              <p className="whitespace-pre-wrap text-sm text-text-primary">{draft}</p>
            </div>

            {/* Copy button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2"
              onClick={(e) => {
                e.stopPropagation()
                handleCopy()
              }}
            >
              {copied ? (
                <>
                  <Check className="mr-1 h-4 w-4 text-success-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>

          <p className="mt-2 text-xs text-text-secondary">
            This AI-generated draft is provided as a starting point. Please review and modify as
            needed before submitting your final response.
          </p>
        </div>
      )}
    </Card>
  )
}
