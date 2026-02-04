'use client'

import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import { formatCredits, formatCurrency } from '@/lib/utils/format'

interface Package {
  id: string
  name: string
  credits: number
  priceUsd: number
  popular?: boolean
  features?: string[]
}

interface CreditPackagesProps {
  packages: Package[]
  onSelectPackage: (packageId: string) => void
  isLoading?: boolean
  selectedPackageId?: string
}

export function CreditPackages({
  packages,
  onSelectPackage,
  isLoading,
  selectedPackageId,
}: CreditPackagesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Purchase Credits</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.map((pkg) => {
            const pricePerCredit = (pkg.priceUsd / pkg.credits) * 100
            return (
              <div
                key={pkg.id}
                className={cn(
                  'relative rounded-lg border-2 p-4 transition-colors',
                  pkg.popular
                    ? 'border-primary-500 bg-primary-500/5'
                    : 'border-border-default hover:border-border-hover'
                )}
              >
                {pkg.popular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <div className="text-center mb-4">
                  <p className="text-lg font-semibold text-text-primary">{pkg.name}</p>
                  <p className="text-3xl font-bold text-text-primary mt-2">
                    {formatCredits(pkg.credits)}
                  </p>
                  <p className="text-sm text-text-secondary">credits</p>
                </div>
                <div className="text-center mb-4">
                  <p className="text-2xl font-semibold text-primary-500">
                    {formatCurrency(pkg.priceUsd)}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    ${pricePerCredit.toFixed(4)} per credit
                  </p>
                </div>
                {pkg.features && (
                  <ul className="space-y-2 mb-4">
                    {pkg.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm text-text-secondary"
                      >
                        <Check className="h-4 w-4 text-success-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  variant={pkg.popular ? 'primary' : 'outline'}
                  className="w-full"
                  onClick={() => onSelectPackage(pkg.id)}
                  isLoading={isLoading && selectedPackageId === pkg.id}
                  disabled={isLoading}
                >
                  Purchase
                </Button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
