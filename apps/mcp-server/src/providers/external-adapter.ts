import type { Provider, ProviderService } from '@botesq/database'
import type {
  LegalServiceProvider,
  ProviderCapabilities,
  ProviderHealthStatus,
  ProviderServiceRequest,
  ProviderServiceResponse,
} from './types'
import { generateWebhookSignature } from '../utils/webhook'
import { logger } from '../lib/logger'
// Base URL for provider callbacks
const CALLBACK_BASE_URL = process.env.CALLBACK_BASE_URL || 'https://api.botesq.io'

/**
 * Adapter for external third-party providers
 * Handles webhook communication with external provider systems
 */
export class ExternalProviderAdapter implements LegalServiceProvider {
  readonly id: string
  readonly name: string
  readonly isInternal = false

  private readonly provider: Provider
  private readonly services: ProviderService[]
  private lastHealthCheck?: ProviderHealthStatus

  constructor(provider: Provider, services: ProviderService[]) {
    this.id = provider.id
    this.name = provider.name
    this.provider = provider
    this.services = services
  }

  async getCapabilities(): Promise<ProviderCapabilities> {
    const enabledServices = this.services.filter((s) => s.enabled)

    return {
      serviceTypes: enabledServices.map((s) => s.serviceType),
      jurisdictions: this.provider.jurisdictions,
      specialties: this.provider.specialties,
      maxConcurrentRequests: this.provider.maxConcurrent,
      averageResponseMinutes: this.provider.avgResponseMins || 30,
      supportsUrgent: true,
      supportsAsync: !!this.provider.webhookUrl,
    }
  }

