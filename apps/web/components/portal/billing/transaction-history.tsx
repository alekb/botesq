import { ArrowUpRight, ArrowDownRight, RefreshCw, Gift, Wrench } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCredits, formatDateTime } from '@/lib/utils/format'
import type { CreditTransactionType } from '@botesq/database'

interface Transaction {
  id: string
  type: CreditTransactionType
  amount: number
  description?: string | null
  createdAt: Date
}

interface TransactionHistoryProps {
  transactions: Transaction[]
}

const typeConfig: Record<
  CreditTransactionType,
  { label: string; icon: typeof ArrowUpRight; color: string }
> = {
  PURCHASE: { label: 'Purchase', icon: ArrowUpRight, color: 'text-success-500' },
  DEDUCTION: { label: 'Usage', icon: ArrowDownRight, color: 'text-error-500' },
  REFUND: { label: 'Refund', icon: RefreshCw, color: 'text-primary-500' },
  PROMO: { label: 'Promotional', icon: Gift, color: 'text-success-500' },
  ADJUSTMENT: { label: 'Adjustment', icon: Wrench, color: 'text-text-secondary' },
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-text-secondary py-8">No transactions yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.map((tx) => {
            const config = typeConfig[tx.type]
            const Icon = config.icon
            const isPositive = tx.type === 'PURCHASE' || tx.type === 'REFUND' || tx.type === 'PROMO'

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-4 py-3 border-b border-border-default last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className={`${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{config.label}</p>
                    {tx.description && (
                      <p className="text-sm text-text-secondary">{tx.description}</p>
                    )}
                    <p className="text-xs text-text-tertiary">{formatDateTime(tx.createdAt)}</p>
                  </div>
                </div>
                <p
                  className={`font-semibold ${isPositive ? 'text-success-500' : 'text-error-500'}`}
                >
                  {isPositive ? '+' : '-'}
                  {formatCredits(Math.abs(tx.amount))}
                </p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
