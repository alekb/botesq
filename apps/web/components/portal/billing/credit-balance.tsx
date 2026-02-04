import { CreditCard, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCredits } from '@/lib/utils/format'

interface CreditBalanceProps {
  balance: number
  monthlyUsage: number
  lastPurchase?: {
    amount: number
    date: Date
  }
}

export function CreditBalance({ balance, monthlyUsage, lastPurchase }: CreditBalanceProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Credit Balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-4xl font-bold text-primary-500">{formatCredits(balance)}</p>
            <p className="text-sm text-text-secondary mt-1">Available credits</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-default">
            <div>
              <div className="flex items-center gap-1 text-error-500">
                <TrendingDown className="h-4 w-4" />
                <span className="text-sm font-medium">This Month</span>
              </div>
              <p className="text-lg font-semibold text-text-primary mt-1">
                -{formatCredits(monthlyUsage)}
              </p>
            </div>
            {lastPurchase && (
              <div>
                <div className="flex items-center gap-1 text-success-500">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Last Purchase</span>
                </div>
                <p className="text-lg font-semibold text-text-primary mt-1">
                  +{formatCredits(lastPurchase.amount)}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
