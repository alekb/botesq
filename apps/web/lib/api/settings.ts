import { api } from './client'

export interface OperatorProfile {
  id: string
  email: string
  companyName: string
  phone?: string | null
  jurisdiction?: string | null
  creditBalance: number
}

export interface PreAuthSettings {
  preAuthEnabled: boolean
  preAuthToken?: string | null
  preAuthMaxCredits?: number | null
}

export interface WebhookSettings {
  webhookUrl?: string | null
  webhookSecret?: string | null
  lastDeliveryAt?: string | null
  lastDeliveryStatus?: 'success' | 'failed' | null
}

export const settingsApi = {
  getProfile: () => api.get<OperatorProfile>('/api/settings/profile'),

  updateProfile: (data: { companyName?: string; phone?: string; jurisdiction?: string }) =>
    api.patch<OperatorProfile>('/api/settings/profile', data),

  getPreAuth: () => api.get<PreAuthSettings>('/api/settings/preauth'),

  updatePreAuth: (data: { enabled: boolean; maxCredits?: number }) =>
    api.patch<PreAuthSettings & { token?: string }>('/api/settings/preauth', data),

  regeneratePreAuthToken: () => api.post<{ token: string }>('/api/settings/preauth/regenerate'),

  getWebhook: () => api.get<WebhookSettings>('/api/settings/webhook'),

  updateWebhook: (url: string) =>
    api.patch<WebhookSettings & { secret: string }>('/api/settings/webhook', { url }),

  testWebhook: () => api.post<{ success: boolean }>('/api/settings/webhook/test'),

  regenerateWebhookSecret: () => api.post<{ secret: string }>('/api/settings/webhook/regenerate'),
}
