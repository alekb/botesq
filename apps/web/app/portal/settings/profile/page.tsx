'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProfileForm } from '@/components/portal/settings'
import { useToast } from '@/lib/hooks/use-toast'

// Mock data - will be replaced with real data fetching
const mockOperator = {
  email: 'operator@example.com',
  companyName: 'Acme Inc.',
  phone: '+1 (555) 123-4567',
  jurisdiction: 'California, USA',
}

export default function ProfileSettingsPage() {
  const { toast } = useToast()

  const handleSave = async (_data: {
    companyName: string
    phone?: string
    jurisdiction?: string
  }) => {
    // Mock save - will be replaced with real API call
    await new Promise((resolve) => setTimeout(resolve, 500))
    toast({
      title: 'Profile updated',
      description: 'Your profile has been saved successfully.',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/portal/settings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Profile Settings</h1>
          <p className="text-text-secondary mt-1">
            Update your company details and contact information.
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <ProfileForm initialData={mockOperator} onSave={handleSave} />
      </div>
    </div>
  )
}
