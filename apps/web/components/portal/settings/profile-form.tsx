'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ProfileFormProps {
  initialData: {
    email: string
    companyName: string
    phone?: string | null
    jurisdiction?: string | null
  }
  onSave: (data: { companyName: string; phone?: string; jurisdiction?: string }) => Promise<void>
}

export function ProfileForm({ initialData, onSave }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [companyName, setCompanyName] = useState(initialData.companyName)
  const [phone, setPhone] = useState(initialData.phone || '')
  const [jurisdiction, setJurisdiction] = useState(initialData.jurisdiction || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    await onSave({ companyName, phone, jurisdiction })
    setIsLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your company details and contact information.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={initialData.email}
              disabled
              className="bg-background-tertiary"
            />
            <p className="text-xs text-text-tertiary">Email cannot be changed.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jurisdiction">Primary Jurisdiction</Label>
            <Input
              id="jurisdiction"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              placeholder="e.g., California, USA"
            />
            <p className="text-xs text-text-tertiary">
              This helps us route legal questions appropriately.
            </p>
          </div>

          <Button type="submit" isLoading={isLoading}>
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
