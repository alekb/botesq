import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import { registerHealthRoutes } from '../routes/health.js'

// Mock the prisma client
vi.mock('@botesq/database', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  },
}))

// Mock the logger
vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

describe('health routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = Fastify()
    registerHealthRoutes(app)
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /health', () => {
    it('returns 200 with healthy status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.status).toBe('healthy')
      expect(body.checks.uptime).toBeDefined()
      expect(body.checks.uptime.status).toBe('healthy')
      expect(body.timestamp).toBeDefined()
      expect(body.version).toBeDefined()
    })

    it('includes uptime message', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      })

      const body = JSON.parse(response.body)
      expect(body.checks.uptime.message).toMatch(/\d+[dhms]/)
    })
  })

  describe('GET /health/ready', () => {
    it('returns 200 when all checks pass', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.status).toBeDefined()
      expect(body.checks.database).toBeDefined()
      expect(body.checks.memory).toBeDefined()
      expect(body.checks.uptime).toBeDefined()
      expect(body.timestamp).toBeDefined()
    })

    it('includes database latency', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      })

      const body = JSON.parse(response.body)
      expect(body.checks.database.latency).toBeDefined()
      expect(typeof body.checks.database.latency).toBe('number')
    })

    it('includes memory usage', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      })

      const body = JSON.parse(response.body)
      expect(body.checks.memory.message).toMatch(/\d+MB \/ \d+MB/)
    })
  })

  describe('GET /health/live', () => {
    it('returns 200 with ok status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/live',
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.status).toBe('ok')
    })
  })

  describe('health status logic', () => {
    it('returns timestamp in ISO format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      })

      const body = JSON.parse(response.body)
      const timestamp = new Date(body.timestamp)
      expect(timestamp.toISOString()).toBe(body.timestamp)
    })
  })
})

describe('health check with database failure', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    // Reset mocks and set up failure scenario
    vi.resetModules()

    vi.doMock('@botesq/database', () => ({
      prisma: {
        $queryRaw: vi.fn().mockRejectedValue(new Error('Connection refused')),
      },
    }))

    vi.doMock('../lib/logger.js', () => ({
      logger: {
        info: vi.fn(),
        error: vi.fn(),
      },
    }))

    // Re-import after mocking
    const { registerHealthRoutes: registerRoutes } = await import('../routes/health.js')

    app = Fastify()
    registerRoutes(app)
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
    vi.resetModules()
  })

  it('returns 503 when database check fails', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health/ready',
    })

    expect(response.statusCode).toBe(503)

    const body = JSON.parse(response.body)
    expect(body.status).toBe('unhealthy')
    expect(body.checks.database.status).toBe('unhealthy')
    expect(body.checks.database.message).toContain('Connection refused')
  })
})
