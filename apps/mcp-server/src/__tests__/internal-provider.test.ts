import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock legal-ai.service
vi.mock('../services/legal-ai.service', () => ({
  generateLegalResponse: vi.fn(),
}))

// Mock document-analysis.service
vi.mock('../services/document-analysis.service', () => ({
  analyzeDocument: vi.fn(),
}))

import { generateLegalResponse } from '../services/legal-ai.service'
import { analyzeDocument } from '../services/document-analysis.service'
import { internalProvider } from '../providers/internal-provider'
import type { ProviderServiceRequest } from '../providers/types'

describe('internal-provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('properties', () => {
    it('should have id "internal"', () => {
      expect(internalProvider.id).toBe('internal')
    })

    it('should have name "BotEsq AI"', () => {
      expect(internalProvider.name).toBe('BotEsq AI')
    })

    it('should be marked as internal', () => {
      expect(internalProvider.isInternal).toBe(true)
    })
  })

  describe('getCapabilities', () => {
    it('should return supported service types', async () => {
      const capabilities = await internalProvider.getCapabilities()

      expect(capabilities.serviceTypes).toContain('LEGAL_QA')
      expect(capabilities.serviceTypes).toContain('DOCUMENT_REVIEW')
      expect(capabilities.serviceTypes).toContain('CONSULTATION')
    })

    it('should not support async', async () => {
      const capabilities = await internalProvider.getCapabilities()

      expect(capabilities.supportsAsync).toBe(false)
    })

    it('should return 1 minute average response time', async () => {
      const capabilities = await internalProvider.getCapabilities()

      expect(capabilities.averageResponseMinutes).toBe(1)
    })
  })

  describe('checkHealth', () => {
    it('should report healthy with no errors', async () => {
      const health = await internalProvider.checkHealth()

      expect(health.healthy).toBe(true)
      expect(health.errorRate).toBeLessThanOrEqual(0.1)
    })
  })

  describe('processRequest - LEGAL_QA', () => {
    const makeRequest = (
      overrides: Partial<ProviderServiceRequest['content']> = {}
    ): ProviderServiceRequest => ({
      requestId: 'req_123',
      serviceType: 'LEGAL_QA' as never,
      operatorId: 'op_123',
      content: {
        question: 'Is this contract enforceable?',
        jurisdiction: 'US-CA',
        ...overrides,
      },
    })

    it('should return FAILED when question is missing', async () => {
      const request = makeRequest({ question: undefined })

      const result = await internalProvider.processRequest(request)

      expect(result.status).toBe('FAILED')
      expect(result.error?.code).toBe('MISSING_QUESTION')
    })

    it('should return COMPLETED for high confidence response', async () => {
      vi.mocked(generateLegalResponse).mockResolvedValue({
        answer: 'Yes, this contract is enforceable.',
        confidenceScore: 85,
        complexity: 'simple',
        citations: [{ source: 'UCC 2-201' }],
      } as never)

      const result = await internalProvider.processRequest(makeRequest())

      expect(result.status).toBe('COMPLETED')
      expect(result.content?.answer).toBe('Yes, this contract is enforceable.')
      expect(result.content?.confidence).toBeCloseTo(0.85)
    })

    it('should return REQUIRES_ESCALATION for low confidence', async () => {
      vi.mocked(generateLegalResponse).mockResolvedValue({
        answer: 'Unclear legal question...',
        confidenceScore: 45,
        complexity: 'complex',
        citations: [],
      } as never)

      const result = await internalProvider.processRequest(makeRequest())

      expect(result.status).toBe('REQUIRES_ESCALATION')
      expect(result.escalation?.reason).toContain('Low confidence')
    })

    it('should return FAILED on error', async () => {
      vi.mocked(generateLegalResponse).mockRejectedValue(new Error('LLM timeout'))

      const result = await internalProvider.processRequest(makeRequest())

      expect(result.status).toBe('FAILED')
      expect(result.error?.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('processRequest - DOCUMENT_REVIEW', () => {
    const makeRequest = (
      overrides: Partial<ProviderServiceRequest['content']> = {}
    ): ProviderServiceRequest => ({
      requestId: 'req_456',
      serviceType: 'DOCUMENT_REVIEW' as never,
      operatorId: 'op_123',
      content: {
        documentUrl: 'https://example.com/doc.pdf',
        documentType: 'contract',
        context: 'Review this contract',
        ...overrides,
      },
    })

    it('should return FAILED when document URL is missing', async () => {
      const result = await internalProvider.processRequest(makeRequest({ documentUrl: undefined }))

      expect(result.status).toBe('FAILED')
      expect(result.error?.code).toBe('MISSING_DOCUMENT')
    })

    it('should return COMPLETED with analysis results', async () => {
      vi.mocked(analyzeDocument).mockResolvedValue({
        summary: 'Standard employment agreement',
        recommendations: ['Add arbitration clause'],
        confidenceScore: 90,
      } as never)

      const result = await internalProvider.processRequest(makeRequest())

      expect(result.status).toBe('COMPLETED')
      expect(result.content?.summary).toBe('Standard employment agreement')
    })

    it('should return FAILED when analysis returns null', async () => {
      vi.mocked(analyzeDocument).mockResolvedValue(null)

      const result = await internalProvider.processRequest(makeRequest())

      expect(result.status).toBe('FAILED')
      expect(result.error?.code).toBe('ANALYSIS_FAILED')
    })

    it('should calculate credits based on page count', async () => {
      vi.mocked(analyzeDocument).mockResolvedValue({
        summary: 'Test',
        recommendations: [],
        confidenceScore: 85,
      } as never)

      const result = await internalProvider.processRequest(makeRequest({ pageCount: 10 }))

      // baseCredits (2500) + 10 pages * 100 = 3500
      expect(result.creditsUsed).toBe(3500)
    })
  })

  describe('processRequest - CONSULTATION', () => {
    const makeRequest = (): ProviderServiceRequest => ({
      requestId: 'req_789',
      serviceType: 'CONSULTATION' as never,
      operatorId: 'op_123',
      content: {
        question: 'I need advice on employment law',
        jurisdiction: 'US-NY',
      },
    })

    it('should return REQUIRES_ESCALATION for complex consultations', async () => {
      vi.mocked(generateLegalResponse).mockResolvedValue({
        answer: 'This is a complex area...',
        confidenceScore: 80,
        complexity: 'complex',
        citations: [],
      } as never)

      const result = await internalProvider.processRequest(makeRequest())

      expect(result.status).toBe('REQUIRES_ESCALATION')
      expect(result.escalation?.reason).toContain('Complex consultation')
    })

    it('should return COMPLETED for simple consultation', async () => {
      vi.mocked(generateLegalResponse).mockResolvedValue({
        answer: 'Standard employment advice.',
        confidenceScore: 85,
        complexity: 'simple',
        citations: [{ source: 'FLSA' }],
      } as never)

      const result = await internalProvider.processRequest(makeRequest())

      expect(result.status).toBe('COMPLETED')
    })
  })
})
