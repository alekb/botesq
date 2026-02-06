import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
vi.mock('@botesq/database', async () => {
  const actual = await vi.importActual('@botesq/database')
  return {
    ...actual,
    prisma: {
      consultation: {
        create: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
      },
    },
  }
})

// Mock secure-id
vi.mock('../utils/secure-id.js', () => ({
  generateConsultationId: vi.fn().mockReturnValue('CONS-TEST12345678'),
}))

import { prisma } from '@botesq/database'
import { queueForHumanReview, getConsultationStatus } from '../services/queue.service'

describe('queue.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('queueForHumanReview', () => {
    const baseParams = {
      operatorId: 'op_123',
      question: 'Is this contract enforceable?',
      complexity: 'simple' as const,
    }

    const mockConsultation = {
      id: 'cons_123',
      externalId: 'CONS-TEST12345678',
      status: 'QUEUED',
      slaDeadline: new Date(),
    }

    it('should set SLA to 4 hours for simple complexity', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))

      vi.mocked(prisma.consultation.count).mockResolvedValue(0)
      vi.mocked(prisma.consultation.create).mockResolvedValue(mockConsultation as never)

      const result = await queueForHumanReview({ ...baseParams, complexity: 'simple' })

      const createCall = vi.mocked(prisma.consultation.create).mock.calls[0]?.[0]
      const slaDeadline = createCall?.data?.slaDeadline as Date
      expect(slaDeadline.getTime()).toBe(new Date('2025-01-15T16:00:00Z').getTime())
      expect(result.slaDeadline).toBeDefined()

      vi.useRealTimers()
    })

    it('should set SLA to 24 hours for moderate complexity', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))

      vi.mocked(prisma.consultation.count).mockResolvedValue(0)
      vi.mocked(prisma.consultation.create).mockResolvedValue(mockConsultation as never)

      await queueForHumanReview({ ...baseParams, complexity: 'moderate' })

      const createCall = vi.mocked(prisma.consultation.create).mock.calls[0]?.[0]
      const slaDeadline = createCall?.data?.slaDeadline as Date
      expect(slaDeadline.getTime()).toBe(new Date('2025-01-16T12:00:00Z').getTime())

      vi.useRealTimers()
    })

    it('should set SLA to 48 hours for complex complexity', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))

      vi.mocked(prisma.consultation.count).mockResolvedValue(0)
      vi.mocked(prisma.consultation.create).mockResolvedValue(mockConsultation as never)

      await queueForHumanReview({ ...baseParams, complexity: 'complex' })

      const createCall = vi.mocked(prisma.consultation.create).mock.calls[0]?.[0]
      const slaDeadline = createCall?.data?.slaDeadline as Date
      expect(slaDeadline.getTime()).toBe(new Date('2025-01-17T12:00:00Z').getTime())

      vi.useRealTimers()
    })

    it('should estimate wait time based on queue depth', async () => {
      vi.mocked(prisma.consultation.count).mockResolvedValue(3)
      vi.mocked(prisma.consultation.create).mockResolvedValue(mockConsultation as never)

      const result = await queueForHumanReview(baseParams)

      // 3 items * 15 min = 45 min, min 5
      expect(result.estimatedWaitMinutes).toBe(45)
    })

    it('should cap wait time at SLA deadline', async () => {
      vi.mocked(prisma.consultation.count).mockResolvedValue(100)
      vi.mocked(prisma.consultation.create).mockResolvedValue(mockConsultation as never)

      const result = await queueForHumanReview({ ...baseParams, complexity: 'simple' })

      // Simple SLA = 4 hours = 240 min, 100 * 15 = 1500, capped at 240
      expect(result.estimatedWaitMinutes).toBe(240)
    })

    it('should set status to PENDING_REVIEW when aiDraft is provided', async () => {
      vi.mocked(prisma.consultation.count).mockResolvedValue(0)
      vi.mocked(prisma.consultation.create).mockResolvedValue({
        ...mockConsultation,
        status: 'PENDING_REVIEW',
      } as never)

      await queueForHumanReview({
        ...baseParams,
        aiDraft: 'This contract appears enforceable...',
        aiConfidence: 0.85,
      })

      expect(prisma.consultation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING_REVIEW',
            aiDraft: 'This contract appears enforceable...',
            aiConfidence: 0.85,
          }),
        })
      )
    })

    it('should set status to QUEUED when no aiDraft', async () => {
      vi.mocked(prisma.consultation.count).mockResolvedValue(0)
      vi.mocked(prisma.consultation.create).mockResolvedValue(mockConsultation as never)

      await queueForHumanReview(baseParams)

      expect(prisma.consultation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'QUEUED',
          }),
        })
      )
    })

    it('should return consultation details', async () => {
      vi.mocked(prisma.consultation.count).mockResolvedValue(0)
      vi.mocked(prisma.consultation.create).mockResolvedValue(mockConsultation as never)

      const result = await queueForHumanReview(baseParams)

      expect(result).toEqual({
        id: 'cons_123',
        externalId: 'CONS-TEST12345678',
        status: 'QUEUED',
        estimatedWaitMinutes: expect.any(Number),
        slaDeadline: expect.any(Date),
      })
    })
  })

  describe('getConsultationStatus', () => {
    it('should return consultation by ID', async () => {
      vi.mocked(prisma.consultation.findFirst).mockResolvedValue({
        id: 'cons_123',
        externalId: 'CONS-TEST12345678',
        status: 'COMPLETED',
        question: 'Is this enforceable?',
        finalResponse: 'Yes, it appears enforceable.',
        aiDraft: 'Draft response...',
        attorney: { firstName: 'Jane', lastName: 'Doe' },
        slaDeadline: new Date('2025-01-16'),
        completedAt: new Date('2025-01-15T14:00:00Z'),
      } as never)

      const result = await getConsultationStatus('cons_123')

      expect(result).toEqual({
        id: 'cons_123',
        externalId: 'CONS-TEST12345678',
        status: 'COMPLETED',
        question: 'Is this enforceable?',
        response: 'Yes, it appears enforceable.',
        aiDraft: 'Draft response...',
        attorney: 'Jane Doe',
        slaDeadline: expect.any(Date),
        completedAt: expect.any(Date),
      })
    })

    it('should search by both id and externalId', async () => {
      vi.mocked(prisma.consultation.findFirst).mockResolvedValue(null)

      await getConsultationStatus('CONS-TEST12345678')

      expect(prisma.consultation.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: 'CONS-TEST12345678' }, { externalId: 'CONS-TEST12345678' }],
        },
        include: expect.any(Object),
      })
    })

    it('should return null when not found', async () => {
      vi.mocked(prisma.consultation.findFirst).mockResolvedValue(null)

      const result = await getConsultationStatus('nonexistent')

      expect(result).toBeNull()
    })

    it('should return null attorney when not assigned', async () => {
      vi.mocked(prisma.consultation.findFirst).mockResolvedValue({
        id: 'cons_123',
        externalId: 'CONS-123',
        status: 'QUEUED',
        question: 'Question',
        finalResponse: null,
        aiDraft: null,
        attorney: null,
        slaDeadline: new Date(),
        completedAt: null,
      } as never)

      const result = await getConsultationStatus('cons_123')

      expect(result?.attorney).toBeNull()
      expect(result?.response).toBeNull()
    })
  })
})
