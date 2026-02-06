import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
vi.mock('@botesq/database', async () => {
  const actual = await vi.importActual('@botesq/database')
  return {
    ...actual,
    prisma: {
      operator: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    },
  }
})

import { prisma } from '@botesq/database'
import {
  notifyConsultationCompleted,
  notifyConsultationFailed,
  notifyDocumentAnalysisCompleted,
  updateOperatorWebhook,
  regenerateWebhookSecret,
  getOperatorWebhookConfig,
  generateWebhookSecret,
} from '../services/operator-webhook.service'

describe('operator-webhook.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
  })

  describe('generateWebhookSecret', () => {
    it('should generate secret with whsec_ prefix', () => {
      const secret = generateWebhookSecret()
      expect(secret).toMatch(/^whsec_[a-f0-9]{48}$/)
    })

    it('should generate unique secrets', () => {
      const secrets = new Set<string>()
      for (let i = 0; i < 10; i++) {
        secrets.add(generateWebhookSecret())
      }
      expect(secrets.size).toBe(10)
    })
  })

  describe('notifyConsultationCompleted', () => {
    const consultationData = {
      consultationId: 'cons_123',
      externalId: 'CONS-123',
      matterId: 'matter_123',
      status: 'COMPLETED',
      question: 'Is this contract valid?',
      response: 'Yes, it appears valid.',
      attorneyReviewed: true,
      completedAt: new Date('2025-01-15'),
    }

    it('should send webhook when operator has webhook configured', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        webhookUrl: 'https://example.com/webhook',
        webhookSecret: 'whsec_testsecret',
      } as never)

      await notifyConsultationCompleted('op_123', consultationData)

      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-BotEsq-Signature': expect.any(String),
            'X-BotEsq-Timestamp': expect.any(String),
          }),
        })
      )
    })

    it('should include correct event type in payload', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        webhookUrl: 'https://example.com/webhook',
        webhookSecret: 'whsec_test',
      } as never)

      await notifyConsultationCompleted('op_123', consultationData)

      const fetchCall = vi.mocked(fetch).mock.calls[0]
      const body = JSON.parse(fetchCall?.[1]?.body as string)
      expect(body.event).toBe('consultation.completed')
      expect(body.data.consultation_id).toBe('CONS-123')
    })

    it('should silently return when no webhook configured', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        webhookUrl: null,
        webhookSecret: null,
      } as never)

      await notifyConsultationCompleted('op_123', consultationData)

      expect(fetch).not.toHaveBeenCalled()
    })

    it('should handle webhook delivery failure gracefully', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        webhookUrl: 'https://example.com/webhook',
        webhookSecret: 'whsec_test',
      } as never)
      vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as Response)

      // Should not throw
      await notifyConsultationCompleted('op_123', consultationData)
    })

    it('should handle network error gracefully', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        webhookUrl: 'https://example.com/webhook',
        webhookSecret: 'whsec_test',
      } as never)
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      // Should not throw
      await notifyConsultationCompleted('op_123', consultationData)
    })
  })

  describe('notifyConsultationFailed', () => {
    it('should send webhook with failure event', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        webhookUrl: 'https://example.com/webhook',
        webhookSecret: 'whsec_test',
      } as never)

      await notifyConsultationFailed('op_123', {
        consultationId: 'cons_123',
        externalId: 'CONS-123',
        matterId: 'matter_123',
        question: 'Question',
        reason: 'LLM unavailable',
      })

      const fetchCall = vi.mocked(fetch).mock.calls[0]
      const body = JSON.parse(fetchCall?.[1]?.body as string)
      expect(body.event).toBe('consultation.failed')
      expect(body.data.reason).toBe('LLM unavailable')
    })

    it('should silently return when no webhook configured', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        webhookUrl: null,
        webhookSecret: null,
      } as never)

      await notifyConsultationFailed('op_123', {
        consultationId: 'cons_123',
        externalId: 'CONS-123',
        matterId: 'matter_123',
        question: 'Question',
        reason: 'Failed',
      })

      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('notifyDocumentAnalysisCompleted', () => {
    it('should send webhook with document analysis event', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        webhookUrl: 'https://example.com/webhook',
        webhookSecret: 'whsec_test',
      } as never)

      await notifyDocumentAnalysisCompleted('op_123', {
        documentId: 'doc_123',
        externalId: 'DOC-123',
        matterId: 'matter_123',
        filename: 'contract.pdf',
        analysisStatus: 'COMPLETED',
      })

      const fetchCall = vi.mocked(fetch).mock.calls[0]
      const body = JSON.parse(fetchCall?.[1]?.body as string)
      expect(body.event).toBe('document.analysis_completed')
      expect(body.data.filename).toBe('contract.pdf')
    })
  })

  describe('updateOperatorWebhook', () => {
    it('should clear webhook when null URL provided', async () => {
      vi.mocked(prisma.operator.update).mockResolvedValue({} as never)

      const result = await updateOperatorWebhook('op_123', null)

      expect(prisma.operator.update).toHaveBeenCalledWith({
        where: { id: 'op_123' },
        data: { webhookUrl: null, webhookSecret: null },
      })
      expect(result.webhookUrl).toBeNull()
      expect(result.webhookSecret).toBeNull()
    })

    it('should reject invalid URLs', async () => {
      await expect(updateOperatorWebhook('op_123', 'not-a-url')).rejects.toThrow(
        'Invalid webhook URL'
      )
    })

    it('should reject HTTP URLs for non-localhost', async () => {
      await expect(updateOperatorWebhook('op_123', 'http://example.com/webhook')).rejects.toThrow(
        'Webhook URL must use HTTPS'
      )
    })

    it('should allow HTTP for localhost', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        webhookSecret: null,
      } as never)
      vi.mocked(prisma.operator.update).mockResolvedValue({} as never)

      const result = await updateOperatorWebhook('op_123', 'http://localhost:3000/webhook')

      expect(result.webhookUrl).toBe('http://localhost:3000/webhook')
    })

    it('should allow HTTP for 127.0.0.1', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        webhookSecret: null,
      } as never)
      vi.mocked(prisma.operator.update).mockResolvedValue({} as never)

      const result = await updateOperatorWebhook('op_123', 'http://127.0.0.1:3000/webhook')

      expect(result.webhookUrl).toBe('http://127.0.0.1:3000/webhook')
    })

    it('should accept HTTPS URLs', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        webhookSecret: 'whsec_existing',
      } as never)
      vi.mocked(prisma.operator.update).mockResolvedValue({} as never)

      const result = await updateOperatorWebhook('op_123', 'https://example.com/webhook')

      expect(result.webhookUrl).toBe('https://example.com/webhook')
      expect(result.webhookSecret).toBe('whsec_existing')
    })

    it('should generate new secret if operator has none', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        webhookSecret: null,
      } as never)
      vi.mocked(prisma.operator.update).mockResolvedValue({} as never)

      const result = await updateOperatorWebhook('op_123', 'https://example.com/webhook')

      expect(result.webhookSecret).toMatch(/^whsec_/)
    })
  })

  describe('regenerateWebhookSecret', () => {
    it('should generate and store new secret', async () => {
      vi.mocked(prisma.operator.update).mockResolvedValue({} as never)

      const secret = await regenerateWebhookSecret('op_123')

      expect(secret).toMatch(/^whsec_/)
      expect(prisma.operator.update).toHaveBeenCalledWith({
        where: { id: 'op_123' },
        data: { webhookSecret: secret },
      })
    })
  })

  describe('getOperatorWebhookConfig', () => {
    it('should return webhook URL and hasSecret flag', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        webhookUrl: 'https://example.com/webhook',
        webhookSecret: 'whsec_test',
      } as never)

      const result = await getOperatorWebhookConfig('op_123')

      expect(result).toEqual({
        webhookUrl: 'https://example.com/webhook',
        hasSecret: true,
      })
    })

    it('should return null URL and false hasSecret when not configured', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue(null)

      const result = await getOperatorWebhookConfig('op_123')

      expect(result).toEqual({
        webhookUrl: null,
        hasSecret: false,
      })
    })
  })
})
