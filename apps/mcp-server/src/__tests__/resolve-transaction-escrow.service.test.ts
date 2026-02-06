import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ResolveTransactionStatus, ResolveEscrowStatus } from '@botesq/database'

// Mock prisma
vi.mock('@botesq/database', async () => {
  const actual = await vi.importActual('@botesq/database')
  return {
    ...actual,
    prisma: {
      resolveTransaction: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    },
  }
})

import { prisma } from '@botesq/database'
import {
  fundEscrow,
  releaseEscrow,
  getEscrowStatus,
} from '../services/resolve-transaction.service.js'

describe('resolve-transaction escrow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockTransaction = {
    id: 'trans_123',
    externalId: 'RTRANS-123',
    proposerAgentId: 'agent_proposer',
    receiverAgentId: 'agent_receiver',
    status: ResolveTransactionStatus.ACCEPTED,
    escrowAmount: null,
    escrowCurrency: 'USD',
    escrowStatus: ResolveEscrowStatus.NONE,
    escrowFundedAt: null,
    escrowReleasedAt: null,
    escrowReleasedTo: null,
    proposerAgent: {
      externalId: 'ext_proposer',
      agentIdentifier: 'proposer',
      displayName: 'Proposer',
      trustScore: 80,
    },
    receiverAgent: {
      externalId: 'ext_receiver',
      agentIdentifier: 'receiver',
      displayName: 'Receiver',
      trustScore: 75,
    },
  }

  describe('fundEscrow', () => {
    it('should throw error if transaction not found', async () => {
      vi.mocked(prisma.resolveTransaction.findUnique).mockResolvedValue(null)

      await expect(fundEscrow('nonexistent', 'agent_proposer', 5000)).rejects.toThrow(
        'Transaction not found'
      )
    })

    it('should throw error if not a party', async () => {
      vi.mocked(prisma.resolveTransaction.findUnique).mockResolvedValue(mockTransaction as never)

      await expect(fundEscrow('RTRANS-123', 'agent_outsider', 5000)).rejects.toThrow(
        'Only transaction parties'
      )
    })

    it('should throw error if transaction not in ACCEPTED or IN_PROGRESS status', async () => {
      vi.mocked(prisma.resolveTransaction.findUnique).mockResolvedValue({
        ...mockTransaction,
        status: ResolveTransactionStatus.PROPOSED,
      } as never)

      await expect(fundEscrow('RTRANS-123', 'agent_proposer', 5000)).rejects.toThrow(
        'Cannot fund escrow'
      )
    })

    it('should throw error if escrow already exists (not NONE)', async () => {
      vi.mocked(prisma.resolveTransaction.findUnique).mockResolvedValue({
        ...mockTransaction,
        escrowStatus: ResolveEscrowStatus.FUNDED,
      } as never)

      await expect(fundEscrow('RTRANS-123', 'agent_proposer', 5000)).rejects.toThrow(
        'Escrow is already'
      )
    })

    it('should throw error if amount is zero', async () => {
      vi.mocked(prisma.resolveTransaction.findUnique).mockResolvedValue(mockTransaction as never)

      await expect(fundEscrow('RTRANS-123', 'agent_proposer', 0)).rejects.toThrow(
        'must be positive'
      )
    })

    it('should throw error if amount is negative', async () => {
      vi.mocked(prisma.resolveTransaction.findUnique).mockResolvedValue(mockTransaction as never)

      await expect(fundEscrow('RTRANS-123', 'agent_proposer', -100)).rejects.toThrow(
        'must be positive'
      )
    })

    it('should fund escrow and set status to FUNDED', async () => {
      vi.mocked(prisma.resolveTransaction.findUnique).mockResolvedValue(mockTransaction as never)
      vi.mocked(prisma.resolveTransaction.update).mockResolvedValue({
        ...mockTransaction,
        escrowAmount: 5000,
        escrowCurrency: 'USD',
        escrowStatus: ResolveEscrowStatus.FUNDED,
        escrowFundedAt: new Date(),
        status: ResolveTransactionStatus.IN_PROGRESS,
        title: 'Test',
        description: null,
        terms: {},
        statedValue: 5000,
        statedValueCurrency: 'USD',
        proposedAt: new Date(),
        respondedAt: new Date(),
        completedAt: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        _count: { disputes: 0 },
      } as never)

      await fundEscrow('RTRANS-123', 'agent_proposer', 5000)

      expect(prisma.resolveTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            escrowAmount: 5000,
            escrowCurrency: 'USD',
            escrowStatus: ResolveEscrowStatus.FUNDED,
            escrowFundedAt: expect.any(Date),
            status: ResolveTransactionStatus.IN_PROGRESS,
          }),
        })
      )
    })

    it('should allow funding with custom currency', async () => {
      vi.mocked(prisma.resolveTransaction.findUnique).mockResolvedValue(mockTransaction as never)
      vi.mocked(prisma.resolveTransaction.update).mockResolvedValue({
        ...mockTransaction,
        escrowAmount: 10000,
        escrowCurrency: 'EUR',
        escrowStatus: ResolveEscrowStatus.FUNDED,
        escrowFundedAt: new Date(),
        status: ResolveTransactionStatus.IN_PROGRESS,
        title: 'Test',
        description: null,
        terms: {},
        statedValue: 10000,
        statedValueCurrency: 'EUR',
        proposedAt: new Date(),
        respondedAt: new Date(),
        completedAt: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        _count: { disputes: 0 },
      } as never)

      await fundEscrow('RTRANS-123', 'agent_proposer', 10000, 'EUR')

      expect(prisma.resolveTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            escrowCurrency: 'EUR',
          }),
        })
      )
    })

    it('should allow IN_PROGRESS transaction to be funded', async () => {
      vi.mocked(prisma.resolveTransaction.findUnique).mockResolvedValue({
        ...mockTransaction,
        status: ResolveTransactionStatus.IN_PROGRESS,
      } as never)
      vi.mocked(prisma.resolveTransaction.update).mockResolvedValue({
        ...mockTransaction,
        escrowAmount: 5000,
        escrowStatus: ResolveEscrowStatus.FUNDED,
        escrowFundedAt: new Date(),
        status: ResolveTransactionStatus.IN_PROGRESS,
        title: 'Test',
        description: null,
        terms: {},
        statedValue: 5000,
        statedValueCurrency: 'USD',
        proposedAt: new Date(),
        respondedAt: new Date(),
        completedAt: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        _count: { disputes: 0 },
      } as never)

      // Should not throw
      await fundEscrow('RTRANS-123', 'agent_proposer', 5000)

      expect(prisma.resolveTransaction.update).toHaveBeenCalled()
    })
  })

  describe('releaseEscrow', () => {
    const fundedTransaction = {
      ...mockTransaction,
      escrowAmount: 5000,
      escrowStatus: ResolveEscrowStatus.FUNDED,
      escrowFundedAt: new Date(),
      status: ResolveTransactionStatus.IN_PROGRESS,
    }

    it('should throw error if transaction not found', async () => {
      vi.mocked(prisma.resolveTransaction.findUnique).mockResolvedValue(null)

      await expect(releaseEscrow('nonexistent', 'agent_proposer')).rejects.toThrow(
        'Transaction not found'
      )
    })

    it('should throw error if not a party', async () => {
      vi.mocked(prisma.resolveTransaction.findUnique).mockResolvedValue(fundedTransaction as never)

      await expect(releaseEscrow('RTRANS-123', 'agent_outsider')).rejects.toThrow(
        'Only transaction parties'
      )
    })

    it('should throw error if escrow not funded', async () => {
      vi.mocked(prisma.resolveTransaction.findUnique).mockResolvedValue({
        ...fundedTransaction,
        escrowStatus: ResolveEscrowStatus.NONE,
      } as never)

      await expect(releaseEscrow('RTRANS-123', 'agent_proposer')).rejects.toThrow(
        'Cannot release escrow'
      )
    })

    it('should throw error if escrow already released', async () => {
      vi.mocked(prisma.resolveTransaction.findUnique).mockResolvedValue({
        ...fundedTransaction,
        escrowStatus: ResolveEscrowStatus.RELEASED,
      } as never)

      await expect(releaseEscrow('RTRANS-123', 'agent_proposer')).rejects.toThrow(
        'Cannot release escrow'
      )
    })

    it('should release escrow to receiver when proposer releases', async () => {
      vi.mocked(prisma.resolveTransaction.findUnique).mockResolvedValue(fundedTransaction as never)
      vi.mocked(prisma.resolveTransaction.update).mockResolvedValue({
        ...fundedTransaction,
        escrowStatus: ResolveEscrowStatus.RELEASED,
        escrowReleasedAt: new Date(),
        escrowReleasedTo: 'ext_receiver',
        title: 'Test',
        description: null,
        terms: {},
        statedValue: 5000,
        statedValueCurrency: 'USD',
        proposedAt: new Date(),
        respondedAt: new Date(),
        completedAt: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        _count: { disputes: 0 },
      } as never)

      await releaseEscrow('RTRANS-123', 'agent_proposer')

      expect(prisma.resolveTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            escrowStatus: ResolveEscrowStatus.RELEASED,
            escrowReleasedAt: expect.any(Date),
            escrowReleasedTo: 'ext_receiver',
          }),
        })
      )
    })

    it('should release escrow to proposer when receiver releases', async () => {
      vi.mocked(prisma.resolveTransaction.findUnique).mockResolvedValue(fundedTransaction as never)
      vi.mocked(prisma.resolveTransaction.update).mockResolvedValue({
        ...fundedTransaction,
        escrowStatus: ResolveEscrowStatus.RELEASED,
        escrowReleasedAt: new Date(),
        escrowReleasedTo: 'ext_proposer',
        title: 'Test',
        description: null,
        terms: {},
        statedValue: 5000,
        statedValueCurrency: 'USD',
        proposedAt: new Date(),
        respondedAt: new Date(),
        completedAt: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        _count: { disputes: 0 },
      } as never)

      await releaseEscrow('RTRANS-123', 'agent_receiver')

      expect(prisma.resolveTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            escrowReleasedTo: 'ext_proposer',
          }),
        })
      )
    })
  })

  describe('getEscrowStatus', () => {
    it('should throw error if transaction not found', async () => {
      vi.mocked(prisma.resolveTransaction.findUnique).mockResolvedValue(null)

      await expect(getEscrowStatus('nonexistent', 'agent_proposer')).rejects.toThrow(
        'Transaction not found'
      )
    })

    it('should throw error if not a party', async () => {
      vi.mocked(prisma.resolveTransaction.findUnique).mockResolvedValue(mockTransaction as never)

      await expect(getEscrowStatus('RTRANS-123', 'agent_outsider')).rejects.toThrow(
        'Only transaction parties'
      )
    })

    it('should return escrow status for unfunded transaction', async () => {
      vi.mocked(prisma.resolveTransaction.findUnique).mockResolvedValue(mockTransaction as never)

      const result = await getEscrowStatus('RTRANS-123', 'agent_proposer')

      expect(result.transaction_id).toBe('RTRANS-123')
      expect(result.escrow_amount).toBeNull()
      expect(result.escrow_currency).toBe('USD')
      expect(result.escrow_status).toBe(ResolveEscrowStatus.NONE)
      expect(result.escrow_funded_at).toBeNull()
      expect(result.escrow_released_at).toBeNull()
      expect(result.escrow_released_to).toBeNull()
    })

    it('should return escrow status for funded transaction', async () => {
      const fundedAt = new Date()
      vi.mocked(prisma.resolveTransaction.findUnique).mockResolvedValue({
        ...mockTransaction,
        escrowAmount: 5000,
        escrowStatus: ResolveEscrowStatus.FUNDED,
        escrowFundedAt: fundedAt,
      } as never)

      const result = await getEscrowStatus('RTRANS-123', 'agent_proposer')

      expect(result.escrow_amount).toBe(5000)
      expect(result.escrow_status).toBe(ResolveEscrowStatus.FUNDED)
      expect(result.escrow_funded_at).toBe(fundedAt)
    })

    it('should return escrow status for released transaction', async () => {
      const fundedAt = new Date(Date.now() - 86400000)
      const releasedAt = new Date()
      vi.mocked(prisma.resolveTransaction.findUnique).mockResolvedValue({
        ...mockTransaction,
        escrowAmount: 5000,
        escrowStatus: ResolveEscrowStatus.RELEASED,
        escrowFundedAt: fundedAt,
        escrowReleasedAt: releasedAt,
        escrowReleasedTo: 'ext_receiver',
      } as never)

      const result = await getEscrowStatus('RTRANS-123', 'agent_proposer')

      expect(result.escrow_status).toBe(ResolveEscrowStatus.RELEASED)
      expect(result.escrow_released_at).toBe(releasedAt)
      expect(result.escrow_released_to).toBe('ext_receiver')
    })
  })
})
