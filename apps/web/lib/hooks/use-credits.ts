'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { billingApi } from '../api'

export function useCreditBalance() {
  return useQuery({
    queryKey: ['creditBalance'],
    queryFn: () => billingApi.getBalance(),
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useTransactions(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => billingApi.getTransactions(params),
  })
}

export function useCreditPackages() {
  return useQuery({
    queryKey: ['creditPackages'],
    queryFn: () => billingApi.getPackages(),
    staleTime: 60 * 60 * 1000, // 1 hour (packages rarely change)
  })
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (packageId: string) => billingApi.createCheckoutSession(packageId),
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      window.location.href = data.url
    },
  })
}
