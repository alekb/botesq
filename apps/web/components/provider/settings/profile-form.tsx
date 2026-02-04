'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import type { Provider, ProviderProfileUpdateInput } from '@/types/provider'

const JURISDICTIONS = [
  { value: 'US-CA', label: 'California' },
  { value: 'US-NY', label: 'New York' },
  { value: 'US-TX', label: 'Texas' },
  { value: 'US-FL', label: 'Florida' },
  { value: 'US-DE', label: 'Delaware' },
  { value: 'US-IL', label: 'Illinois' },
  { value: 'US-WA', label: 'Washington' },
  { value: 'US-MA', label: 'Massachusetts' },
  { value: 'US-CO', label: 'Colorado' },
  { value: 'US-GA', label: 'Georgia' },
]

const SPECIALTIES = [
  { value: 'CONTRACT_REVIEW', label: 'Contract Review' },
  { value: 'ENTITY_FORMATION', label: 'Entity Formation' },
  { value: 'COMPLIANCE', label: 'Compliance' },
  { value: 'IP_TRADEMARK', label: 'IP / Trademark' },
  { value: 'IP_COPYRIGHT', label: 'IP / Copyright' },
  { value: 'GENERAL_CONSULTATION', label: 'General Consultation' },
  { value: 'LITIGATION_CONSULTATION', label: 'Litigation Consultation' },
]

interface ProfileFormProps {
  provider: Provider
  onSubmit: (data: ProviderProfileUpdateInput) => Promise<void>
  isSubmitting?: boolean
}

export function ProfileForm({ provider, onSubmit, isSubmitting }: ProfileFormProps) {
  const [formData, setFormData] = useState({
    name: provider.name,
    legalName: provider.legalName,
    description: provider.description || '',
    jurisdictions: provider.jurisdictions,
    specialties: provider.specialties,
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const toggleJurisdiction = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      jurisdictions: prev.jurisdictions.includes(value)
        ? prev.jurisdictions.filter((v) => v !== value)
        : [...prev.jurisdictions, value],
    }))
  }

  const toggleSpecialty = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(value as (typeof prev.specialties)[number])
        ? prev.specialties.filter((v) => v !== value)
        : [...prev.specialties, value as (typeof prev.specialties)[number]],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!formData.name.trim()) {
      setError('Display name is required')
      return
    }
    if (!formData.legalName.trim()) {
      setError('Legal name is required')
      return
    }
    if (formData.jurisdictions.length === 0) {
      setError('Select at least one jurisdiction')
      return
    }
    if (formData.specialties.length === 0) {
      setError('Select at least one specialty')
      return
    }

    try {
      await onSubmit({
        name: formData.name,
        legalName: formData.legalName,
        description: formData.description || undefined,
        jurisdictions: formData.jurisdictions,
        specialties: formData.specialties,
      })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your provider profile details</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          {success && <Alert variant="success">Profile updated successfully</Alert>}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalName">Legal Name</Label>
              <Input
                id="legalName"
                value={formData.legalName}
                onChange={(e) => setFormData((prev) => ({ ...prev, legalName: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={provider.email} disabled />
            <p className="text-xs text-text-secondary">Contact support to change your email</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-background-secondary border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={3}
              placeholder="Tell us about your practice..."
            />
          </div>

          <div className="space-y-2">
            <Label>Jurisdictions</Label>
            <div className="flex flex-wrap gap-2">
              {JURISDICTIONS.map((j) => (
                <button
                  key={j.value}
                  type="button"
                  onClick={() => toggleJurisdiction(j.value)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    formData.jurisdictions.includes(j.value)
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : 'border-border-default text-text-secondary hover:border-primary-500'
                  }`}
                >
                  {j.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Specialties</Label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggleSpecialty(s.value)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    formData.specialties.includes(s.value as (typeof formData.specialties)[number])
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : 'border-border-default text-text-secondary hover:border-primary-500'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
