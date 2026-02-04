import type { ProviderServiceType, MatterType } from '@botesq/database'

/**
 * Request payload sent to a provider
 */
export interface ProviderServiceRequest {
  requestId: string
  serviceType: ProviderServiceType
  operatorId: string
  matterId?: string
  consultationId?: string

  // Request details
  content: {
    question?: string
    documentUrl?: string
    documentType?: string
    pageCount?: number
    context?: string
    jurisdiction?: string
    matterType?: MatterType
    urgency?: 'STANDARD' | 'URGENT'
  }

  // SLA requirements
  slaDeadline?: Date

  // Callback URL for async responses
  callbackUrl?: string
}

/**
 * Response from a provider
 */
export interface ProviderServiceResponse {
  requestId: string
  status: 'COMPLETED' | 'FAILED' | 'REQUIRES_ESCALATION'

  // Response content
  content?: {
    answer?: string
    analysis?: string
    summary?: string
    recommendations?: string[]
    citations?: string[]
    confidence?: number
    complexity?: 'SIMPLE' | 'MODERATE' | 'COMPLEX'
  }

  // Error information if failed
  error?: {
    code: string
    message: string
  }

  // Escalation info if needed
  escalation?: {
    reason: string
    suggestedAction: string
  }

  // Billing info
  creditsUsed?: number
  processingTimeMs?: number
}

/**
 * Provider capability information
 */
export interface ProviderCapabilities {
  serviceTypes: ProviderServiceType[]
  jurisdictions: string[]
  specialties: MatterType[]
  maxConcurrentRequests: number
  averageResponseMinutes: number
  supportsUrgent: boolean
  supportsAsync: boolean
}

/**
 * Provider health status
 */
export interface ProviderHealthStatus {
  healthy: boolean
  currentLoad: number
  maxCapacity: number
  averageResponseMs: number
  errorRate: number
  lastChecked: Date
}

/**
 * Interface that all legal service providers must implement
 */
export interface LegalServiceProvider {
  /**
   * Unique identifier for this provider
   */
  readonly id: string

  /**
   * Human-readable name
   */
  readonly name: string

  /**
   * Whether this is the internal BotEsq provider
   */
  readonly isInternal: boolean

  /**
   * Get provider capabilities
   */
  getCapabilities(): Promise<ProviderCapabilities>

  /**
   * Check provider health/availability
   */
  checkHealth(): Promise<ProviderHealthStatus>

  /**
   * Process a service request synchronously
   * Returns the response directly
   */
  processRequest(request: ProviderServiceRequest): Promise<ProviderServiceResponse>

  /**
   * Submit a request for async processing
   * Provider will call the callback URL when complete
   */
  submitAsync?(
    request: ProviderServiceRequest
  ): Promise<{ accepted: boolean; estimatedMinutes?: number }>

  /**
   * Cancel a pending async request
   */
  cancelRequest?(requestId: string): Promise<boolean>
}

/**
 * Provider routing decision
 */
export interface RoutingDecision {
  providerId: string
  providerName: string
  reason: string
  estimatedResponseMinutes: number
  estimatedCredits: number
  isAsync: boolean
}

/**
 * Routing preferences from operator
 */
export interface RoutingPreferences {
  preferredProviders?: string[]
  excludedProviders?: string[]
  preferInternal?: boolean
  maxResponseMinutes?: number
  maxCredits?: number
}
