import type { MatterType } from '@botesq/database'

// Provider status types
export type ProviderStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'

// Provider service types
export type ProviderServiceType =
  | 'LEGAL_QA'
  | 'DOCUMENT_REVIEW'
  | 'CONSULTATION'
  | 'CONTRACT_DRAFTING'
  | 'ENTITY_FORMATION'
  | 'TRADEMARK'
  | 'LITIGATION'

// Price model types
export type PriceModel = 'FLAT' | 'PER_PAGE' | 'PER_HOUR' | 'COMPLEXITY_BASED'

// Provider request status
export type ProviderRequestStatus =
  | 'PENDING'
  | 'SENT_TO_PROVIDER'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

// Settlement status
export type SettlementStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED'

// Provider profile
export interface Provider {
  id: string
  externalId: string
  name: string
  legalName: string
  email: string
  description?: string
  webhookUrl?: string
  status: ProviderStatus
  jurisdictions: string[]
  specialties: MatterType[]
  serviceTypes: ProviderServiceType[]
  maxConcurrent: number
  avgResponseMins?: number
  qualityScore: number
  revenueSharePct: number
  totpEnabled: boolean
  createdAt: string
  updatedAt: string
}

// Provider service configuration
export interface ProviderService {
  id: string
  providerId: string
  serviceType: ProviderServiceType
  enabled: boolean
  basePrice: number
  priceModel: PriceModel
  pricePerUnit?: number
  maxConcurrent: number
  currentLoad: number
  targetResponseMins: number
  createdAt: string
  updatedAt: string
}

// Provider request (work queue item)
export interface ProviderRequest {
  id: string
  providerId: string
  externalId: string
  matterId?: string
  consultationId?: string
  serviceType: ProviderServiceType
  status: ProviderRequestStatus
  requestPayload: Record<string, unknown>
  responsePayload?: Record<string, unknown>
  responseAt?: string
  routingReason?: string
  creditsCharged: number
  providerEarnings: number
  slaDeadline?: string
  slaMet?: boolean
  createdAt: string
  updatedAt: string
}

// Earnings summary
export interface EarningsSummary {
  period: 'day' | 'week' | 'month' | 'year'
  periodStart: string
  periodEnd: string
  periodAmount: number
  periodRequests: number
  pendingPayout: number
  totalPaid: number
  avgPerRequest: number
}

// Provider settlement
export interface ProviderSettlement {
  id: string
  providerId: string
  periodStart: string
  periodEnd: string
  totalRequests: number
  totalCredits: number
  providerShare: number
  platformShare: number
  status: SettlementStatus
  stripeTransferId?: string
  paidAt?: string
  createdAt: string
}

// Provider stats
export interface ProviderStats {
  totalRequests: number
  completedRequests: number
  pendingRequests: number
  inProgressRequests: number
  completionRate: number
  avgResponseMins: number
  qualityScore: number
  slaMetRate: number
  totalEarnings: number
  pendingPayout: number
}

// Pending request counts
export interface PendingRequestCounts {
  total: number
  urgent: number // SLA < 1 hour
  byServiceType: Record<ProviderServiceType, number>
}

// API request/response types
export interface ProviderLoginInput {
  email: string
  password: string
  totpCode?: string
}

export interface ProviderLoginResponse {
  token: string
  provider: Provider
  requiresTwoFactor?: boolean
}

export interface ProviderRegisterInput {
  name: string
  legalName: string
  email: string
  password: string
  description?: string
  jurisdictions: string[]
  specialties: MatterType[]
}

export interface ProviderRegisterResponse {
  provider: Provider
}

export interface ProviderProfileUpdateInput {
  name?: string
  legalName?: string
  description?: string
  webhookUrl?: string
  jurisdictions?: string[]
  specialties?: MatterType[]
}

export interface ProviderServiceInput {
  serviceType: ProviderServiceType
  enabled?: boolean
  basePrice: number
  priceModel: PriceModel
  pricePerUnit?: number
  maxConcurrent?: number
  targetResponseMins: number
}

export interface ProviderServiceUpdateInput {
  enabled?: boolean
  basePrice?: number
  priceModel?: PriceModel
  pricePerUnit?: number
  maxConcurrent?: number
  targetResponseMins?: number
}

export interface ProviderRequestResponseInput {
  response: Record<string, unknown>
}

export interface ProviderRequestEscalationInput {
  reason: string
  notes?: string
}

export interface ProviderChangePasswordInput {
  currentPassword: string
  newPassword: string
}

// List request filters
export interface ProviderRequestFilters {
  status?: ProviderRequestStatus
  serviceType?: ProviderServiceType
  limit?: number
  offset?: number
}

export interface SettlementFilters {
  status?: SettlementStatus
  limit?: number
  offset?: number
}

// API response wrappers
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

// Service type display info
export const SERVICE_TYPE_LABELS: Record<ProviderServiceType, string> = {
  LEGAL_QA: 'Legal Q&A',
  DOCUMENT_REVIEW: 'Document Review',
  CONSULTATION: 'Consultation',
  CONTRACT_DRAFTING: 'Contract Drafting',
  ENTITY_FORMATION: 'Entity Formation',
  TRADEMARK: 'Trademark',
  LITIGATION: 'Litigation',
}

export const PRICE_MODEL_LABELS: Record<PriceModel, string> = {
  FLAT: 'Flat Fee',
  PER_PAGE: 'Per Page',
  PER_HOUR: 'Per Hour',
  COMPLEXITY_BASED: 'Complexity Based',
}

export const PROVIDER_STATUS_LABELS: Record<ProviderStatus, string> = {
  PENDING_APPROVAL: 'Pending Approval',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  INACTIVE: 'Inactive',
}

export const REQUEST_STATUS_LABELS: Record<ProviderRequestStatus, string> = {
  PENDING: 'Pending',
  SENT_TO_PROVIDER: 'Sent',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
}

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  PAID: 'Paid',
  FAILED: 'Failed',
}
