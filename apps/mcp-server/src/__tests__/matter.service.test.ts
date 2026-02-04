import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MatterType, MatterStatus, MatterUrgency } from '@botesq/database'

// Mock prisma
vi.mock('@botesq/database', async () => {
  const actual = await vi.importActual('@botesq/database')
  return {
    ...actual,
    prisma: {
      matter: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
    },
  }
})

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn().mockReturnValue('ABC123'),
}))

import { prisma } from '@botesq/database'
import {
  createMatter,
  getMatter,
  listMatters,
  updateMatterStatus,
  activateMatter,
} from '../services/matter.service.js'

describe('matter.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createMatter', () => {
    const baseMatter = {
      id: 'matter_internal_123',
      externalId: 'MATTER-ABC123',
      operatorId: 'op_123',
      type: MatterType.GENERAL_CONSULTATION,
      title: 'Test Matter',
      description: null,
      urgency: MatterUrgency.STANDARD,
      status: MatterStatus.PENDING_RETAINER,
      retainerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { documents: 0, messages: 0 },
      assignments: [],
      retainer: null,
    }

    it('should create matter with generated external ID', async () => {
      vi.mocked(prisma.matter.create).mockResolvedValue(baseMatter as never)

      const result = await createMatter({
        operatorId: 'op_123',
        type: MatterType.GENERAL_CONSULTATION,
        title: 'Test Matter',
      })

      expect(result.matter.externalId).toMatch(/^MATTER-[A-Z0-9]{6}$/)
    })

    it('should create matter with PENDING_RETAINER status', async () => {
      vi.mocked(prisma.matter.create).mockResolvedValue(baseMatter as never)

      await createMatter({
        operatorId: 'op_123',
        type: MatterType.GENERAL_CONSULTATION,
        title: 'Test Matter',
      })

      expect(prisma.matter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: MatterStatus.PENDING_RETAINER,
          }),
        })
      )
    })

    it('should always indicate retainer is required', async () => {
      vi.mocked(prisma.matter.create).mockResolvedValue(baseMatter as never)

      const result = await createMatter({
        operatorId: 'op_123',
        type: MatterType.GENERAL_CONSULTATION,
        title: 'Test Matter',
      })

      expect(result.retainerRequired).toBe(true)
    })

    it('should use provided urgency', async () => {
      vi.mocked(prisma.matter.create).mockResolvedValue({
        ...baseMatter,
        urgency: MatterUrgency.URGENT,
      } as never)

      await createMatter({
        operatorId: 'op_123',
        type: MatterType.GENERAL_CONSULTATION,
        title: 'Urgent Matter',
        urgency: MatterUrgency.URGENT,
      })

      expect(prisma.matter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            urgency: MatterUrgency.URGENT,
          }),
        })
      )
    })

    it('should default urgency to STANDARD', async () => {
      vi.mocked(prisma.matter.create).mockResolvedValue(baseMatter as never)

      await createMatter({
        operatorId: 'op_123',
        type: MatterType.GENERAL_CONSULTATION,
        title: 'Test Matter',
      })

      expect(prisma.matter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            urgency: MatterUrgency.STANDARD,
          }),
        })
      )
    })

    it('should link agent if provided', async () => {
      vi.mocked(prisma.matter.create).mockResolvedValue({
        ...baseMatter,
        agentId: 'agent_456',
      } as never)

      await createMatter({
        operatorId: 'op_123',
        agentId: 'agent_456',
        type: MatterType.GENERAL_CONSULTATION,
        title: 'Test Matter',
      })

      expect(prisma.matter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agentId: 'agent_456',
          }),
        })
      )
    })

    it('should include description if provided', async () => {
      vi.mocked(prisma.matter.create).mockResolvedValue({
        ...baseMatter,
        description: 'Test description',
      } as never)

      await createMatter({
        operatorId: 'op_123',
        type: MatterType.GENERAL_CONSULTATION,
        title: 'Test Matter',
        description: 'Test description',
      })

      expect(prisma.matter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'Test description',
          }),
        })
      )
    })

    it('should create matter with correct type', async () => {
      vi.mocked(prisma.matter.create).mockResolvedValue({
        ...baseMatter,
        type: MatterType.CONTRACT_REVIEW,
      } as never)

      await createMatter({
        operatorId: 'op_123',
        type: MatterType.CONTRACT_REVIEW,
        title: 'Contract Review Matter',
      })

      expect(prisma.matter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: MatterType.CONTRACT_REVIEW,
          }),
        })
      )
    })
  })

  describe('getMatter', () => {
    const baseMatter = {
      id: 'matter_internal_123',
      externalId: 'MATTER-ABC123',
      operatorId: 'op_123',
      type: MatterType.GENERAL_CONSULTATION,
      title: 'Test Matter',
      description: null,
      urgency: MatterUrgency.STANDARD,
      status: MatterStatus.ACTIVE,
      retainerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { documents: 2, messages: 5 },
      assignments: [],
      retainer: null,
    }

    it('should return matter when found by internal ID', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(baseMatter as never)

      const result = await getMatter('matter_internal_123', 'op_123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('matter_internal_123')
    })

    it('should return matter when found by external ID', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(baseMatter as never)

      const result = await getMatter('MATTER-ABC123', 'op_123')

      expect(result).not.toBeNull()
      expect(prisma.matter.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: 'MATTER-ABC123' }, { externalId: 'MATTER-ABC123' }],
          operatorId: 'op_123',
        },
        include: expect.any(Object),
      })
    })

    it('should return null if matter not found', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(null)

      const result = await getMatter('nonexistent', 'op_123')

      expect(result).toBeNull()
    })

    it('should enforce row-level security (operator isolation)', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(null)

      // Try to get matter belonging to different operator
      const result = await getMatter('matter_internal_123', 'op_different')

      // Should query with operatorId filter
      expect(prisma.matter.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          operatorId: 'op_different',
        }),
        include: expect.any(Object),
      })

      // If matter belongs to different operator, should return null
      expect(result).toBeNull()
    })

    it('should NOT return matter belonging to different operator', async () => {
      // Mock: matter exists but belongs to op_123
      vi.mocked(prisma.matter.findFirst).mockImplementation((async (query: unknown) => {
        const { where } = query as { where: { operatorId: string } }
        // Only return matter if operatorId matches
        if (where.operatorId === 'op_123') {
          return baseMatter
        }
        return null
      }) as never)

      // Operator B trying to access Operator A's matter
      const result = await getMatter('matter_internal_123', 'op_attacker')

      expect(result).toBeNull()
    })

    it('should include document and message counts', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(baseMatter as never)

      const result = await getMatter('matter_internal_123', 'op_123')

      expect(result?._count.documents).toBe(2)
      expect(result?._count.messages).toBe(5)
    })
  })

  describe('listMatters', () => {
    const mockMatters = [
      {
        id: 'matter_1',
        externalId: 'MATTER-111111',
        operatorId: 'op_123',
        type: MatterType.GENERAL_CONSULTATION,
        title: 'Matter 1',
        status: MatterStatus.ACTIVE,
        createdAt: new Date(),
        _count: { documents: 1, messages: 2 },
        assignments: [],
        retainer: null,
      },
      {
        id: 'matter_2',
        externalId: 'MATTER-222222',
        operatorId: 'op_123',
        type: MatterType.CONTRACT_REVIEW,
        title: 'Matter 2',
        status: MatterStatus.PENDING_RETAINER,
        createdAt: new Date(),
        _count: { documents: 0, messages: 0 },
        assignments: [],
        retainer: null,
      },
    ]

    it('should list matters for operator only', async () => {
      vi.mocked(prisma.matter.findMany).mockResolvedValue(mockMatters as never)
      vi.mocked(prisma.matter.count).mockResolvedValue(2)

      const result = await listMatters({ operatorId: 'op_123' })

      expect(prisma.matter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            operatorId: 'op_123',
          },
        })
      )
      expect(result.matters).toHaveLength(2)
    })

    it('should filter by status when provided', async () => {
      vi.mocked(prisma.matter.findMany).mockResolvedValue([mockMatters[0]] as never)
      vi.mocked(prisma.matter.count).mockResolvedValue(1)

      await listMatters({ operatorId: 'op_123', status: MatterStatus.ACTIVE })

      expect(prisma.matter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            operatorId: 'op_123',
            status: MatterStatus.ACTIVE,
          },
        })
      )
    })

    it('should respect pagination limit', async () => {
      vi.mocked(prisma.matter.findMany).mockResolvedValue(mockMatters as never)
      vi.mocked(prisma.matter.count).mockResolvedValue(10)

      await listMatters({ operatorId: 'op_123', limit: 5 })

      expect(prisma.matter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      )
    })

    it('should respect pagination offset', async () => {
      vi.mocked(prisma.matter.findMany).mockResolvedValue(mockMatters as never)
      vi.mocked(prisma.matter.count).mockResolvedValue(10)

      await listMatters({ operatorId: 'op_123', offset: 10 })

      expect(prisma.matter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
        })
      )
    })

    it('should return total count', async () => {
      vi.mocked(prisma.matter.findMany).mockResolvedValue(mockMatters as never)
      vi.mocked(prisma.matter.count).mockResolvedValue(50)

      const result = await listMatters({ operatorId: 'op_123' })

      expect(result.total).toBe(50)
    })

    it('should indicate when there are more results', async () => {
      vi.mocked(prisma.matter.findMany).mockResolvedValue(mockMatters as never)
      vi.mocked(prisma.matter.count).mockResolvedValue(50)

      const result = await listMatters({ operatorId: 'op_123', limit: 2, offset: 0 })

      expect(result.hasMore).toBe(true)
    })

    it('should indicate when there are no more results', async () => {
      vi.mocked(prisma.matter.findMany).mockResolvedValue(mockMatters as never)
      vi.mocked(prisma.matter.count).mockResolvedValue(2)

      const result = await listMatters({ operatorId: 'op_123', limit: 20, offset: 0 })

      expect(result.hasMore).toBe(false)
    })

    it('should default limit to 20', async () => {
      vi.mocked(prisma.matter.findMany).mockResolvedValue(mockMatters as never)
      vi.mocked(prisma.matter.count).mockResolvedValue(2)

      await listMatters({ operatorId: 'op_123' })

      expect(prisma.matter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      )
    })

    it('should order by createdAt descending', async () => {
      vi.mocked(prisma.matter.findMany).mockResolvedValue(mockMatters as never)
      vi.mocked(prisma.matter.count).mockResolvedValue(2)

      await listMatters({ operatorId: 'op_123' })

      expect(prisma.matter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      )
    })
  })

  describe('updateMatterStatus', () => {
    const baseMatter = {
      id: 'matter_internal_123',
      externalId: 'MATTER-ABC123',
      operatorId: 'op_123',
      type: MatterType.GENERAL_CONSULTATION,
      title: 'Test Matter',
      status: MatterStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { documents: 0, messages: 0 },
      assignments: [],
      retainer: null,
    }

    it('should update matter status', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(baseMatter as never)
      vi.mocked(prisma.matter.update).mockResolvedValue({
        ...baseMatter,
        status: MatterStatus.ON_HOLD,
      } as never)

      const result = await updateMatterStatus('matter_internal_123', 'op_123', MatterStatus.ON_HOLD)

      expect(result?.status).toBe(MatterStatus.ON_HOLD)
    })

    it('should return null if matter not found', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(null)

      const result = await updateMatterStatus('nonexistent', 'op_123', MatterStatus.CLOSED)

      expect(result).toBeNull()
      expect(prisma.matter.update).not.toHaveBeenCalled()
    })

    it("should enforce row-level security (cannot update other operator's matters)", async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(null) // Not found for this operator

      const result = await updateMatterStatus(
        'matter_internal_123',
        'op_attacker',
        MatterStatus.CLOSED
      )

      expect(result).toBeNull()
    })

    it('should set resolvedAt timestamp when status is RESOLVED', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(baseMatter as never)
      vi.mocked(prisma.matter.update).mockResolvedValue({
        ...baseMatter,
        status: MatterStatus.RESOLVED,
        resolvedAt: new Date(),
      } as never)

      await updateMatterStatus('matter_internal_123', 'op_123', MatterStatus.RESOLVED)

      expect(prisma.matter.update).toHaveBeenCalledWith({
        where: { id: 'matter_internal_123' },
        data: expect.objectContaining({
          status: MatterStatus.RESOLVED,
          resolvedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      })
    })

    it('should set closedAt timestamp when status is CLOSED', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(baseMatter as never)
      vi.mocked(prisma.matter.update).mockResolvedValue({
        ...baseMatter,
        status: MatterStatus.CLOSED,
        closedAt: new Date(),
      } as never)

      await updateMatterStatus('matter_internal_123', 'op_123', MatterStatus.CLOSED)

      expect(prisma.matter.update).toHaveBeenCalledWith({
        where: { id: 'matter_internal_123' },
        data: expect.objectContaining({
          status: MatterStatus.CLOSED,
          closedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      })
    })

    it('should NOT set timestamp for other status changes', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(baseMatter as never)
      vi.mocked(prisma.matter.update).mockResolvedValue({
        ...baseMatter,
        status: MatterStatus.ON_HOLD,
      } as never)

      await updateMatterStatus('matter_internal_123', 'op_123', MatterStatus.ON_HOLD)

      expect(prisma.matter.update).toHaveBeenCalledWith({
        where: { id: 'matter_internal_123' },
        data: {
          status: MatterStatus.ON_HOLD,
        },
        include: expect.any(Object),
      })
    })
  })

  describe('activateMatter', () => {
    const baseMatter = {
      id: 'matter_internal_123',
      externalId: 'MATTER-ABC123',
      operatorId: 'op_123',
      type: MatterType.GENERAL_CONSULTATION,
      title: 'Test Matter',
      status: MatterStatus.PENDING_RETAINER,
      retainerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { documents: 0, messages: 0 },
      assignments: [],
      retainer: null,
    }

    it('should activate matter and link retainer', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(baseMatter as never)
      vi.mocked(prisma.matter.update).mockResolvedValue({
        ...baseMatter,
        status: MatterStatus.ACTIVE,
        retainerId: 'ret_456',
      } as never)

      const result = await activateMatter('matter_internal_123', 'op_123', 'ret_456')

      expect(result?.status).toBe(MatterStatus.ACTIVE)
      expect(result?.retainerId).toBe('ret_456')
    })

    it('should return null if matter not found', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(null)

      const result = await activateMatter('nonexistent', 'op_123', 'ret_456')

      expect(result).toBeNull()
      expect(prisma.matter.update).not.toHaveBeenCalled()
    })

    it("should enforce row-level security (cannot activate other operator's matters)", async () => {
      // Matter exists but findFirst returns null because operatorId doesn't match
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(null)

      const result = await activateMatter('matter_internal_123', 'op_attacker', 'ret_456')

      expect(result).toBeNull()
      expect(prisma.matter.update).not.toHaveBeenCalled()
    })

    it('should update status to ACTIVE', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(baseMatter as never)
      vi.mocked(prisma.matter.update).mockResolvedValue({
        ...baseMatter,
        status: MatterStatus.ACTIVE,
        retainerId: 'ret_456',
      } as never)

      await activateMatter('matter_internal_123', 'op_123', 'ret_456')

      expect(prisma.matter.update).toHaveBeenCalledWith({
        where: { id: 'matter_internal_123' },
        data: {
          status: MatterStatus.ACTIVE,
          retainerId: 'ret_456',
        },
        include: expect.any(Object),
      })
    })

    it('should work with external matter ID', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(baseMatter as never)
      vi.mocked(prisma.matter.update).mockResolvedValue({
        ...baseMatter,
        status: MatterStatus.ACTIVE,
        retainerId: 'ret_456',
      } as never)

      await activateMatter('MATTER-ABC123', 'op_123', 'ret_456')

      expect(prisma.matter.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: 'MATTER-ABC123' }, { externalId: 'MATTER-ABC123' }],
          operatorId: 'op_123',
        },
      })
    })
  })
})

describe('matter ID generation', () => {
  it('should generate unique matter IDs', async () => {
    // This is implicitly tested through createMatter, but we verify the format
    const { nanoid } = await import('nanoid')
    vi.mocked(nanoid).mockReturnValueOnce('aaa111').mockReturnValueOnce('bbb222')

    vi.mocked(prisma.matter.create).mockImplementation((async ({
      data,
    }: {
      data: Record<string, unknown>
    }) => ({
      id: 'internal_id',
      externalId: data.externalId,
      operatorId: data.operatorId,
      type: data.type,
      title: data.title,
      status: data.status,
      urgency: data.urgency,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { documents: 0, messages: 0 },
      assignments: [],
      retainer: null,
    })) as never)

    const result1 = await createMatter({
      operatorId: 'op_123',
      type: MatterType.GENERAL_CONSULTATION,
      title: 'Matter 1',
    })

    const result2 = await createMatter({
      operatorId: 'op_123',
      type: MatterType.GENERAL_CONSULTATION,
      title: 'Matter 2',
    })

    // Each should have unique external ID
    expect(result1.matter.externalId).toBe('MATTER-AAA111')
    expect(result2.matter.externalId).toBe('MATTER-BBB222')
  })
})
