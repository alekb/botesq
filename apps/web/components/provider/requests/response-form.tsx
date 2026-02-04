'use client'

import { useState } from 'react'
import { Send, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import type { ProviderRequest, ProviderServiceType } from '@/types/provider'

interface ResponseFormProps {
  request: ProviderRequest
  onSubmit: (response: Record<string, unknown>) => Promise<void>
  onEscalate: () => void
  isSubmitting?: boolean
}

// Define fields based on service type
function getResponseFields(serviceType: ProviderServiceType): Array<{
  name: string
  label: string
  type: 'text' | 'textarea' | 'json'
  required: boolean
}> {
  switch (serviceType) {
    case 'LEGAL_QA':
      return [
        { name: 'answer', label: 'Answer', type: 'textarea', required: true },
        { name: 'citations', label: 'Citations (optional)', type: 'textarea', required: false },
        { name: 'caveats', label: 'Caveats/Disclaimers', type: 'textarea', required: false },
      ]
    case 'DOCUMENT_REVIEW':
      return [
        { name: 'summary', label: 'Summary', type: 'textarea', required: true },
        { name: 'issues', label: 'Issues Found', type: 'textarea', required: true },
        { name: 'recommendations', label: 'Recommendations', type: 'textarea', required: true },
        { name: 'riskLevel', label: 'Risk Level (low/medium/high)', type: 'text', required: true },
      ]
    case 'CONSULTATION':
      return [
        { name: 'summary', label: 'Consultation Summary', type: 'textarea', required: true },
        { name: 'advice', label: 'Legal Advice', type: 'textarea', required: true },
        { name: 'nextSteps', label: 'Recommended Next Steps', type: 'textarea', required: false },
      ]
    default:
      return [
        { name: 'response', label: 'Response', type: 'textarea', required: true },
        { name: 'notes', label: 'Additional Notes', type: 'textarea', required: false },
      ]
  }
}

export function ResponseForm({ request, onSubmit, onEscalate, isSubmitting }: ResponseFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const fields = getResponseFields(request.serviceType)

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate required fields
    for (const field of fields) {
      if (field.required && !formData[field.name]?.trim()) {
        setError(`${field.label} is required`)
        return
      }
    }

    try {
      await onSubmit(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Submit Response</CardTitle>
        <CardDescription>Provide your professional response to this request</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="text-error-500 ml-1">*</span>}
              </Label>
              {field.type === 'textarea' ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background-secondary border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[120px]"
                  required={field.required}
                />
              ) : (
                <input
                  id={field.name}
                  name={field.name}
                  type="text"
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background-secondary border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required={field.required}
                />
              )}
            </div>
          ))}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button type="submit" className="flex-1 gap-2" isLoading={isSubmitting}>
              <Send className="h-4 w-4" />
              Submit Response
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onEscalate}
              className="gap-2"
              disabled={isSubmitting}
            >
              <AlertTriangle className="h-4 w-4" />
              Escalate
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
