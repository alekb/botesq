import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConsultationStatus } from '@botesq/database'

// Mock prisma
vi.mock('@botesq/database', async () => {
  const actual = await vi.importActual('@botesq/database')
  return {
    ...actual,
    prisma: {
      consultation: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      matter: {
        findFirst: vi.fn(),
      },
    },
  }
})

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn().mockReturnValue('CONS1234'),
}))

import { prisma } from '@botesq/database'
import {
  createConsultation,
  getConsultation,
  listConsultations,
  CONSULTATION_PRICING,
} from '../services/consultation.service.js'
import { ApiError } from '../types.js'

describe('consultation.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('CONSULTATION_PRICING', () => {
    it('should have correct pricing for standard consultations', () => {
      expect(CONSULTATION_PRICING.standard).toBe(5000)
    })

    it('should have correct pricing for urgent consultations', () => {
      expect(CONSULTATION_PRICING.urgent).toBe(10000)
    })
  })

  describe('createConsultation', () => {
    const baseConsultation = {
      id: 'cons_internal_123',
      externalId: 'CONS-CONS1234',
      operatorId: 'op_123',
      matterId: null,
      question: 'What are the legal requirements?',
      context: null,
      jurisdiction: null,
      complexity: 'STANDARD',
      status: 'QUEUED',
      slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    }

    it('should create consultation with generated external ID', async () => {
      vi.mocked(prisma.consultation.count).mockResolvedValue(0)
      vi.mocked(prisma.consultation.create).mockResolvedValue(baseConsultation as never)

      const result = await createConsultation({
        operatorId: 'op_123',
        question: 'What are the legal requirements?',
        urgency: 'standard',
      })

      expect(result.consultation.externalId).toMatch(/^CONS-/)
    })

    it('should validate matter exists if matterId provided', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue({
        id: 'matter_internal_123',
        operatorId: 'op_123',
      } as never)
      vi.mocked(prisma.consultation.count).mockResolvedValue(0)
      vi.mocked(prisma.consultation.create).mockResolvedValue({
        ...baseConsultation,
        matterId: 'matter_internal_123',
      } as never)

      await createConsultation({
        operatorId: 'op_123',
        matterId: 'matter_123',
        question: 'Question about this matter',
        urgency: 'standard',
      })

      expect(prisma.matter.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: 'matter_123' }, { externalId: 'matter_123' }],
          operatorId: 'op_123',
        },
      })
    })

    it('should throw error if matter not found', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(null)

      await expect(
        createConsultation({
          operatorId: 'op_123',
          matterId: 'nonexistent',
          question: 'Question',
          urgency: 'standard',
        })
      ).rejects.toThrow(ApiError)
      await expect(
        createConsultation({
          operatorId: 'op_123',
          matterId: 'nonexistent',
          question: 'Question',
          urgency: 'standard',
        })
      ).rejects.toThrow('Matter not found')
    })

    it('should enforce row-level security for matter', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(null)

      await expect(
        createConsultation({
          operatorId: 'op_123',
          matterId: 'matter_other_operator',
          question: 'Question',
          urgency: 'standard',
        })
      ).rejects.toThrow('Matter not found')
    })

    it('should calculate 24-hour SLA for standard urgency', async () => {
      vi.mocked(prisma.consultation.count).mockResolvedValue(0)

      const beforeCreate = Date.now()
      vi.mocked(prisma.consultation.create).mockImplementation((async ({
        data,
      }: {
        data: { slaDeadline?: Date }
      }) => {
        const slaDeadline = data.slaDeadline as Date
        const expectedDeadline = beforeCreate + 24 * 60 * 60 * 1000
        // Should be approximately 24 hours from now
        expect(slaDeadline.getTime()).toBeGreaterThanOrEqual(expectedDeadline - 1000)
        expect(slaDeadline.getTime()).toBeLessThanOrEqual(expectedDeadline + 1000)
        return baseConsultation
      }) as never)

      await createConsultation({
        operatorId: 'op_123',
        question: 'Question',
        urgency: 'standard',
      })
    })

    it('should calculate 4-hour SLA for urgent urgency', async () => {
      vi.mocked(prisma.consultation.count).mockResolvedValue(0)

      const beforeCreate = Date.now()
      vi.mocked(prisma.consultation.create).mockImplementation((async ({
        data,
      }: {
        data: { slaDeadline?: Date }
      }) => {
        const slaDeadline = data.slaDeadline as Date
        const expectedDeadline = beforeCreate + 4 * 60 * 60 * 1000
        // Should be approximately 4 hours from now
        expect(slaDeadline.getTime()).toBeGreaterThanOrEqual(expectedDeadline - 1000)
        expect(slaDeadline.getTime()).toBeLessThanOrEqual(expectedDeadline + 1000)
        return {
          ...baseConsultation,
          complexity: 'URGENT',
          slaDeadline: new Date(expectedDeadline),
        }
      }) as never)

      await createConsultation({
        operatorId: 'op_123',
        question: 'Urgent question',
        urgency: 'urgent',
      })
    })

    it('should return standard pricing credits for standard urgency', async () => {
      vi.mocked(prisma.consultation.count).mockResolvedValue(0)
      vi.mocked(prisma.consultation.create).mockResolvedValue(baseConsultation as never)

      const result = await createConsultation({
        operatorId: 'op_123',
        question: 'Question',
        urgency: 'standard',
      })

      expect(result.creditsUsed).toBe(CONSULTATION_PRICING.standard)
    })

    it('should return urgent pricing credits for urgent urgency', async () => {
      vi.mocked(prisma.consultation.count).mockResolvedValue(0)
      vi.mocked(prisma.consultation.create).mockResolvedValue({
        ...baseConsultation,
        complexity: 'URGENT',
      } as never)

      const result = await createConsultation({
        operatorId: 'op_123',
        question: 'Urgent question',
        urgency: 'urgent',
      })

      expect(result.creditsUsed).toBe(CONSULTATION_PRICING.urgent)
    })

    it('should set initial status to QUEUED', async () => {
      vi.mocked(prisma.consultation.count).mockResolvedValue(0)
      vi.mocked(prisma.consultation.create).mockResolvedValue(baseConsultation as never)

      await createConsultation({
        operatorId: 'op_123',
        question: 'Question',
        urgency: 'standard',
      })

      expect(prisma.consultation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'QUEUED',
        }),
      })
    })

    it('should estimate wait time based on queue depth', async () => {
      vi.mocked(prisma.consultation.count).mockResolvedValue(5) // 5 items in queue
      vi.mocked(prisma.consultation.create).mockResolvedValue(baseConsultation as never)

      const result = await createConsultation({
        operatorId: 'op_123',
        question: 'Question',
        urgency: 'standard',
      })

      // 5 items * 15 min each for standard = 75 minutes
      expect(result.consultation.estimatedWaitMinutes).toBe(75)
    })

    it('should give shorter wait estimate for urgent requests', async () => {
      vi.mocked(prisma.consultation.count).mockResolvedValue(5)
      vi.mocked(prisma.consultation.create).mockResolvedValue({
        ...baseConsultation,
        complexity: 'URGENT',
      } as never)

      const result = await createConsultation({
        operatorId: 'op_123',
        question: 'Urgent question',
        urgency: 'urgent',
      })

      // 5 items * 5 min each for urgent = 25 minutes
      expect(result.consultation.estimatedWaitMinutes).toBe(25)
    })

    it('should include context and jurisdiction if provided', async () => {
      vi.mocked(prisma.consultation.count).mockResolvedValue(0)
      vi.mocked(prisma.consultation.create).mockResolvedValue({
        ...baseConsultation,
        context: 'Additional context',
        jurisdiction: 'California',
      } as never)

      await createConsultation({
        operatorId: 'op_123',
        question: 'Question',
        context: 'Additional context',
        jurisdiction: 'California',
        urgency: 'standard',
      })

      expect(prisma.consultation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          context: 'Additional context',
          jurisdiction: 'California',
        }),
      })
    })
  })

  describe('getConsultation', () => {
    const baseConsultation = {
      id: 'cons_internal_123',
      externalId: 'CONS-ABCD1234',
      operatorId: 'op_123',
      question: 'What are the legal requirements?',
      status: 'QUEUED',
      slaDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
      completedAt: null,
      finalResponse: null,
      responseMetadata: null,
      attorneyId: null,
      attorney: null,
    }

    it('should return consultation when found by internal ID', async () => {
      vi.mocked(prisma.consultation.findFirst).mockResolvedValue(baseConsultation as never)

      const result = await getConsultation('cons_internal_123', 'op_123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('cons_internal_123')
    })

    it('should return consultation when found by external ID', async () => {
      vi.mocked(prisma.consultation.findFirst).mockResolvedValue(baseConsultation as never)

      await getConsultation('CONS-ABCD1234', 'op_123')

      expect(prisma.consultation.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: 'CONS-ABCD1234' }, { externalId: 'CONS-ABCD1234' }],
          operatorId: 'op_123',
        },
        include: expect.any(Object),
      })
    })

    it('should return null if consultation not found', async () => {
      vi.mocked(prisma.consultation.findFirst).mockResolvedValue(null)

      const result = await getConsultation('nonexistent', 'op_123')

      expect(result).toBeNull()
    })

    it('should enforce row-level security (operator isolation)', async () => {
      vi.mocked(prisma.consultation.findFirst).mockResolvedValue(null)

      const result = await getConsultation('cons_internal_123', 'op_attacker')

      expect(prisma.consultation.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          operatorId: 'op_attacker',
        }),
        include: expect.any(Object),
      })
      expect(result).toBeNull()
    })

    it('should include response for completed consultations', async () => {
      vi.mocked(prisma.consultation.findFirst).mockResolvedValue({
        ...baseConsultation,
        status: 'COMPLETED',
        finalResponse: 'The legal requirements are...',
        completedAt: new Date(),
        attorneyId: 'att_123',
      } as never)

      const result = await getConsultation('cons_internal_123', 'op_123')

      expect(result?.response).toBe('The legal requirements are...')
      expect(result?.attorneyReviewed).toBe(true)
    })

    it('should include disclaimers for completed consultations', async () => {
      vi.mocked(prisma.consultation.findFirst).mockResolvedValue({
        ...baseConsultation,
        status: 'COMPLETED',
        finalResponse: 'Response',
        completedAt: new Date(),
        attorneyId: 'att_123',
      } as never)

      const result = await getConsultation('cons_internal_123', 'op_123')

      expect(result?.disclaimers).toBeDefined()
      expect(result?.disclaimers?.length).toBeGreaterThan(0)
    })

    it('should NOT include disclaimers for pending consultations', async () => {
      vi.mocked(prisma.consultation.findFirst).mockResolvedValue(baseConsultation as never)

      const result = await getConsultation('cons_internal_123', 'op_123')

      expect(result?.disclaimers).toBeUndefined()
    })

    it('should parse citations from response metadata', async () => {
      vi.mocked(prisma.consultation.findFirst).mockResolvedValue({
        ...baseConsultation,
        status: 'COMPLETED',
        responseMetadata: {
          citations: [{ source: 'California Civil Code', section: '1234' }, { source: 'Case Law' }],
        },
      } as never)

      const result = await getConsultation('cons_internal_123', 'op_123')

      expect(result?.citations).toHaveLength(2)
      expect(result?.citations?.[0]?.source).toBe('California Civil Code')
    })

    it('should estimate remaining wait time for pending consultations', async () => {
      vi.mocked(prisma.consultation.findFirst).mockResolvedValue(baseConsultation as never)

      const result = await getConsultation('cons_internal_123', 'op_123')

      expect(result?.estimatedWaitMinutes).toBeDefined()
      expect(result?.estimatedWaitMinutes).toBeGreaterThan(0)
    })
  })

  describe('listConsultations', () => {
    const mockConsultations = [
      {
        id: 'cons_1',
        externalId: 'CONS-111111',
        operatorId: 'op_123',
        question: 'Question 1',
        status: 'COMPLETED',
        slaDeadline: new Date(),
        completedAt: new Date(),
        attorneyId: 'att_123',
        attorney: { firstName: 'John', lastName: 'Doe' },
        finalResponse: 'Response 1',
      },
      {
        id: 'cons_2',
        externalId: 'CONS-222222',
        operatorId: 'op_123',
        question: 'Question 2',
        status: 'QUEUED',
        slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        completedAt: null,
        attorneyId: null,
        attorney: null,
        finalResponse: null,
      },
    ]

    it('should list consultations for operator only', async () => {
      vi.mocked(prisma.consultation.findMany).mockResolvedValue(mockConsultations as never)
      vi.mocked(prisma.consultation.count).mockResolvedValue(2)

      const result = await listConsultations('op_123')

      expect(prisma.consultation.findMany).toHaveBeenCalledWith({
        where: {
          operatorId: 'op_123',
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
        include: expect.any(Object),
      })
      expect(result.consultations).toHaveLength(2)
    })

    it('should filter by status when provided', async () => {
      vi.mocked(prisma.consultation.findMany).mockResolvedValue([mockConsultations[0]] as never)
      vi.mocked(prisma.consultation.count).mockResolvedValue(1)

      await listConsultations('op_123', { status: ConsultationStatus.COMPLETED })

      expect(prisma.consultation.findMany).toHaveBeenCalledWith({
        where: {
          operatorId: 'op_123',
          status: ConsultationStatus.COMPLETED,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
        include: expect.any(Object),
      })
    })

    it('should filter by matterId when provided (with security check)', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue({
        id: 'matter_internal_123',
      } as never)
      vi.mocked(prisma.consultation.findMany).mockResolvedValue([mockConsultations[0]] as never)
      vi.mocked(prisma.consultation.count).mockResolvedValue(1)

      await listConsultations('op_123', { matterId: 'MATTER-123' })

      // Should verify matter belongs to operator
      expect(prisma.matter.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: 'MATTER-123' }, { externalId: 'MATTER-123' }],
          operatorId: 'op_123',
        },
        select: { id: true },
      })
    })

    it('should respect pagination', async () => {
      vi.mocked(prisma.consultation.findMany).mockResolvedValue(mockConsultations as never)
      vi.mocked(prisma.consultation.count).mockResolvedValue(50)

      await listConsultations('op_123', { limit: 10, offset: 20 })

      expect(prisma.consultation.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 20,
        include: expect.any(Object),
      })
    })

    it('should return total count', async () => {
      vi.mocked(prisma.consultation.findMany).mockResolvedValue(mockConsultations as never)
      vi.mocked(prisma.consultation.count).mockResolvedValue(50)

      const result = await listConsultations('op_123')

      expect(result.total).toBe(50)
    })

    it('should indicate attorney reviewed status', async () => {
      vi.mocked(prisma.consultation.findMany).mockResolvedValue(mockConsultations as never)
      vi.mocked(prisma.consultation.count).mockResolvedValue(2)

      const result = await listConsultations('op_123')

      expect(result.consultations[0]!.attorneyReviewed).toBe(true)
      expect(result.consultations[1]!.attorneyReviewed).toBe(false)
    })
  })
})
