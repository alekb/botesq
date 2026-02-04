import { prisma, Prisma } from '@botesq/database'
import type { ProviderServiceType } from '@botesq/database'
import type {
  LegalServiceProvider,
  ProviderServiceRequest,
  ProviderServiceResponse,
  RoutingDecision,
  RoutingPreferences,
} from './types'
import { internalProvider } from './internal-provider'
import { ExternalProviderAdapter } from './external-adapter'
import { logger } from '../lib/logger'

/**
 * Service for routing requests to appropriate providers
 */
class ProviderRoutingService {
  private providerCache = new Map<string, LegalServiceProvider>()
  private cacheExpiry = new Map<string, number>()
  private readonly CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

  /**
   * Route a request to the best available provider
   */
  async routeRequest(
    request: ProviderServiceRequest,
    preferences?: RoutingPreferences
  ): Promise<{ provider: LegalServiceProvider; decision: RoutingDecision }> {
    // Get available providers for this service type
    const candidates = await this.getAvailableProviders(request.serviceType, request.operatorId)

    // Apply routing preferences
    const filteredCandidates = this.applyPreferences(candidates, preferences)

    if (filteredCandidates.length === 0) {
      // Fall back to internal provider if no external providers available
      const internalCapabilities = await internalProvider.getCapabilities()
      if (internalCapabilities.serviceTypes.includes(request.serviceType)) {
        return {
          provider: internalProvider,
          decision: {
            providerId: internalProvider.id,
            providerName: internalProvider.name,
            reason: 'No external providers available, using internal AI',
            estimatedResponseMinutes: internalCapabilities.averageResponseMinutes,
            estimatedCredits: this.estimateCredits(request),
            isAsync: false,
          },
        }
      }

      throw new Error(`No providers available for service type: ${request.serviceType}`)
    }

    // Score and rank providers
    const scoredProviders = await this.scoreProviders(filteredCandidates, request, preferences)

    // Select the best provider
    const bestMatch = scoredProviders[0]

    if (!bestMatch) {
      throw new Error(`No suitable providers found for service type: ${request.serviceType}`)
    }

    return {
      provider: bestMatch.provider,
      decision: {
        providerId: bestMatch.provider.id,
        providerName: bestMatch.provider.name,
        reason: bestMatch.reason,
        estimatedResponseMinutes: bestMatch.estimatedMinutes,
        estimatedCredits: bestMatch.estimatedCredits,
        isAsync: bestMatch.isAsync,
      },
    }
  }

  /**
   * Execute a request through the routed provider
   */
  async executeRequest(
    request: ProviderServiceRequest,
    preferences?: RoutingPreferences
  ): Promise<{ response: ProviderServiceResponse; decision: RoutingDecision }> {
    const { provider, decision } = await this.routeRequest(request, preferences)

    logger.info(
      {
        requestId: request.requestId,
        providerId: provider.id,
        providerName: provider.name,
        reason: decision.reason,
      },
      'Routing request to provider'
    )

    // Create provider request record
    if (!provider.isInternal) {
      await this.createProviderRequestRecord(request, provider.id, decision)
    }

    // Execute the request
    const response = await provider.processRequest(request)

    // Update provider request record with response
    if (!provider.isInternal) {
      await this.updateProviderRequestRecord(request.requestId, response)
    }

    return { response, decision }
  }

  /**
   * Get all available providers for a service type
   */
  private async getAvailableProviders(
    serviceType: ProviderServiceType,
    operatorId: string
  ): Promise<LegalServiceProvider[]> {
    const providers: LegalServiceProvider[] = []

    // Check if internal provider supports this service type
    const internalCapabilities = await internalProvider.getCapabilities()
    if (internalCapabilities.serviceTypes.includes(serviceType)) {
      providers.push(internalProvider)
    }

    // Get external providers
    const externalProviders = await prisma.provider.findMany({
      where: {
        status: 'ACTIVE',
        services: {
          some: {
            serviceType,
            enabled: true,
          },
        },
      },
      include: {
        services: true,
        operatorPrefs: {
          where: { operatorId },
        },
      },
    })

    for (const ep of externalProviders) {
      // Check operator preferences
      const pref = ep.operatorPrefs[0]
      if (pref && !pref.enabled) {
        continue // Operator has disabled this provider
      }

      // Get or create adapter
      const adapter = await this.getOrCreateAdapter(ep, ep.services)
      providers.push(adapter)
    }

    return providers
  }

  /**
   * Apply routing preferences to filter providers
   */
  private applyPreferences(
    providers: LegalServiceProvider[],
    preferences?: RoutingPreferences
  ): LegalServiceProvider[] {
    if (!preferences) {
      return providers
    }

    let filtered = [...providers]

    // Filter out excluded providers
    if (preferences.excludedProviders?.length) {
      filtered = filtered.filter((p) => !preferences.excludedProviders!.includes(p.id))
    }

    // If preferInternal is true and internal is available, only use internal
    if (preferences.preferInternal) {
      const internal = filtered.find((p) => p.isInternal)
      if (internal) {
        return [internal]
      }
    }

    // Move preferred providers to the front
    if (preferences.preferredProviders?.length) {
      filtered.sort((a, b) => {
        const aPreferred = preferences.preferredProviders!.includes(a.id) ? 0 : 1
        const bPreferred = preferences.preferredProviders!.includes(b.id) ? 0 : 1
        return aPreferred - bPreferred
      })
    }

    return filtered
  }

