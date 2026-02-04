import { api } from './client'
import type { ApiKeyStatus } from '@botesq/database'

export interface ApiKey {
  id: string
  keyPrefix: string
  name?: string | null
  status: ApiKeyStatus
  createdAt: string
  lastUsedAt?: string | null
  expiresAt?: string | null
}

export interface CreateApiKeyResponse {
  key: string
  prefix: string
  apiKey: ApiKey
}

export const apiKeysApi = {
  list: () => api.get<{ apiKeys: ApiKey[] }>('/api/api-keys'),

  create: (name?: string) => api.post<CreateApiKeyResponse>('/api/api-keys', { name }),

  revoke: (id: string) => api.delete<void>(`/api/api-keys/${id}`),
}
