'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CreditBalance, CreditPackages, TransactionHistory } from '@/components/portal/billing'
import { Button } from '@/components/ui/button'
import { useToast } from '@/lib/hooks/use-toast'
import { History } from 'lucide-react'

// Mock data - will be replaced with real data fetching
const mockBalance = {
  balance: 50000,
  monthlyUsage: 12500,
  lastPurchase: {
    amount: 100000,
    date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  },
}

const mockPackages = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 50000,
    priceUsd: 4900, // $49
    features: ['50,000 credits', 'Basic support'],
  },
  {
    id: 'professional',
    name: 'Professional',
    credits: 200000,
    priceUsd: 14900, // $149
    popular: true,
    features: ['200,000 credits', 'Priority support', 'Volume discount'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    credits: 1000000,
    priceUsd: 49900, // $499
    features: ['1,000,000 credits', 'Dedicated support', 'Best value'],
  },
]

const mockTransactions = [
  {
    id: '1',
    type: 'PURCHASE' as const,
    amount: 100000,
    description: 'Professional package',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    type: 'DEDUCTION' as const,
    amount: 5000,
    description: 'Contract review - MTR-001',
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    type: 'DEDUCTION' as const,
    amount: 2500,
    description: 'Legal Q&A - Entity formation',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    type: 'DEDUCTION' as const,
    amount: 10000,
    description: 'Matter creation - MTR-002',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: '5',
    type: 'DEDUCTION' as const,
    amount: 3500,
    description: 'Document analysis - 12 pages',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
]

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState<string | undefined>()
  const { toast } = useToast()

  const handleSelectPackage = async (packageId: string) => {
    setSelectedPackageId(packageId)
    setIsLoading(true)

    // Simulate redirect to Stripe checkout
    await new Promise((resolve) => setTimeout(resolve, 1000))

    toast({
      title: 'Redirecting to checkout...',
      description: 'You will be redirected to Stripe to complete your purchase.',
    })

    // In real implementation, this would redirect to Stripe checkout
    setIsLoading(false)
    setSelectedPackageId(undefined)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Billing</h1>
          <p className="text-text-secondary mt-1">
            Manage your credits and view transaction history.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/portal/billing/history">
            <History className="h-4 w-4 mr-2" />
            Full History
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CreditBalance {...mockBalance} />
        <div className="lg:col-span-2">
          <TransactionHistory transactions={mockTransactions.slice(0, 5)} />
        </div>
      </div>

      <CreditPackages
        packages={mockPackages}
        onSelectPackage={handleSelectPackage}
        isLoading={isLoading}
        selectedPackageId={selectedPackageId}
      />
    </div>
  )
}
