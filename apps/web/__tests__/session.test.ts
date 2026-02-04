import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
vi.mock('@botesq/database', () => ({
  prisma: {
    operatorSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

// Mock tokens module
vi.mock('../lib/auth/tokens', () => ({
  generateToken: vi.fn().mockReturnValue('mock_session_token_abc123'),
  hashToken: vi.fn().mockReturnValue('hashed_mock_token'),
}))

// Mock cookies module
vi.mock('../lib/auth/cookies', () => ({
  getSessionToken: vi.fn(),
  setSessionCookie: vi.fn(),
  deleteSessionCookie: vi.fn(),
}))

import { prisma } from '@botesq/database'
import { generateToken, hashToken } from '../lib/auth/tokens'
import { getSessionToken, setSessionCookie, deleteSessionCookie } from '../lib/auth/cookies'
import {
  createSession,
  validateSession,
  getCurrentSession,
  invalidateSession,
  invalidateAllSessions,
  cleanupExpiredSessions,
} from '../lib/auth/session'

describe('session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSession', () => {
    it('should generate a unique session token', async () => {
      vi.mocked(prisma.operatorSession.create).mockResolvedValue({
        id: 'sess_123',
        operatorId: 'op_123',
        token: 'hashed_mock_token',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      } as never)

      const result = await createSession('op_123')

      expect(generateToken).toHaveBeenCalled()
      expect(result.token).toBe('mock_session_token_abc123')
    })

    it('should store hashed token in database', async () => {
      vi.mocked(prisma.operatorSession.create).mockResolvedValue({
        id: 'sess_123',
        operatorId: 'op_123',
        token: 'hashed_mock_token',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      } as never)

      await createSession('op_123')

      expect(hashToken).toHaveBeenCalledWith('mock_session_token_abc123')
      expect(prisma.operatorSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: 'hashed_mock_token',
        }),
      })
    })

    it('should set session expiry to 30 days', async () => {
      const beforeCreate = Date.now()

      vi.mocked(prisma.operatorSession.create).mockImplementation(async ({ data }) => {
        const expiresAt = data.expiresAt as Date
        const expectedExpiry = beforeCreate + 30 * 24 * 60 * 60 * 1000
        // Should be approximately 30 days from now
        expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 1000)
        expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry + 1000)
        return {
          id: 'sess_123',
          operatorId: data.operatorId,
          token: data.token,
          expiresAt,
        } as never
      })

      await createSession('op_123')
    })

    it('should set session cookie with raw token', async () => {
      vi.mocked(prisma.operatorSession.create).mockResolvedValue({
        id: 'sess_123',
        operatorId: 'op_123',
        token: 'hashed_mock_token',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      } as never)

      await createSession('op_123')

      // Should set cookie with raw token (not hashed)
      expect(setSessionCookie).toHaveBeenCalledWith('mock_session_token_abc123', expect.any(Date))
    })

    it('should store IP address and user agent if provided', async () => {
      vi.mocked(prisma.operatorSession.create).mockResolvedValue({
        id: 'sess_123',
        operatorId: 'op_123',
        token: 'hashed_mock_token',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      } as never)

      await createSession('op_123', '192.168.1.1', 'Mozilla/5.0')

      expect(prisma.operatorSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        }),
      })
    })
  })

  describe('validateSession', () => {
    const mockSession = {
      id: 'sess_123',
      operatorId: 'op_123',
      token: 'hashed_mock_token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      operator: {
        id: 'op_123',
        email: 'test@example.com',
        status: 'ACTIVE',
      },
    }

    it('should return session and operator for valid token', async () => {
      vi.mocked(prisma.operatorSession.findUnique).mockResolvedValue(mockSession as never)

      const result = await validateSession('raw_token')

      expect(result.session).not.toBeNull()
      expect(result.operator).not.toBeNull()
      expect(result.operator?.id).toBe('op_123')
    })

    it('should hash token before database lookup', async () => {
      vi.mocked(prisma.operatorSession.findUnique).mockResolvedValue(mockSession as never)

      await validateSession('raw_token')

      expect(hashToken).toHaveBeenCalledWith('raw_token')
      expect(prisma.operatorSession.findUnique).toHaveBeenCalledWith({
        where: { token: 'hashed_mock_token' },
        include: { operator: true },
      })
    })

    it('should return null for non-existent session', async () => {
      vi.mocked(prisma.operatorSession.findUnique).mockResolvedValue(null)

      const result = await validateSession('invalid_token')

      expect(result.session).toBeNull()
      expect(result.operator).toBeNull()
    })

    it('should delete and return null for expired session', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000), // Already expired
      }
      vi.mocked(prisma.operatorSession.findUnique).mockResolvedValue(expiredSession as never)

      const result = await validateSession('expired_token')

      expect(prisma.operatorSession.delete).toHaveBeenCalledWith({ where: { id: 'sess_123' } })
      expect(result.session).toBeNull()
      expect(result.operator).toBeNull()
    })

    it('should return null for inactive operator', async () => {
      const suspendedSession = {
        ...mockSession,
        operator: {
          ...mockSession.operator,
          status: 'SUSPENDED',
        },
      }
      vi.mocked(prisma.operatorSession.findUnique).mockResolvedValue(suspendedSession as never)

      const result = await validateSession('suspended_operator_token')

      expect(result.session).toBeNull()
      expect(result.operator).toBeNull()
    })

    it('should return null for closed operator account', async () => {
      const closedSession = {
        ...mockSession,
        operator: {
          ...mockSession.operator,
          status: 'CLOSED',
        },
      }
      vi.mocked(prisma.operatorSession.findUnique).mockResolvedValue(closedSession as never)

      const result = await validateSession('closed_operator_token')

      expect(result.session).toBeNull()
      expect(result.operator).toBeNull()
    })

    it('should return null for pending verification operator', async () => {
      const pendingSession = {
        ...mockSession,
        operator: {
          ...mockSession.operator,
          status: 'PENDING_VERIFICATION',
        },
      }
      vi.mocked(prisma.operatorSession.findUnique).mockResolvedValue(pendingSession as never)

      const result = await validateSession('pending_operator_token')

      expect(result.session).toBeNull()
      expect(result.operator).toBeNull()
    })
  })

  describe('getCurrentSession', () => {
    it('should return null if no session cookie', async () => {
      vi.mocked(getSessionToken).mockResolvedValue(null)

      const result = await getCurrentSession()

      expect(result.session).toBeNull()
      expect(result.operator).toBeNull()
    })

    it('should validate session from cookie', async () => {
      vi.mocked(getSessionToken).mockResolvedValue('raw_cookie_token')
      vi.mocked(prisma.operatorSession.findUnique).mockResolvedValue({
        id: 'sess_123',
        operatorId: 'op_123',
        token: 'hashed',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        operator: {
          id: 'op_123',
          status: 'ACTIVE',
        },
      } as never)

      const result = await getCurrentSession()

      expect(result.session).not.toBeNull()
      expect(result.operator).not.toBeNull()
    })
  })

  describe('invalidateSession', () => {
    it('should delete session from database', async () => {
      vi.mocked(prisma.operatorSession.delete).mockResolvedValue({} as never)

      await invalidateSession('sess_123')

      expect(prisma.operatorSession.delete).toHaveBeenCalledWith({ where: { id: 'sess_123' } })
    })

    it('should delete session cookie', async () => {
      vi.mocked(prisma.operatorSession.delete).mockResolvedValue({} as never)

      await invalidateSession('sess_123')

      expect(deleteSessionCookie).toHaveBeenCalled()
    })

    it('should not throw if session already deleted', async () => {
      vi.mocked(prisma.operatorSession.delete).mockRejectedValue(new Error('Not found'))

      // Should not throw
      await expect(invalidateSession('nonexistent')).resolves.not.toThrow()
    })
  })

  describe('invalidateAllSessions', () => {
    it('should delete all sessions for operator', async () => {
      vi.mocked(prisma.operatorSession.deleteMany).mockResolvedValue({ count: 3 })

      await invalidateAllSessions('op_123')

      expect(prisma.operatorSession.deleteMany).toHaveBeenCalledWith({
        where: { operatorId: 'op_123' },
      })
    })

    it('should delete session cookie', async () => {
      vi.mocked(prisma.operatorSession.deleteMany).mockResolvedValue({ count: 1 })

      await invalidateAllSessions('op_123')

      expect(deleteSessionCookie).toHaveBeenCalled()
    })
  })

  describe('cleanupExpiredSessions', () => {
    it('should delete all expired sessions', async () => {
      vi.mocked(prisma.operatorSession.deleteMany).mockResolvedValue({ count: 5 })

      const count = await cleanupExpiredSessions()

      expect(count).toBe(5)
      expect(prisma.operatorSession.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      })
    })

    it('should return count of deleted sessions', async () => {
      vi.mocked(prisma.operatorSession.deleteMany).mockResolvedValue({ count: 10 })

      const count = await cleanupExpiredSessions()

      expect(count).toBe(10)
    })
  })
})