  async checkHealth(): Promise<ProviderHealthStatus> {
    // If provider has a webhook URL, we can ping it for health
    if (this.provider.webhookUrl) {
      try {
        const healthUrl = new URL('/health', this.provider.webhookUrl).toString()
        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: { 'User-Agent': 'BotEsq/1.0' },
          signal: AbortSignal.timeout(5000),
        })

        if (response.ok) {
          const data = (await response.json()) as { load?: number; capacity?: number }
          this.lastHealthCheck = {
            healthy: true,
            currentLoad: data.load || 0,
            maxCapacity: data.capacity || this.provider.maxConcurrent,
            averageResponseMs: (this.provider.avgResponseMins || 30) * 60 * 1000,
            errorRate: 0,
            lastChecked: new Date(),
          }
          return this.lastHealthCheck
        }
      } catch (error) {
        logger.warn({ providerId: this.id, error }, 'Provider health check failed')
      }
    }

    // Return cached or default health status
    return (
      this.lastHealthCheck || {
        healthy: this.provider.status === 'ACTIVE',
        currentLoad: this.getCurrentLoad(),
        maxCapacity: this.provider.maxConcurrent,
        averageResponseMs: (this.provider.avgResponseMins || 30) * 60 * 1000,
        errorRate: 0,
        lastChecked: new Date(),
      }
    )
  }

  async processRequest(request: ProviderServiceRequest): Promise<ProviderServiceResponse> {
    if (!this.provider.webhookUrl) {
      return {
        requestId: request.requestId,
        status: 'FAILED',
        error: {
          code: 'NO_WEBHOOK',
          message: 'Provider has no webhook URL configured',
        },
      }
    }

    const startTime = Date.now()

    try {
      // Build the request payload
      const payload = this.buildRequestPayload(request)

      // Generate signature for the webhook
      const timestamp = Math.floor(Date.now() / 1000)
      const signature = generateWebhookSignature(
        JSON.stringify(payload),
        this.provider.webhookSecret || '',
        timestamp
      )

      // Send request to provider
      const response = await fetch(this.provider.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BotEsq-Signature': signature,
          'X-BotEsq-Timestamp': timestamp.toString(),
          'X-BotEsq-Request-Id': request.requestId,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30 second timeout for sync requests
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error(
          {
            providerId: this.id,
            requestId: request.requestId,
            status: response.status,
            error: errorText,
          },
          'Provider request failed'
        )

        return {
          requestId: request.requestId,
          status: 'FAILED',
          error: {
            code: 'PROVIDER_ERROR',
            message: `Provider returned ${response.status}: ${errorText}`,
          },
          processingTimeMs: Date.now() - startTime,
        }
      }

      const providerResponse = (await response.json()) as ExternalProviderResponse
      return this.parseProviderResponse(request.requestId, providerResponse, Date.now() - startTime)
    } catch (error) {
      logger.error(
        { providerId: this.id, requestId: request.requestId, error },
        'Provider request error'
      )

      return {
        requestId: request.requestId,
        status: 'FAILED',
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        },
        processingTimeMs: Date.now() - startTime,
      }
    }
  }

  async submitAsync(
    request: ProviderServiceRequest
  ): Promise<{ accepted: boolean; estimatedMinutes?: number }> {
    if (!this.provider.webhookUrl) {
      return { accepted: false }
    }

    try {
      const payload = this.buildRequestPayload(request)
      payload.async = true
      payload.callbackUrl = request.callbackUrl || `${CALLBACK_BASE_URL}/api/provider/callback`

      const timestamp = Math.floor(Date.now() / 1000)
      const signature = generateWebhookSignature(
        JSON.stringify(payload),
        this.provider.webhookSecret || '',
        timestamp
      )

      const response = await fetch(this.provider.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BotEsq-Signature': signature,
          'X-BotEsq-Timestamp': timestamp.toString(),
          'X-BotEsq-Request-Id': request.requestId,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const data = (await response.json()) as { accepted: boolean; estimatedMinutes?: number }
        return {
          accepted: data.accepted ?? true,
          estimatedMinutes: data.estimatedMinutes || this.provider.avgResponseMins || 30,
        }
      }

      return { accepted: false }
    } catch (error) {
      logger.error(
        { providerId: this.id, requestId: request.requestId, error },
        'Async submit failed'
      )
      return { accepted: false }
    }
  }

  async cancelRequest(requestId: string): Promise<boolean> {
    if (!this.provider.webhookUrl) {
      return false
    }

    try {
      const cancelUrl = new URL('/cancel', this.provider.webhookUrl).toString()
      const payload = { requestId }

      const timestamp = Math.floor(Date.now() / 1000)
      const signature = generateWebhookSignature(
        JSON.stringify(payload),
        this.provider.webhookSecret || '',
        timestamp
      )

      const response = await fetch(cancelUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BotEsq-Signature': signature,
          'X-BotEsq-Timestamp': timestamp.toString(),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      })

      return response.ok
    } catch {
      return false
    }
  }

  private buildRequestPayload(request: ProviderServiceRequest): ExternalRequestPayload {
    return {
      requestId: request.requestId,
      serviceType: request.serviceType,
      content: request.content,
      slaDeadline: request.slaDeadline?.toISOString(),
      async: false,
    }
  }

  private parseProviderResponse(
    requestId: string,
    response: ExternalProviderResponse,
    processingTimeMs: number
  ): ProviderServiceResponse {
    return {
      requestId,
      status: response.status || 'COMPLETED',
      content: response.content,
      error: response.error,
      escalation: response.escalation,
      creditsUsed: response.creditsUsed,
      processingTimeMs,
    }
  }

  private getCurrentLoad(): number {
    return this.services.reduce((sum, s) => sum + s.currentLoad, 0)
  }
}

interface ExternalRequestPayload {
  requestId: string
  serviceType: string
  content: ProviderServiceRequest['content']
  slaDeadline?: string
  async: boolean
  callbackUrl?: string
}

interface ExternalProviderResponse {
  status?: 'COMPLETED' | 'FAILED' | 'REQUIRES_ESCALATION'
  content?: ProviderServiceResponse['content']
  error?: ProviderServiceResponse['error']
  escalation?: ProviderServiceResponse['escalation']
  creditsUsed?: number
}
