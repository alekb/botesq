import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RetainerStatus, FeeArrangement, MatterStatus } from '@botesq/database'

// Mock prisma
vi.mock('@botesq/database', async () => {
  const actual = await vi.importActual('@botesq/database')
  return {
    ...actual,
    prisma: {
      retainer: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      matter: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      operator: {
        findUnique: vi.fn(),
      },
    },
  }
})

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn().mockReturnValue('RET12345'),
}))

import { prisma } from '@botesq/database'
import {
  generateSigningUrl,
  createRetainer,
  getRetainer,
  getRetainerForMatter,
  acceptRetainer,
} from '../services/retainer.service.js'

describe('retainer.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  describe('generateSigningUrl', () => {
    it('should generate URL with retainer ID', () => {
      const url = generateSigningUrl('RET-ABC12345')

      expect(url).toBe('https://botesq.io/sign/RET-ABC12345')
    })

    it('should include base domain', () => {
      const url = generateSigningUrl('test-id')

      expect(url).toContain('botesq.io')
    })

    it('should use https protocol', () => {
      const url = generateSigningUrl('test-id')

      expect(url.startsWith('https://')).toBe(true)
    })

    it('should append retainer ID to path', () => {
      const url = generateSigningUrl('my-retainer')

      expect(url.endsWith('/my-retainer')).toBe(true)
    })

    it('should handle various retainer ID formats', () => {
      // Standard format
      expect(generateSigningUrl('RET-12345678')).toContain('RET-12345678')

      // UUID format
      expect(generateSigningUrl('550e8400-e29b-41d4-a716-446655440000')).toContain(
        '550e8400-e29b-41d4-a716-446655440000'
      )

      // Short ID
      expect(generateSigningUrl('abc')).toContain('abc')
    })

    it('should handle empty string', () => {
      const url = generateSigningUrl('')

      expect(url).toBe('https://botesq.io/sign/')
    })

    it('should not URL encode the retainer ID', () => {
      // The function currently doesn't URL encode, which may be intentional
      // for readability or may need to be addressed
      const url = generateSigningUrl('RET-TEST')

      expect(url).toBe('https://botesq.io/sign/RET-TEST')
    })
  })

  describe('createRetainer', () => {
    const mockMatter = {
      id: 'matter_123',
      externalId: 'MATTER-123',
      operatorId: 'op_123',
      type: 'GENERAL',
      title: 'Test Matter',
      status: MatterStatus.PENDING_RETAINER,
      retainerId: null,
    }

    const mockRetainer = {
      id: 'ret_123',
      externalId: 'RET-RET12345',
      operatorId: 'op_123',
      scope: 'General legal advice',
      feeArrangement: FeeArrangement.FLAT_FEE,
      estimatedFee: null,
      conflictCheck: null,
      engagementTerms: 'LEGAL SERVICES ENGAGEMENT AGREEMENT...',
      status: RetainerStatus.PENDING,
      acceptedAt: null,
      acceptedBy: null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      matter: {
        id: 'matter_123',
        externalId: 'MATTER-123',
        type: 'GENERAL',
        title: 'Test Matter',
        status: MatterStatus.PENDING_RETAINER,
      },
    }

    it('should throw error if matter not found', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(null)

      await expect(
        createRetainer({
          operatorId: 'op_123',
          matterId: 'nonexistent',
          scope: 'General advice',
        })
      ).rejects.toThrow('Matter not found')
    })

    it('should enforce row-level security for matter', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(null)

      await expect(
        createRetainer({
          operatorId: 'op_attacker',
          matterId: 'matter_123',
          scope: 'General advice',
        })
      ).rejects.toThrow('Matter not found')
    })

    it('should return existing retainer if matter already has one', async () => {
      const matterWithRetainer = { ...mockMatter, retainerId: 'ret_existing' }
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(matterWithRetainer as never)
      vi.mocked(prisma.retainer.findUnique).mockResolvedValue(mockRetainer as never)

      const result = await createRetainer({
        operatorId: 'op_123',
        matterId: 'matter_123',
        scope: 'General advice',
      })

      expect(result.externalId).toBe('RET-RET12345')
      expect(prisma.retainer.create).not.toHaveBeenCalled()
    })

    it('should create retainer with 30-day expiration', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))

      vi.mocked(prisma.matter.findFirst).mockResolvedValue(mockMatter as never)
      vi.mocked(prisma.retainer.create).mockResolvedValue(mockRetainer as never)
      vi.mocked(prisma.retainer.findUnique).mockResolvedValue(mockRetainer as never)

      await createRetainer({
        operatorId: 'op_123',
        matterId: 'matter_123',
        scope: 'General advice',
      })

      expect(prisma.retainer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: expect.any(Date),
          }),
        })
      )

      const callArg = vi.mocked(prisma.retainer.create).mock.calls[0]?.[0]
      const expiry = callArg?.data?.expiresAt as Date
      const expected = new Date('2025-02-14T12:00:00Z')
      expect(expiry.getTime()).toBe(expected.getTime())

      vi.useRealTimers()
    })

    it('should create retainer with PENDING status', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(mockMatter as never)
      vi.mocked(prisma.retainer.create).mockResolvedValue(mockRetainer as never)
      vi.mocked(prisma.retainer.findUnique).mockResolvedValue(mockRetainer as never)

      await createRetainer({
        operatorId: 'op_123',
        matterId: 'matter_123',
        scope: 'General advice',
      })

      expect(prisma.retainer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: RetainerStatus.PENDING,
          }),
        })
      )
    })

    it('should link retainer to matter', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(mockMatter as never)
      vi.mocked(prisma.retainer.create).mockResolvedValue(mockRetainer as never)
      vi.mocked(prisma.retainer.findUnique).mockResolvedValue(mockRetainer as never)

      await createRetainer({
        operatorId: 'op_123',
        matterId: 'matter_123',
        scope: 'General advice',
      })

      expect(prisma.matter.update).toHaveBeenCalledWith({
        where: { id: 'matter_123' },
        data: { retainerId: 'ret_123' },
      })
    })

    it('should use FLAT_FEE as default fee arrangement', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(mockMatter as never)
      vi.mocked(prisma.retainer.create).mockResolvedValue(mockRetainer as never)
      vi.mocked(prisma.retainer.findUnique).mockResolvedValue(mockRetainer as never)

      await createRetainer({
        operatorId: 'op_123',
        matterId: 'matter_123',
        scope: 'General advice',
      })

      expect(prisma.retainer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            feeArrangement: FeeArrangement.FLAT_FEE,
          }),
        })
      )
    })
  })

  describe('getRetainer', () => {
    const mockRetainer = {
      id: 'ret_123',
      externalId: 'RET-123',
      operatorId: 'op_123',
      status: RetainerStatus.PENDING,
      matter: null,
    }

    it('should return retainer when found by internal ID', async () => {
      vi.mocked(prisma.retainer.findFirst).mockResolvedValue(mockRetainer as never)

      const result = await getRetainer('ret_123', 'op_123')

      expect(result).not.toBeNull()
    })

    it('should return retainer when found by external ID', async () => {
      vi.mocked(prisma.retainer.findFirst).mockResolvedValue(mockRetainer as never)

      await getRetainer('RET-123', 'op_123')

      expect(prisma.retainer.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: 'RET-123' }, { externalId: 'RET-123' }],
          operatorId: 'op_123',
        },
        include: expect.any(Object),
      })
    })

    it('should return null if retainer not found', async () => {
      vi.mocked(prisma.retainer.findFirst).mockResolvedValue(null)

      const result = await getRetainer('nonexistent', 'op_123')

      expect(result).toBeNull()
    })

    it('should enforce row-level security (operator isolation)', async () => {
      vi.mocked(prisma.retainer.findFirst).mockResolvedValue(null)

      const result = await getRetainer('ret_123', 'op_attacker')

      expect(prisma.retainer.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          operatorId: 'op_attacker',
        }),
        include: expect.any(Object),
      })
      expect(result).toBeNull()
    })
  })

  describe('getRetainerForMatter', () => {
    const mockMatterWithRetainer = {
      id: 'matter_123',
      operatorId: 'op_123',
      retainer: {
        id: 'ret_123',
        externalId: 'RET-123',
        status: RetainerStatus.ACCEPTED,
        matter: {
          id: 'matter_123',
          externalId: 'MATTER-123',
          type: 'GENERAL',
          title: 'Test Matter',
          status: MatterStatus.ACTIVE,
        },
      },
    }

    it('should return retainer for matter', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(mockMatterWithRetainer as never)

      const result = await getRetainerForMatter('matter_123', 'op_123')

      expect(result).not.toBeNull()
      expect(result?.externalId).toBe('RET-123')
    })

    it('should return null if matter has no retainer', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue({
        id: 'matter_123',
        retainer: null,
      } as never)

      const result = await getRetainerForMatter('matter_123', 'op_123')

      expect(result).toBeNull()
    })

    it('should return null if matter not found', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(null)

      const result = await getRetainerForMatter('nonexistent', 'op_123')

      expect(result).toBeNull()
    })
  })

  describe('acceptRetainer', () => {
    const mockRetainer = {
      id: 'ret_123',
      externalId: 'RET-123',
      operatorId: 'op_123',
      status: RetainerStatus.PENDING,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    }

    const mockUpdatedRetainer = {
      ...mockRetainer,
      status: RetainerStatus.ACCEPTED,
      acceptedAt: new Date(),
      acceptedBy: 'agent_123',
      matter: {
        id: 'matter_123',
        externalId: 'MATTER-123',
        type: 'GENERAL',
        title: 'Test Matter',
        status: MatterStatus.PENDING_RETAINER,
      },
    }

    it('should throw error if retainer not found', async () => {
      vi.mocked(prisma.retainer.findFirst).mockResolvedValue(null)

      await expect(
        acceptRetainer({
          retainerId: 'nonexistent',
          operatorId: 'op_123',
          acceptedBy: 'agent_123',
          signatureMethod: 'electronic',
        })
      ).rejects.toThrow('Retainer not found')
    })

    it('should throw error if retainer already accepted', async () => {
      vi.mocked(prisma.retainer.findFirst).mockResolvedValue({
        ...mockRetainer,
        status: RetainerStatus.ACCEPTED,
      } as never)

      await expect(
        acceptRetainer({
          retainerId: 'ret_123',
          operatorId: 'op_123',
          acceptedBy: 'agent_123',
          signatureMethod: 'electronic',
        })
      ).rejects.toThrow('already accepted')
    })

    it('should throw error if retainer expired', async () => {
      vi.mocked(prisma.retainer.findFirst).mockResolvedValue({
        ...mockRetainer,
        expiresAt: new Date(Date.now() - 1000), // Already expired
      } as never)
      vi.mocked(prisma.retainer.update).mockResolvedValue({} as never)

      await expect(
        acceptRetainer({
          retainerId: 'ret_123',
          operatorId: 'op_123',
          acceptedBy: 'agent_123',
          signatureMethod: 'electronic',
        })
      ).rejects.toThrow('expired')
    })

    it('should validate pre-auth token if provided', async () => {
      vi.mocked(prisma.retainer.findFirst).mockResolvedValue(mockRetainer as never)
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        preAuthToken: 'correct_token',
        preAuthScope: 'retainer',
      } as never)
      vi.mocked(prisma.retainer.update).mockResolvedValue(mockUpdatedRetainer as never)
      vi.mocked(prisma.retainer.findUnique).mockResolvedValue(mockUpdatedRetainer as never)

      await acceptRetainer({
        retainerId: 'ret_123',
        operatorId: 'op_123',
        acceptedBy: 'agent_123',
        signatureMethod: 'pre-auth',
        preAuthToken: 'correct_token',
      })

      expect(prisma.operator.findUnique).toHaveBeenCalled()
    })

    it('should throw error for invalid pre-auth token', async () => {
      vi.mocked(prisma.retainer.findFirst).mockResolvedValue(mockRetainer as never)
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        preAuthToken: 'correct_token',
      } as never)

      await expect(
        acceptRetainer({
          retainerId: 'ret_123',
          operatorId: 'op_123',
          acceptedBy: 'agent_123',
          signatureMethod: 'pre-auth',
          preAuthToken: 'wrong_token',
        })
      ).rejects.toThrow('Invalid pre-authorization token')
    })

    it('should activate matter if in PENDING_RETAINER status', async () => {
      vi.mocked(prisma.retainer.findFirst).mockResolvedValue(mockRetainer as never)
      vi.mocked(prisma.retainer.update).mockResolvedValue(mockUpdatedRetainer as never)
      vi.mocked(prisma.retainer.findUnique).mockResolvedValue({
        ...mockUpdatedRetainer,
        matter: { ...mockUpdatedRetainer.matter, status: MatterStatus.ACTIVE },
      } as never)

      const result = await acceptRetainer({
        retainerId: 'ret_123',
        operatorId: 'op_123',
        acceptedBy: 'agent_123',
        signatureMethod: 'electronic',
      })

      expect(result.matterActivated).toBe(true)
      expect(prisma.matter.update).toHaveBeenCalledWith({
        where: { id: 'matter_123' },
        data: { status: MatterStatus.ACTIVE },
      })
    })

    it('should record acceptance timestamp and signature info', async () => {
      vi.mocked(prisma.retainer.findFirst).mockResolvedValue(mockRetainer as never)
      vi.mocked(prisma.retainer.update).mockResolvedValue(mockUpdatedRetainer as never)
      vi.mocked(prisma.retainer.findUnique).mockResolvedValue(mockUpdatedRetainer as never)

      await acceptRetainer({
        retainerId: 'ret_123',
        operatorId: 'op_123',
        acceptedBy: 'agent_123',
        signatureMethod: 'electronic',
        signatureIp: '192.168.1.1',
      })

      expect(prisma.retainer.update).toHaveBeenCalledWith({
        where: { id: 'ret_123' },
        data: expect.objectContaining({
          status: RetainerStatus.ACCEPTED,
          acceptedAt: expect.any(Date),
          acceptedBy: 'agent_123',
          signatureMethod: 'electronic',
          signatureIp: '192.168.1.1',
        }),
        include: expect.any(Object),
      })
    })
  })
})
