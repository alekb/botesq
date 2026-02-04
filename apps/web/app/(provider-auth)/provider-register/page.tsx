'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { providerRegisterAction, type AuthResult } from '@/lib/auth/provider-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

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

export default function ProviderRegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AuthResult | null>(null)
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<string[]>([])
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])

  const toggleJurisdiction = (value: string) => {
    setSelectedJurisdictions((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const toggleSpecialty = (value: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setResult(null)

    const formData = new FormData(event.currentTarget)

    // Add selected jurisdictions and specialties
    selectedJurisdictions.forEach((j) => formData.append('jurisdictions', j))
    selectedSpecialties.forEach((s) => formData.append('specialties', s))

    const res = await providerRegisterAction(formData)

    if (res.success) {
      router.push('/provider-login?registered=true')
    } else {
      setResult(res)
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Become a Provider</CardTitle>
        <CardDescription>Apply to join BotEsq as a legal services provider</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {result?.error && <Alert variant="error">{result.error}</Alert>}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Your firm name"
                required
                error={result?.fieldErrors?.name?.[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalName">Legal Name</Label>
              <Input
                id="legalName"
                name="legalName"
                type="text"
                placeholder="Legal entity name"
                required
                error={result?.fieldErrors?.legalName?.[0]}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="contact@yourfirm.com"
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
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              autoComplete="new-password"
              required
              error={result?.fieldErrors?.password?.[0]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <textarea
              id="description"
              name="description"
              className="w-full px-3 py-2 text-sm bg-background-secondary border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={3}
              placeholder="Tell us about your practice..."
            />
          </div>

          <div className="space-y-2">
            <Label>Jurisdictions</Label>
            {result?.fieldErrors?.jurisdictions && (
              <p className="text-sm text-error-500">{result.fieldErrors.jurisdictions[0]}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {JURISDICTIONS.map((j) => (
                <button
                  key={j.value}
                  type="button"
                  onClick={() => toggleJurisdiction(j.value)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    selectedJurisdictions.includes(j.value)
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
            {result?.fieldErrors?.specialties && (
              <p className="text-sm text-error-500">{result.fieldErrors.specialties[0]}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggleSpecialty(s.value)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    selectedSpecialties.includes(s.value)
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : 'border-border-default text-text-secondary hover:border-primary-500'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Submit Application
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link href="/provider-login" className="text-primary-500 hover:text-primary-400">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
