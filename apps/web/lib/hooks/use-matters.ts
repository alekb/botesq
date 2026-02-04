'use client'

import { useQuery } from '@tanstack/react-query'
import { mattersApi, type ListMattersParams, type Matter } from '../api'

export function useMatters(params?: ListMattersParams) {
  return useQuery({
    queryKey: ['matters', params],
    queryFn: () => mattersApi.list(params),
  })
}

export function useMatter(id: string) {
  return useQuery<Matter>({
    queryKey: ['matter', id],
    queryFn: () => mattersApi.get(id),
    enabled: !!id,
  })
}

export function useMatterTimeline(id: string) {
  return useQuery({
    queryKey: ['matter', id, 'timeline'],
    queryFn: () => mattersApi.getTimeline(id),
    enabled: !!id,
  })
}

export function useMatterDocuments(id: string) {
  return useQuery({
    queryKey: ['matter', id, 'documents'],
    queryFn: () => mattersApi.getDocuments(id),
    enabled: !!id,
  })
}

export function useMatterMessages(id: string) {
  return useQuery({
    queryKey: ['matter', id, 'messages'],
    queryFn: () => mattersApi.getMessages(id),
    enabled: !!id,
  })
}
