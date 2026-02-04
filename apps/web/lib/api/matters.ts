import { api } from './client'
import type { MatterStatus, MatterType, MatterUrgency } from '@botesq/database'

export interface Matter {
  id: string
  externalId: string
  title: string
  description?: string | null
  type: MatterType
  status: MatterStatus
  urgency: MatterUrgency
  createdAt: string
  updatedAt: string
  resolvedAt?: string | null
  closedAt?: string | null
  documentCount?: number
  retainer?: {
    scope: string
    feeArrangement: string
    estimatedFee?: number | null
    acceptedAt?: string | null
  } | null
}

export interface ListMattersParams {
  status?: MatterStatus
  type?: MatterType
  page?: number
  limit?: number
  [key: string]: string | number | boolean | undefined
}

export interface ListMattersResponse {
  matters: Matter[]
  total: number
  page: number
  limit: number
}

export const mattersApi = {
  list: (params?: ListMattersParams) => api.get<ListMattersResponse>('/api/matters', { params }),

  get: (id: string) => api.get<Matter>(`/api/matters/${id}`),

  getTimeline: (id: string) =>
    api.get<{
      events: Array<{
        id: string
        type: string
        title: string
        description?: string
        timestamp: string
        status?: string
      }>
    }>(`/api/matters/${id}/timeline`),

  getDocuments: (id: string) =>
    api.get<{
      documents: Array<{
        id: string
        filename: string
        mimeType: string
        fileSize: number
        pageCount?: number
        analysisStatus: string
        uploadedAt: string
      }>
    }>(`/api/matters/${id}/documents`),

  getMessages: (id: string) =>
    api.get<{ messages: Array<{ id: string; role: string; content: string; createdAt: string }> }>(
      `/api/matters/${id}/messages`
    ),
}
