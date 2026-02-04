export { api, apiClient, ApiError } from './client'
export {
  mattersApi,
  type Matter,
  type ListMattersParams,
  type ListMattersResponse,
} from './matters'
export { apiKeysApi, type ApiKey, type CreateApiKeyResponse } from './api-keys'
export {
  billingApi,
  type CreditBalance,
  type CreditTransaction,
  type CreditPackage,
  type CheckoutSession,
} from './billing'
export {
  settingsApi,
  type OperatorProfile,
  type PreAuthSettings,
  type WebhookSettings,
} from './settings'
