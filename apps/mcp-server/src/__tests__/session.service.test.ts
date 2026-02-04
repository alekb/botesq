import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock config
vi.mock('../config.js', () => ({
  config: {
    session: {
      ttlHours: 24,
    },
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
    },
  },
}))

// Mock prisma
vi.mock('@botesq/database', () => ({
  prisma: {
    agent: {
      upsert: vi.fn(),
    },
    session: {
      create: vi.fn(),
      update: vi.fn(),
    },
    matter: {
      count: vi.fn(),
    },
  },
}))

// Mock auth service
vi.mock('../services/auth.service.js', () => ({
  validateApiKey: vi.fn(),
}))

import { prisma } from '@botesq/database'
import { validateApiKey } from '../services/auth.service.js'
import { startSession, getSessionInfo, endSession } from '../services/session.service.js'
import { AuthError } from '../types.js'

describe('session.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('startSession', () => {
    const mockApiKey = {
      id: 'key_123',
      keyHash: 'hashed_key',
      status: 'ACTIVE',
      operator: {
        id: 'op_123',
        companyName: 'Test Company',
        creditBalance: 5000,
        status: 'ACTIVE',
      },
    }

    it('should validate API key before creating session', async () => {
      vi.mocked(validateApiKey).mockResolvedValue(mockApiKey as never)
      vi.mocked(prisma.session.create).mockResolvedValue({
        id: 'sess_123',
        token: 'sess_abc123',
        expiresAt: new Date(Date.now() + 86400000),
      } as never)

      await startSession({ api_key: 'be_test_key' })

      expect(validateApiKey).toHaveBeenCalledWith('be_test_key')
    })

    it('should throw AuthError for invalid API key', async () => {
      vi.mocked(validateApiKey).mockRejectedValue(
        new AuthError('INVALID_API_KEY', 'Invalid API key')
      )

      await expect(startSession({ api_key: 'invalid_key' })).rejects.toThrow(AuthError)
      await expect(startSession({ api_key: 'invalid_key' })).rejects.toThrow('Invalid API key')
    })

    it('should create session with unique token', async () => {
      vi.mocked(validateApiKey).mockResolvedValue(mockApiKey as never)
      vi.mocked(prisma.session.create).mockResolvedValue({
        id: 'sess_123',
        token: 'sess_randomtoken123',
        expiresAt: new Date(Date.now() + 86400000),
      } as never)

      const result = await startSession({ api_key: 'be_test_key' })

      expect(result.session_token).toMatch(/^sess_/)
      expect(prisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: expect.stringMatching(/^sess_/),
          apiKeyId: 'key_123',
          expiresAt: expect.any(Date),
        }),
      })
    })

    it('should set session expiry based on config TTL', async () => {
      vi.mocked(validateApiKey).mockResolvedValue(mockApiKey as never)

      const beforeCreate = Date.now()
      vi.mocked(prisma.session.create).mockImplementation((async ({
        data,
      }: {
        data: { expiresAt?: Date; token?: string }
      }) => {
        const expiresAt = data.expiresAt as Date
        // Should be approximately 24 hours from now (config.session.ttlHours = 24)
        const expectedExpiry = beforeCreate + 24 * 60 * 60 * 1000
        expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 1000)
        expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry + 1000)
        return {
          id: 'sess_123',
          token: data.token,
          expiresAt,
        }
      }) as never)

      await startSession({ api_key: 'be_test_key' })
    })

    it('should return operator info and credit balance', async () => {
      vi.mocked(validateApiKey).mockResolvedValue(mockApiKey as never)
      vi.mocked(prisma.session.create).mockResolvedValue({
        id: 'sess_123',
        token: 'sess_abc',
        expiresAt: new Date(Date.now() + 86400000),
      } as never)

      const result = await startSession({ api_key: 'be_test_key' })

      expect(result.operator).toEqual({
        id: 'op_123',
        name: 'Test Company',
      })
      expect(result.credits).toEqual({
        balance: 5000,
        currency: 'credits',
      })
    })

    it('should return rate limit info', async () => {
      vi.mocked(validateApiKey).mockResolvedValue(mockApiKey as never)
      vi.mocked(prisma.session.create).mockResolvedValue({
        id: 'sess_123',
        token: 'sess_abc',
        expiresAt: new Date(Date.now() + 86400000),
      } as never)

      const result = await startSession({ api_key: 'be_test_key' })

      expect(result.rate_limits).toEqual({
        requests_per_minute: 60,
        requests_per_hour: 1000,
      })
    })

    it('should create agent if agent_identifier provided', async () => {
      vi.mocked(validateApiKey).mockResolvedValue(mockApiKey as never)
      vi.mocked(prisma.agent.upsert).mockResolvedValue({
        id: 'agent_123',
        operatorId: 'op_123',
        identifier: 'my-agent',
      } as never)
      vi.mocked(prisma.session.create).mockResolvedValue({
        id: 'sess_123',
        token: 'sess_abc',
        expiresAt: new Date(Date.now() + 86400000),
      } as never)

      await startSession({ api_key: 'be_test_key', agent_identifier: 'my-agent' })

      expect(prisma.agent.upsert).toHaveBeenCalledWith({
        where: {
          operatorId_identifier: {
            operatorId: 'op_123',
            identifier: 'my-agent',
          },
        },
        update: {
          lastSeenAt: expect.any(Date),
        },
        create: {
          operatorId: 'op_123',
          identifier: 'my-agent',
        },
      })
    })

    it('should link agent to session if agent_identifier provided', async () => {
      vi.mocked(validateApiKey).mockResolvedValue(mockApiKey as never)
      vi.mocked(prisma.agent.upsert).mockResolvedValue({
        id: 'agent_456',
        operatorId: 'op_123',
        identifier: 'my-agent',
      } as never)
      vi.mocked(prisma.session.create).mockResolvedValue({
        id: 'sess_123',
        token: 'sess_abc',
        expiresAt: new Date(Date.now() + 86400000),
      } as never)

      await startSession({ api_key: 'be_test_key', agent_identifier: 'my-agent' })

      expect(prisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          agentId: 'agent_456',
        }),
      })
    })

    it('should NOT create agent if agent_identifier not provided', async () => {
      vi.mocked(validateApiKey).mockResolvedValue(mockApiKey as never)
      vi.mocked(prisma.session.create).mockResolvedValue({
        id: 'sess_123',
        token: 'sess_abc',
        expiresAt: new Date(Date.now() + 86400000),
      } as never)

      await startSession({ api_key: 'be_test_key' })

      expect(prisma.agent.upsert).not.toHaveBeenCalled()
      expect(prisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          agentId: undefined,
        }),
      })
    })

    it('should update existing agent lastSeenAt on reconnect', async () => {
      vi.mocked(validateApiKey).mockResolvedValue(mockApiKey as never)
      vi.mocked(prisma.agent.upsert).mockResolvedValue({
        id: 'agent_existing',
        operatorId: 'op_123',
        identifier: 'my-agent',
        lastSeenAt: new Date(),
      } as never)
      vi.mocked(prisma.session.create).mockResolvedValue({
        id: 'sess_123',
        token: 'sess_abc',
        expiresAt: new Date(Date.now() + 86400000),
      } as never)

      await startSession({ api_key: 'be_test_key', agent_identifier: 'my-agent' })

      expect(prisma.agent.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            lastSeenAt: expect.any(Date),
          },
        })
      )
    })
  })

  describe('getSessionInfo', () => {
    const mockSession = {
      id: 'sess_123',
      expiresAt: new Date(Date.now() + 3600000),
      requestCount: 25,
    }

    const mockOperator = {
      id: 'op_123',
      companyName: 'Test Company',
      creditBalance: 5000,
    }

    it('should return session info with active matter count', async () => {
      vi.mocked(prisma.matter.count).mockResolvedValue(3)

      const result = await getSessionInfo('sess_token', mockSession, mockOperator)

      expect(result.active_matters).toBe(3)
      expect(prisma.matter.count).toHaveBeenCalledWith({
        where: {
          operatorId: 'op_123',
          status: { in: ['ACTIVE', 'PENDING_RETAINER'] },
        },
      })
    })

    it('should return operator info', async () => {
      vi.mocked(prisma.matter.count).mockResolvedValue(0)

      const result = await getSessionInfo('sess_token', mockSession, mockOperator)

      expect(result.operator).toEqual({
        id: 'op_123',
        name: 'Test Company',
      })
    })

    it('should return credit balance', async () => {
      vi.mocked(prisma.matter.count).mockResolvedValue(0)

      const result = await getSessionInfo('sess_token', mockSession, mockOperator)

      expect(result.credits).toEqual({
        balance: 5000,
      })
    })

    it('should return request counts capped at rate limits', async () => {
      vi.mocked(prisma.matter.count).mockResolvedValue(0)

      // Session with high request count
      const highRequestSession = {
        ...mockSession,
        requestCount: 2000, // More than hourly limit
      }

      const result = await getSessionInfo('sess_token', highRequestSession, mockOperator)

      // Should be capped at rate limits
      expect(result.requests_this_minute).toBe(60)
      expect(result.requests_this_hour).toBe(1000)
    })

    it('should return actual request counts when below limits', async () => {
      vi.mocked(prisma.matter.count).mockResolvedValue(0)

      const result = await getSessionInfo('sess_token', mockSession, mockOperator)

      expect(result.requests_this_minute).toBe(25)
      expect(result.requests_this_hour).toBe(25)
    })

    it('should return session expiry time', async () => {
      vi.mocked(prisma.matter.count).mockResolvedValue(0)

      const result = await getSessionInfo('sess_token', mockSession, mockOperator)

      expect(result.expires_at).toBe(mockSession.expiresAt.toISOString())
    })

    it('should return session ID', async () => {
      vi.mocked(prisma.matter.count).mockResolvedValue(0)

      const result = await getSessionInfo('sess_token', mockSession, mockOperator)

      expect(result.session_id).toBe('sess_123')
    })
  })

  describe('endSession', () => {
    it('should mark session as ended', async () => {
      vi.mocked(prisma.session.update).mockResolvedValue({} as never)

      await endSession('sess_123')

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 'sess_123' },
        data: { endedAt: expect.any(Date) },
      })
    })

    it('should set endedAt to current time', async () => {
      const beforeEnd = new Date()

      vi.mocked(prisma.session.update).mockImplementation((async ({
        data,
      }: {
        data: { endedAt?: Date }
      }) => {
        const endedAt = data.endedAt as Date
        expect(endedAt.getTime()).toBeGreaterThanOrEqual(beforeEnd.getTime())
        expect(endedAt.getTime()).toBeLessThanOrEqual(Date.now())
        return {}
      }) as never)

      await endSession('sess_123')
    })
  })
})

