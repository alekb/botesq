import { NextResponse } from 'next/server'

/**
 * Health check status
 */
type HealthStatus = 'healthy' | 'unhealthy' | 'degraded'

/**
 * Individual check result
 */
interface CheckResult {
  status: HealthStatus
  message?: string
}

/**
 * Health check response
 */
interface HealthResponse {
  status: HealthStatus
  checks: {
    memory?: CheckResult
    uptime?: CheckResult
  }
  timestamp: string
  version: string
}

/**
 * Check memory usage
 */
function checkMemory(): CheckResult {
  // In edge runtime, process.memoryUsage may not be available
  if (typeof process.memoryUsage !== 'function') {
    return {
      status: 'healthy',
      message: 'Memory check not available in edge runtime',
    }
  }

  const usage = process.memoryUsage()
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024)
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024)
  const usagePercent = Math.round((usage.heapUsed / usage.heapTotal) * 100)

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
  // In edge runtime, process.uptime may not be available
  if (typeof process.uptime !== 'function') {
    return {
      status: 'healthy',
      message: 'Uptime check not available in edge runtime',
    }
  }

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
 * GET /api/health - Basic health check endpoint
 *
 * Returns the health status of the web application.
 * Used by load balancers and monitoring systems.
 */
export async function GET() {
  const version = process.env.npm_package_version ?? '0.0.1'

  const checks: HealthResponse['checks'] = {
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

  return NextResponse.json(response, { status: statusCode })
}
