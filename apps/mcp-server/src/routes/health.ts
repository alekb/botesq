import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@botesq/database'
import { logger } from '../lib/logger.js'

/**
 * Health check status
 */
type HealthStatus = 'healthy' | 'unhealthy' | 'degraded'

/**
 * Individual check result
 */
interface CheckResult {
  status: HealthStatus
  latency?: number
  message?: string
}

/**
 * Health check response
 */
interface HealthResponse {
  status: HealthStatus
  checks: {
    database?: CheckResult
    memory?: CheckResult
    uptime?: CheckResult
  }
  timestamp: string
  version: string
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now()

  try {
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - start

    return {
      status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'unhealthy',
      latency,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error'
    logger.error({ error }, 'Database health check failed')

    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      message,
    }
  }
}

/**
 * Check memory usage
 */
function checkMemory(): CheckResult {
  const usage = process.memoryUsage()
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024)
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024)
  const usagePercent = Math.round((usage.heapUsed / usage.heapTotal) * 100)

  // Consider unhealthy if using more than 90% of heap
  const status: HealthStatus =
    usagePercent < 70 ? 'healthy' : usagePercent < 90 ? 'degraded' : 'unhealthy'

  return {
    status,
    message: `${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent}%)`,
  }
}

/**
 * Get uptime check
 */
function checkUptime(): CheckResult {
  const uptimeSeconds = process.uptime()
  const uptimeMinutes = Math.floor(uptimeSeconds / 60)
  const uptimeHours = Math.floor(uptimeMinutes / 60)
  const uptimeDays = Math.floor(uptimeHours / 24)

  let message: string
  if (uptimeDays > 0) {
    message = `${uptimeDays}d ${uptimeHours % 24}h`
  } else if (uptimeHours > 0) {
    message = `${uptimeHours}h ${uptimeMinutes % 60}m`
  } else {
    message = `${uptimeMinutes}m ${Math.floor(uptimeSeconds % 60)}s`
  }

  return {
    status: 'healthy',
    message,
  }
}

/**
 * Determine overall health status from individual checks
 */
function getOverallStatus(checks: HealthResponse['checks']): HealthStatus {
  const statuses = Object.values(checks).map((c) => c?.status)

  if (statuses.some((s) => s === 'unhealthy')) {
    return 'unhealthy'
  }

  if (statuses.some((s) => s === 'degraded')) {
    return 'degraded'
  }

  return 'healthy'
}

/**
 * Register health check routes
 */
export function registerHealthRoutes(app: FastifyInstance): void {
  const version = process.env.npm_package_version ?? '0.0.1'

  /**
   * GET /health — Basic liveness check
   *
   * Returns 200 if the server is running.
   * This is a lightweight check for load balancers.
   */
  app.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    const response: HealthResponse = {
      status: 'healthy',
      checks: {
        uptime: checkUptime(),
      },
      timestamp: new Date().toISOString(),
      version,
    }

    return reply.status(200).send(response)
  })

  /**
   * GET /health/ready — Readiness check
   *
   * Returns 200 if the server is ready to handle requests.
   * Checks database connectivity and other dependencies.
   * Used by orchestrators to determine if traffic should be routed.
   */
  app.get('/health/ready', async (_request: FastifyRequest, reply: FastifyReply) => {
    const [databaseCheck] = await Promise.all([checkDatabase()])

    const checks: HealthResponse['checks'] = {
      database: databaseCheck,
      memory: checkMemory(),
      uptime: checkUptime(),
    }

    const status = getOverallStatus(checks)

    const response: HealthResponse = {
      status,
      checks,
      timestamp: new Date().toISOString(),
      version,
    }

    // Return 503 if unhealthy, 200 otherwise
    const statusCode = status === 'unhealthy' ? 503 : 200

    return reply.status(statusCode).send(response)
  })

  /**
   * GET /health/live — Kubernetes liveness probe
   *
   * Simple check that returns 200 if the process is alive.
   * Unlike /health/ready, this doesn't check dependencies.
   */
  app.get('/health/live', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({ status: 'ok' })
  })

  logger.info('Health check routes registered: /health, /health/ready, /health/live')
}
