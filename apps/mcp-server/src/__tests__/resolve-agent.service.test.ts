import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
vi.mock('@botesq/database', () => ({
  prisma: {
    resolveAgent: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    resolveAgentTrustHistory: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  ResolveAgentStatus: {
    ACTIVE: 'ACTIVE',
    SUSPENDED: 'SUSPENDED',
  },
}))

// Mock secure-id
vi.mock('../utils/secure-id.js', () => ({
  generateAgentId: () => 'RAGENT-TEST123456789',
}))

import { prisma } from '@botesq/database'
import { registerAgent, updateTrustScore } from '../services/resolve-agent.service.js'
import { ApiError } from '../types.js'

describe('resolve-agent.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('registerAgent', () => {
    it('should create agent with initial trust score of 50', async () => {
      const mockAgent = {
        id: '1',
        externalId: 'RAGENT-TEST123456789',
        operatorId: 'op_123',
        agentIdentifier: 'agent@example.com',
        displayName: 'Test Agent',
        description: 'Test description',
        trustScore: 50,
        totalTransactions: 0,
        completedTransactions: 0,
        disputesAsClaimant: 0,
        disputesAsRespondent: 0,
        disputesWon: 0,
        disputesLost: 0,
        disputesThisMonth: 0,
        monthlyDisputeResetAt: new Date(),
        status: 'ACTIVE',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prisma.resolveAgent.findUnique.mockResolvedValue(null)
      prisma.resolveAgent.create.mockResolvedValue(mockAgent)

      const result = await registerAgent({
        operatorId: 'op_123',
        agentIdentifier: 'agent@example.com',
        displayName: 'Test Agent',
        description: 'Test description',
      })

      expect(result.trustScore).toBe(50)
      expect(prisma.resolveAgent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          trustScore: 50,
        }),
      })
    })

    it('should throw error if agent already exists', async () => {
      prisma.resolveAgent.findUnique.mockResolvedValue({
        id: '1',
        externalId: 'RAGENT-EXISTING',
      })

      await expect(
        registerAgent({
          operatorId: 'op_123',
          agentIdentifier: 'agent@example.com',
        })
      ).rejects.toThrow(ApiError)
    })

    it('should handle optional display name and description', async () => {
      const mockAgent = {
        id: '1',
        externalId: 'RAGENT-TEST123456789',
        operatorId: 'op_123',
        agentIdentifier: 'agent@example.com',
        displayName: null,
        description: null,
        trustScore: 50,
        totalTransactions: 0,
        completedTransactions: 0,
        disputesAsClaimant: 0,
        disputesAsRespondent: 0,
        disputesWon: 0,
        disputesLost: 0,
        disputesThisMonth: 0,
        monthlyDisputeResetAt: new Date(),
        status: 'ACTIVE',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prisma.resolveAgent.findUnique.mockResolvedValue(null)
      prisma.resolveAgent.create.mockResolvedValue(mockAgent)

      const result = await registerAgent({
        operatorId: 'op_123',
        agentIdentifier: 'agent@example.com',
      })

      expect(result.displayName).toBeNull()
      expect(result.description).toBeNull()
    })
  })

  describe('updateTrustScore', () => {
    const mockAgent = {
      id: '1',
      trustScore: 50,
    }

    beforeEach(() => {
      // Mock transaction to execute callback immediately
      prisma.$transaction.mockImplementation((callback) => callback(prisma))
      prisma.resolveAgent.findUnique.mockResolvedValue(mockAgent)
      prisma.resolveAgent.update.mockResolvedValue({
        ...mockAgent,
        trustScore: 60,
      })
      prisma.resolveAgentTrustHistory.create.mockResolvedValue({})
    })

    it('should increase trust score', async () => {
      const result = await updateTrustScore('1', 10, 'Transaction completed')

      expect(result.previousScore).toBe(50)
      expect(result.newScore).toBe(60)
      expect(prisma.resolveAgent.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { trustScore: 60 },
      })
    })

    it('should decrease trust score', async () => {
      prisma.resolveAgent.update.mockResolvedValue({
        ...mockAgent,
        trustScore: 45,
      })

      const result = await updateTrustScore('1', -5, 'Dispute loss')

      expect(result.previousScore).toBe(50)
      expect(result.newScore).toBe(45)
    })

    it('should clamp trust score at minimum (0)', async () => {
      prisma.resolveAgent.findUnique.mockResolvedValue({
        id: '1',
        trustScore: 10,
      })
      prisma.resolveAgent.update.mockResolvedValue({
        id: '1',
        trustScore: 0,
      })

      const result = await updateTrustScore('1', -50, 'Major violation')

      expect(result.previousScore).toBe(10)
      expect(result.newScore).toBe(0)
    })

    it('should clamp trust score at maximum (100)', async () => {
      prisma.resolveAgent.findUnique.mockResolvedValue({
        id: '1',
        trustScore: 90,
      })
      prisma.resolveAgent.update.mockResolvedValue({
        id: '1',
        trustScore: 100,
      })

      const result = await updateTrustScore('1', 50, 'Excellent performance')

      expect(result.previousScore).toBe(90)
      expect(result.newScore).toBe(100)
    })

    it('should record trust history with change details', async () => {
      await updateTrustScore('1', 10, 'Transaction completed', 'transaction', 'txn_123')

      expect(prisma.resolveAgentTrustHistory.create).toHaveBeenCalledWith({
        data: {
          resolveAgentId: '1',
          previousScore: 50,
          newScore: 60,
          changeAmount: 10,
          reason: 'Transaction completed',
          referenceType: 'transaction',
          referenceId: 'txn_123',
        },
      })
    })

    it('should record trust history without optional references', async () => {
      await updateTrustScore('1', 5, 'Manual adjustment')

      expect(prisma.resolveAgentTrustHistory.create).toHaveBeenCalledWith({
        data: {
          resolveAgentId: '1',
          previousScore: 50,
          newScore: 55,
          changeAmount: 5,
          reason: 'Manual adjustment',
          referenceType: undefined,
          referenceId: undefined,
        },
      })
    })

    it('should throw error if agent not found', async () => {
      prisma.resolveAgent.findUnique.mockResolvedValue(null)

      await expect(updateTrustScore('999', 10, 'Test')).rejects.toThrow(ApiError)
    })
  })
})
