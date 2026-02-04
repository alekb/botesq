'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Attorney } from '@botesq/database'

interface AttorneyState {
  attorney: Attorney | null
  isLoading: boolean
  error: string | null
}

export function useAttorney() {
  const [state, setState] = useState<AttorneyState>({
    attorney: null,
    isLoading: true,
    error: null,
  })

  const fetchAttorney = useCallback(async () => {
    try {
      const response = await fetch('/api/attorney/me')
      if (!response.ok) {
        throw new Error('Failed to fetch attorney')
      }
      const data = await response.json()
      setState({ attorney: data.attorney, isLoading: false, error: null })
    } catch (error) {
      setState({
        attorney: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [])

  useEffect(() => {
    fetchAttorney()
  }, [fetchAttorney])

  return {
    ...state,
    refresh: fetchAttorney,
  }
}
