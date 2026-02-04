import { api } from './client'
import type { CreditTransactionType } from '@botesq/database'

export interface CreditBalance {
  balance: number
  monthlyUsage: number
  lastPurchase?: {
    amount: number
    date: string
  }
}

export interface CreditTransaction {
  id: string
  type: CreditTransactionType
  amount: number
  description?: string | null
  balanceBefore: number
  balanceAfter: number
  createdAt: string
}

export interface CreditPackage {
  id: string
  name: string
  credits: number
  priceUsd: number
  popular?: boolean
  features?: string[]
}

export interface CheckoutSession {
  url: string
  sessionId: string
}

export const billingApi = {
  getBalance: () => api.get<CreditBalance>('/api/billing/balance'),

  getTransactions: (params?: { page?: number; limit?: number }) =>
    api.get<{ transactions: CreditTransaction[]; total: number }>('/api/billing/transactions', {
      params,
    }),

  getPackages: () => api.get<{ packages: CreditPackage[] }>('/api/billing/packages'),

  createCheckoutSession: (packageId: string) =>
    api.post<CheckoutSession>('/api/billing/checkout', { packageId }),
}
