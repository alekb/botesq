import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock webhook utils
vi.mock('../utils/webhook', () => ({
  generateWebhookSignature: vi.fn().mockReturnValue('t=123,v1=abc123'),
}))

import { ExternalProviderAdapter } from '../providers/external-adapter'
import type { ProviderServiceRequest } from '../providers/types'

describe('ExternalProviderAdapter', () => {
  let adapter: ExternalProviderAdapter

  const mockProvider = {
    id: 'prov_123',
    name: 'External Provider',
    status: 'ACTIVE',
    webhookUrl: 'https://provider.example.com/api',
    webhookSecret: 'whsec_test',
    jurisdictions: ['US', 'US-CA'],
    specialties: ['CONTRACT_REVIEW'],
    maxConcurrent: 10,
    avgResponseMins: 15,
  } as never

  const mockServices = [
    {
      serviceType: 'LEGAL_QA',
      enabled: true,
      currentLoad: 2,
    },
    {
      serviceType: 'DOCUMENT_REVIEW',
      enabled: false,
      currentLoad: 0,
    },
    {
      serviceType: 'CONSULTATION',
      enabled: true,
      currentLoad: 1,
    },
  ] as never

  beforeEach(() => {
    vi.clearAllMocks()
    adapter = new ExternalProviderAdapter(mockProvider, mockServices)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
        text: vi.fn().mockResolvedValue(''),
      })
    )
  })

  describe('properties', () => {
    it('should use provider id', () => {
      expect(adapter.id).toBe('prov_123')
    })

    it('should use provider name', () => {
      expect(adapter.name).toBe('External Provider')
    })

    it('should not be internal', () => {
      expect(adapter.isInternal).toBe(false)
    })
  })

  describe('getCapabilities', () => {
    it('should return only enabled service types', async () => {
      const capabilities = await adapter.getCapabilities()

      expect(capabilities.serviceTypes).toContain('LEGAL_QA')
      expect(capabilities.serviceTypes).toContain('CONSULTATION')
      expect(capabilities.serviceTypes).not.toContain('DOCUMENT_REVIEW')
    })

    it('should support async when webhook URL exists', async () => {
      const capabilities = await adapter.getCapabilities()

      expect(capabilities.supportsAsync).toBe(true)
    })

    it('should not support async without webhook URL', async () => {
      const noWebhookAdapter = new ExternalProviderAdapter(
        { ...mockProvider, webhookUrl: null } as never,
        mockServices
      )

      const capabilities = await noWebhookAdapter.getCapabilities()

      expect(capabilities.supportsAsync).toBe(false)
    })
  })

  describe('checkHealth', () => {
    it('should ping health endpoint when webhook URL exists', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ load: 5, capacity: 20 }),
      } as never)

      const health = await adapter.checkHealth()

      expect(health.healthy).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        'https://provider.example.com/health',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should handle health check timeout gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('timeout'))

      const health = await adapter.checkHealth()

      // Falls back to default health based on status
      expect(health.healthy).toBe(true) // ACTIVE status
    })

    it('should return default health when no webhook URL', async () => {
      const noWebhookAdapter = new ExternalProviderAdapter(
        { ...mockProvider, webhookUrl: null } as never,
        mockServices
      )

      const health = await noWebhookAdapter.checkHealth()

      expect(health.healthy).toBe(true)
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('processRequest', () => {
    const makeRequest = (): ProviderServiceRequest => ({
      requestId: 'req_123',
      serviceType: 'LEGAL_QA' as never,
      operatorId: 'op_123',
      content: {
        question: 'Is this enforceable?',
      },
    })

    it('should return FAILED when no webhook URL', async () => {
      const noWebhookAdapter = new ExternalProviderAdapter(
        { ...mockProvider, webhookUrl: null } as never,
        mockServices
      )

      const result = await noWebhookAdapter.processRequest(makeRequest())

      expect(result.status).toBe('FAILED')
      expect(result.error?.code).toBe('NO_WEBHOOK')
    })

    it('should send request to provider webhook', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          status: 'COMPLETED',
          content: { answer: 'Yes, enforceable.' },
          creditsUsed: 2500,
        }),
      } as never)

      const result = await adapter.processRequest(makeRequest())

      expect(result.status).toBe('COMPLETED')
      expect(result.content?.answer).toBe('Yes, enforceable.')
      expect(fetch).toHaveBeenCalledWith(
        'https://provider.example.com/api',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-BotEsq-Signature': expect.any(String),
            'X-BotEsq-Request-Id': 'req_123',
          }),
        })
      )
    })

    it('should return FAILED on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Internal Server Error'),
      } as never)

      const result = await adapter.processRequest(makeRequest())

      expect(result.status).toBe('FAILED')
      expect(result.error?.code).toBe('PROVIDER_ERROR')
      expect(result.processingTimeMs).toBeDefined()
    })

    it('should return FAILED on network error', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Connection refused'))

      const result = await adapter.processRequest(makeRequest())

      expect(result.status).toBe('FAILED')
      expect(result.error?.code).toBe('NETWORK_ERROR')
      expect(result.error?.message).toContain('Connection refused')
    })

    it('should include processing time in response', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ status: 'COMPLETED' }),
      } as never)

      const result = await adapter.processRequest(makeRequest())

      expect(result.processingTimeMs).toBeDefined()
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0)
    })
  })

  describe('submitAsync', () => {
    const makeRequest = (): ProviderServiceRequest => ({
      requestId: 'req_123',
      serviceType: 'LEGAL_QA' as never,
      operatorId: 'op_123',
      content: { question: 'Test?' },
    })

    it('should return not accepted when no webhook URL', async () => {
      const noWebhookAdapter = new ExternalProviderAdapter(
        { ...mockProvider, webhookUrl: null } as never,
        mockServices
      )

      const result = await noWebhookAdapter.submitAsync(makeRequest())

      expect(result.accepted).toBe(false)
    })

    it('should submit with async flag and callback URL', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ accepted: true, estimatedMinutes: 20 }),
      } as never)

      const result = await adapter.submitAsync(makeRequest())

      expect(result.accepted).toBe(true)
      expect(result.estimatedMinutes).toBe(20)

      const body = JSON.parse(vi.mocked(fetch).mock.calls[0]?.[1]?.body as string)
      expect(body.async).toBe(true)
      expect(body.callbackUrl).toBeDefined()
    })
  })

  describe('cancelRequest', () => {
    it('should return false when no webhook URL', async () => {
      const noWebhookAdapter = new ExternalProviderAdapter(
        { ...mockProvider, webhookUrl: null } as never,
        mockServices
      )

      const result = await noWebhookAdapter.cancelRequest('req_123')

      expect(result).toBe(false)
    })

    it('should send cancel request to provider', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: true } as never)

      const result = await adapter.cancelRequest('req_123')

      expect(result).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        'https://provider.example.com/cancel',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should return false on failure', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const result = await adapter.cancelRequest('req_123')

      expect(result).toBe(false)
    })
  })
})
