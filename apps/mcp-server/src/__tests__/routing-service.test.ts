import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
vi.mock('@botesq/database', async () => {
  const actual = await vi.importActual('@botesq/database')
  return {
    ...actual,
    prisma: {
      provider: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      providerRequest: {
        create: vi.fn(),
        update: vi.fn(),
      },
    },
    Prisma: {
      JsonNull: null,
    },
  }
})

// Mock internal provider
vi.mock('../providers/internal-provider', () => ({
  internalProvider: {
    id: 'internal',
    name: 'BotEsq AI',
    isInternal: true,
    getCapabilities: vi.fn().mockResolvedValue({
      serviceTypes: ['LEGAL_QA', 'DOCUMENT_REVIEW', 'CONSULTATION'],
      jurisdictions: ['US'],
      specialties: [],
      maxConcurrentRequests: 100,
      averageResponseMinutes: 1,
      supportsUrgent: true,
      supportsAsync: false,
    }),
    checkHealth: vi.fn().mockResolvedValue({
      healthy: true,
      currentLoad: 0,
      maxCapacity: 100,
      averageResponseMs: 500,
      errorRate: 0,
      lastChecked: new Date(),
    }),
    processRequest: vi.fn().mockResolvedValue({
      requestId: 'req_123',
      status: 'COMPLETED',
      content: { answer: 'Test answer' },
    }),
  },
}))

// Mock external adapter
vi.mock('../providers/external-adapter', () => ({
  ExternalProviderAdapter: vi.fn().mockImplementation((provider) => ({
    id: provider.id,
    name: provider.name,
    isInternal: false,
    getCapabilities: vi.fn().mockResolvedValue({
      serviceTypes: ['LEGAL_QA'],
      jurisdictions: ['US'],
      specialties: [],
      maxConcurrentRequests: 10,
      averageResponseMinutes: 15,
      supportsUrgent: true,
      supportsAsync: true,
    }),
    checkHealth: vi.fn().mockResolvedValue({
      healthy: true,
      currentLoad: 2,
      maxCapacity: 10,
      averageResponseMs: 5000,
      errorRate: 0.01,
      lastChecked: new Date(),
    }),
    processRequest: vi.fn().mockResolvedValue({
      requestId: 'req_123',
      status: 'COMPLETED',
      content: { answer: 'External answer' },
    }),
  })),
}))

import { prisma } from '@botesq/database'
import { internalProvider } from '../providers/internal-provider'
import { routingService } from '../providers/routing-service'
import type { ProviderServiceRequest } from '../providers/types'

describe('routing-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routingService.clearCache()

    // Re-setup internal provider mocks after clearAllMocks
    vi.mocked(internalProvider.getCapabilities).mockResolvedValue({
      serviceTypes: ['LEGAL_QA', 'DOCUMENT_REVIEW', 'CONSULTATION'] as never,
      jurisdictions: ['US'],
      specialties: [] as never,
      maxConcurrentRequests: 100,
      averageResponseMinutes: 1,
      supportsUrgent: true,
      supportsAsync: false,
    })
    vi.mocked(internalProvider.checkHealth).mockResolvedValue({
      healthy: true,
      currentLoad: 0,
      maxCapacity: 100,
      averageResponseMs: 500,
      errorRate: 0,
      lastChecked: new Date(),
    })
    vi.mocked(internalProvider.processRequest).mockResolvedValue({
      requestId: 'req_123',
      status: 'COMPLETED',
      content: { answer: 'Test answer' },
    })
  })

  const makeRequest = (
    overrides: Partial<ProviderServiceRequest> = {}
  ): ProviderServiceRequest => ({
    requestId: 'req_123',
    serviceType: 'LEGAL_QA' as never,
    operatorId: 'op_123',
    content: {
      question: 'Is this enforceable?',
    },
    ...overrides,
  })

  describe('routeRequest', () => {
    it('should route to internal provider when no external available', async () => {
      vi.mocked(prisma.provider.findMany).mockResolvedValue([])

      const { provider, decision } = await routingService.routeRequest(makeRequest())

      expect(provider.id).toBe('internal')
      expect(decision.reason).toContain('Internal AI')
    })

    it('should throw when no providers available for service type', async () => {
      vi.mocked(prisma.provider.findMany).mockResolvedValue([])
      vi.mocked(internalProvider.getCapabilities).mockResolvedValue({
        serviceTypes: [] as never,
        jurisdictions: [],
        specialties: [],
        maxConcurrentRequests: 100,
        averageResponseMinutes: 1,
        supportsUrgent: true,
        supportsAsync: false,
      })

      await expect(
        routingService.routeRequest(makeRequest({ serviceType: 'LITIGATION' as never }))
      ).rejects.toThrow('No providers available')
    })

    it('should exclude providers from excludedProviders preference', async () => {
      vi.mocked(prisma.provider.findMany).mockResolvedValue([
        {
          id: 'prov_ext',
          name: 'External',
          status: 'ACTIVE',
          webhookUrl: 'https://ext.com',
          webhookSecret: 'secret',
          jurisdictions: [],
          specialties: [],
          maxConcurrent: 10,
          avgResponseMins: 15,
          services: [{ serviceType: 'LEGAL_QA', enabled: true }],
          operatorPrefs: [],
        },
      ] as never)

      const { provider } = await routingService.routeRequest(makeRequest(), {
        excludedProviders: ['prov_ext'],
      })

      // Should fall back to internal since external is excluded
      expect(provider.id).toBe('internal')
    })

    it('should prefer internal when preferInternal is true', async () => {
      vi.mocked(prisma.provider.findMany).mockResolvedValue([
        {
          id: 'prov_ext',
          name: 'External',
          status: 'ACTIVE',
          webhookUrl: 'https://ext.com',
          webhookSecret: 'secret',
          jurisdictions: [],
          specialties: [],
          maxConcurrent: 10,
          avgResponseMins: 15,
          services: [{ serviceType: 'LEGAL_QA', enabled: true }],
          operatorPrefs: [],
        },
      ] as never)

      const { provider } = await routingService.routeRequest(makeRequest(), {
        preferInternal: true,
      })

      expect(provider.id).toBe('internal')
    })
  })

  describe('executeRequest', () => {
    it('should route and execute request', async () => {
      vi.mocked(prisma.provider.findMany).mockResolvedValue([])

      const { response, decision } = await routingService.executeRequest(makeRequest())

      expect(response.status).toBe('COMPLETED')
      expect(decision.providerId).toBe('internal')
    })

    it('should NOT create DB record for internal provider', async () => {
      vi.mocked(prisma.provider.findMany).mockResolvedValue([])

      await routingService.executeRequest(makeRequest())

      expect(prisma.providerRequest.create).not.toHaveBeenCalled()
    })
  })

  describe('cache', () => {
    it('should clear cache', () => {
      // Simply verify clearCache doesn't throw
      routingService.clearCache()
    })
  })
})