describe('session token generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate unique tokens on each session', async () => {
    const mockApiKey = {
      id: 'key_123',
      operator: {
        id: 'op_123',
        companyName: 'Test Company',
        creditBalance: 5000,
        status: 'ACTIVE',
      },
    }

    vi.mocked(validateApiKey).mockResolvedValue(mockApiKey as never)

    const tokens: string[] = []
    vi.mocked(prisma.session.create).mockImplementation((async ({
      data,
    }: {
      data: { token?: string; expiresAt?: Date }
    }) => {
      tokens.push(data.token as string)
      return {
        id: 'sess_' + tokens.length,
        token: data.token,
        expiresAt: data.expiresAt,
      }
    }) as never)

    // Create multiple sessions
    await startSession({ api_key: 'be_test_key' })
    await startSession({ api_key: 'be_test_key' })
    await startSession({ api_key: 'be_test_key' })

    // All tokens should be unique
    const uniqueTokens = new Set(tokens)
    expect(uniqueTokens.size).toBe(3)
  })

  it('should generate tokens with correct prefix format', async () => {
    const mockApiKey = {
      id: 'key_123',
      operator: {
        id: 'op_123',
        companyName: 'Test Company',
        creditBalance: 5000,
        status: 'ACTIVE',
      },
    }

    vi.mocked(validateApiKey).mockResolvedValue(mockApiKey as never)

    let capturedToken = ''
    vi.mocked(prisma.session.create).mockImplementation((async ({
      data,
    }: {
      data: { token?: string; expiresAt?: Date }
    }) => {
      capturedToken = data.token as string
      return {
        id: 'sess_123',
        token: data.token,
        expiresAt: data.expiresAt,
      }
    }) as never)

    await startSession({ api_key: 'be_test_key' })

    // Token should start with 'sess_' and have sufficient randomness
    expect(capturedToken).toMatch(/^sess_[A-Za-z0-9_-]+$/)
    expect(capturedToken.length).toBeGreaterThan(10)
  })
})