  /**
   * Score providers based on various factors
   */
  private async scoreProviders(
    providers: LegalServiceProvider[],
    request: ProviderServiceRequest,
    preferences?: RoutingPreferences
  ): Promise<ScoredProvider[]> {
    const scored: ScoredProvider[] = []

    for (const provider of providers) {
      const [capabilities, health] = await Promise.all([
        provider.getCapabilities(),
        provider.checkHealth(),
      ])

      // Skip unhealthy providers
      if (!health.healthy) {
        continue
      }

      // Calculate score (higher is better)
      let score = 100

      // Response time score (faster is better)
      const responseScore = Math.max(0, 100 - capabilities.averageResponseMinutes * 2)
      score += responseScore

      // Capacity score (more capacity is better)
      const capacityUtilization = health.currentLoad / health.maxCapacity
      score += (1 - capacityUtilization) * 50

      // Error rate penalty
      score -= health.errorRate * 100

      // Internal provider bonus (more reliable)
      if (provider.isInternal) {
        score += 20
      }

      // Check if meets SLA requirements
      if (preferences?.maxResponseMinutes) {
        if (capabilities.averageResponseMinutes > preferences.maxResponseMinutes) {
          continue // Skip providers that can't meet SLA
        }
      }

      const estimatedCredits = this.estimateCredits(request)
      if (preferences?.maxCredits && estimatedCredits > preferences.maxCredits) {
        continue // Skip providers that exceed budget
      }

      scored.push({
        provider,
        score,
        reason: this.generateRoutingReason(provider, capabilities, health),
        estimatedMinutes: capabilities.averageResponseMinutes,
        estimatedCredits,
        isAsync: capabilities.supportsAsync && !provider.isInternal,
      })
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score)

    return scored
  }

  private generateRoutingReason(
    provider: LegalServiceProvider,
    capabilities: Awaited<ReturnType<LegalServiceProvider['getCapabilities']>>,
    health: Awaited<ReturnType<LegalServiceProvider['checkHealth']>>
  ): string {
    if (provider.isInternal) {
      return 'Internal AI provider - fastest response time'
    }

    const reasons: string[] = []

    if (capabilities.averageResponseMinutes < 10) {
      reasons.push('fast response')
    }

    if (health.currentLoad / health.maxCapacity < 0.5) {
      reasons.push('low load')
    }

    if (health.errorRate < 0.01) {
      reasons.push('high reliability')
    }

    return reasons.length > 0
      ? `External provider: ${reasons.join(', ')}`
      : 'External provider selected based on availability'
  }

  private estimateCredits(request: ProviderServiceRequest): number {
    const baseCredits: Record<ProviderServiceType, number> = {
      LEGAL_QA: 2500,
      DOCUMENT_REVIEW: 5000,
      CONSULTATION: 7500,
      CONTRACT_DRAFTING: 10000,
      ENTITY_FORMATION: 15000,
      TRADEMARK: 20000,
      LITIGATION: 25000,
    }

    let credits = baseCredits[request.serviceType] || 5000

    if (request.content.urgency === 'URGENT') {
      credits = Math.floor(credits * 1.5)
    }

    if (request.content.pageCount) {
      credits += request.content.pageCount * 100
    }

    return credits
  }

  private async getOrCreateAdapter(
    provider: Awaited<ReturnType<typeof prisma.provider.findFirst>>,
    services: Awaited<ReturnType<typeof prisma.providerService.findMany>>
  ): Promise<LegalServiceProvider> {
    if (!provider) {
      throw new Error('Provider not found')
    }

    const cacheKey = provider.id
    const now = Date.now()

    // Check cache
    if (this.providerCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0
      if (now < expiry) {
        return this.providerCache.get(cacheKey)!
      }
    }

    // Create new adapter
    const adapter = new ExternalProviderAdapter(provider, services)

    // Cache it
    this.providerCache.set(cacheKey, adapter)
    this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL_MS)

    return adapter
  }

  private async createProviderRequestRecord(
    request: ProviderServiceRequest,
    providerId: string,
    decision: RoutingDecision
  ): Promise<void> {
    await prisma.providerRequest.create({
      data: {
        providerId,
        matterId: request.matterId,
        consultationId: request.consultationId,
        externalId: request.requestId,
        serviceType: request.serviceType,
        status: 'PENDING',
        requestPayload: request.content as Prisma.InputJsonValue,
        routingReason: decision.reason,
        slaDeadline: request.slaDeadline,
      },
    })
  }

  private async updateProviderRequestRecord(
    requestId: string,
    response: ProviderServiceResponse
  ): Promise<void> {
    const statusMap: Record<string, 'COMPLETED' | 'FAILED'> = {
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
      REQUIRES_ESCALATION: 'COMPLETED',
    }

    await prisma.providerRequest.update({
      where: { externalId: requestId },
      data: {
        status: statusMap[response.status] || 'FAILED',
        responsePayload: (response.content as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        responseAt: new Date(),
        creditsCharged: response.creditsUsed || 0,
      },
    })
  }

  /**
   * Clear the provider cache
   */
  clearCache(): void {
    this.providerCache.clear()
    this.cacheExpiry.clear()
  }
}

interface ScoredProvider {
  provider: LegalServiceProvider
  score: number
  reason: string
  estimatedMinutes: number
  estimatedCredits: number
  isAsync: boolean
}

export const routingService = new ProviderRoutingService()
