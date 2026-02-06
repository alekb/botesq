'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

const INQUIRY_OPTIONS = [
  { value: '', label: 'Select an inquiry type' },
  { value: 'sales', label: 'Sales — Pricing & enterprise plans' },
  { value: 'support', label: 'Support — Integration help & troubleshooting' },
  { value: 'legal', label: 'Legal — Privacy, security & compliance' },
  { value: 'general', label: 'General — Everything else' },
] as const

type InquiryType = 'sales' | 'support' | 'legal' | 'general'

interface FormData {
  name: string
  email: string
  inquiryType: string
  message: string
}

interface FormErrors {
  name?: string
  email?: string
  inquiryType?: string
  message?: string
}

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {}

  if (data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters'
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Please enter a valid email address'
  }

  if (!data.inquiryType) {
    errors.inquiryType = 'Please select an inquiry type'
  }

  if (data.message.trim().length < 10) {
    errors.message = 'Message must be at least 10 characters'
  }

  return errors
}

export function ContactForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    inquiryType: '',
    message: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [mountTime, setMountTime] = useState(0)

  useEffect(() => {
    setMountTime(Date.now())
  }, [])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear field error on change
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validationErrors = validate(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsLoading(true)
    setSubmitStatus('idle')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          inquiryType: formData.inquiryType as InquiryType,
          message: formData.message.trim(),
          website: '',
          timestamp: mountTime,
        }),
      })

      if (!res.ok) {
        throw new Error('Request failed')
      }

      setSubmitStatus('success')
      setFormData({ name: '', email: '', inquiryType: '', message: '' })
      setErrors({})
      setMountTime(Date.now())
    } catch {
      setSubmitStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  if (submitStatus === 'success') {
    return (
      <Alert variant="success">
        <AlertDescription>
          Thanks for reaching out! We&apos;ll get back to you within 1-2 business days.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {submitStatus === 'error' && (
        <Alert variant="error">
          <AlertDescription>
            Something went wrong. Please try again, or email us directly at{' '}
            <a href="mailto:hello@botesq.com" className="underline">
              hello@botesq.com
            </a>
            .
          </AlertDescription>
        </Alert>
      )}

      {/* Honeypot — hidden from real users */}
      <div style={{ position: 'absolute', left: '-9999px', opacity: 0 }} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name" required>
            Name
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="Your name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" required>
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="inquiryType" required>
          Inquiry Type
        </Label>
        <div className="w-full">
          <select
            id="inquiryType"
            name="inquiryType"
            value={formData.inquiryType}
            onChange={handleChange}
            disabled={isLoading}
            aria-invalid={errors.inquiryType ? 'true' : undefined}
            className={`flex h-10 w-full rounded-md border bg-background-tertiary px-4 py-2 text-sm text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary disabled:cursor-not-allowed disabled:opacity-50 ${
              errors.inquiryType
                ? 'border-error-500 focus-visible:ring-error-500'
                : 'border-border-default hover:border-border-hover'
            } ${!formData.inquiryType ? 'text-text-tertiary' : ''}`}
          >
            {INQUIRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.inquiryType && (
            <p className="mt-1 text-sm text-error-500" role="alert">
              {errors.inquiryType}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message" required>
          Message
        </Label>
        <Textarea
          id="message"
          name="message"
          placeholder="How can we help?"
          rows={5}
          value={formData.message}
          onChange={handleChange}
          error={errors.message}
          disabled={isLoading}
        />
      </div>

      <Button type="submit" size="lg" isLoading={isLoading}>
        Send Message
      </Button>
    </form>
  )
}
