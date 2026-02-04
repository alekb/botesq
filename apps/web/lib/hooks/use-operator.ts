'use client'

import { useQuery } from '@tanstack/react-query'
import { settingsApi, type OperatorProfile } from '../api'

export function useOperator() {
  return useQuery<OperatorProfile>({
    queryKey: ['operator'],
    queryFn: () => settingsApi.getProfile(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
