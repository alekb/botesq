import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, ArrowDownRight, RefreshCw, Gift, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCredits, formatDateTime } from '@/lib/utils/format'
import type { CreditTransactionType } from '@botesq/database'

interface Transaction {
  id: string
  type: CreditTransactionType
  amount: number
  description: string
  balanceBefore: number
  balanceAfter: number
  createdAt: Date
}

// Mock data - extended transaction history
const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'PURCHASE' as const,
    amount: 100000,
    description: 'Professional package',
    balanceBefore: 12500,
    balanceAfter: 112500,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    type: 'DEDUCTION' as const,
    amount: 5000,
    description: 'Contract review - MTR-001',
    balanceBefore: 112500,
    balanceAfter: 107500,
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    type: 'DEDUCTION' as const,
    amount: 2500,
    description: 'Legal Q&A - Entity formation',
    balanceBefore: 107500,
    balanceAfter: 105000,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    type: 'DEDUCTION' as const,
    amount: 10000,
    description: 'Matter creation - MTR-002',
    balanceBefore: 105000,
    balanceAfter: 95000,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: '5',
    type: 'DEDUCTION' as const,
    amount: 3500,
    description: 'Document analysis - 12 pages',
    balanceBefore: 95000,
    balanceAfter: 91500,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: '6',
    type: 'PURCHASE' as const,
    amount: 50000,
    description: 'Starter package',
    balanceBefore: 0,
    balanceAfter: 50000,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
  },
  {
    id: '7',
    type: 'DEDUCTION' as const,
    amount: 15000,
    description: 'Legal consultation - Trademark',
    balanceBefore: 50000,
    balanceAfter: 35000,
    createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
  },
  {
    id: '8',
    type: 'DEDUCTION' as const,
    amount: 22500,
    description: 'Contract drafting - NDA',
    balanceBefore: 35000,
    balanceAfter: 12500,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
]

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

export default function TransactionHistoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/portal/billing">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Transaction History</h1>
          <p className="text-text-secondary mt-1">
            Complete history of credit purchases and usage.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                    Description
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">
                    Amount
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockTransactions.map((tx) => {
                  const config = typeConfig[tx.type]
                  const Icon = config.icon
                  const isPositive =
                    tx.type === 'PURCHASE' || tx.type === 'REFUND' || tx.type === 'PROMO'

                  return (
                    <tr key={tx.id} className="border-b border-border-default last:border-0">
                      <td className="py-3 px-4 text-sm text-text-tertiary">
                        {formatDateTime(tx.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className={`flex items-center gap-2 ${config.color}`}>
                          <Icon className="h-4 w-4" />
                          <span className="text-sm font-medium">{config.label}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-text-primary">{tx.description}</td>
                      <td
                        className={`py-3 px-4 text-sm font-semibold text-right ${
                          isPositive ? 'text-success-500' : 'text-error-500'
                        }`}
                      >
                        {isPositive ? '+' : '-'}
                        {formatCredits(Math.abs(tx.amount))}
                      </td>
                      <td className="py-3 px-4 text-sm text-text-primary text-right">
                        {formatCredits(tx.balanceAfter)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
