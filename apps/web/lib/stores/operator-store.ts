import { create } from 'zustand'
import type { OperatorProfile } from '../api'

interface OperatorState {
  operator: OperatorProfile | null
  isLoading: boolean
  error: string | null
  setOperator: (operator: OperatorProfile | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  updateCredits: (credits: number) => void
}

export const useOperatorStore = create<OperatorState>((set) => ({
  operator: null,
  isLoading: false,
  error: null,
  setOperator: (operator) => set({ operator, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  updateCredits: (credits) =>
    set((state) => ({
      operator: state.operator ? { ...state.operator, creditBalance: credits } : null,
    })),
}))
