import pino, { type Logger, type LoggerOptions } from 'pino'
import { config } from '../config.js'
import { randomBytes } from 'crypto'

/**
 * Sensitive field patterns to redact from logs
 * These patterns are matched against object keys recursively
 */
const REDACT_PATHS = [
  // API keys and tokens
  'apiKey',
  'api_key',
  'apikey',
  'token',
  'sessionToken',
  'session_token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'bearerToken',
  'bearer_token',

  // Passwords and secrets
  'password',
  'passwd',
  'secret',
  'secretKey',
  'secret_key',
  'privateKey',
  'private_key',

  // Authentication headers
  'authorization',
  'Authorization',
  'x-api-key',
  'X-Api-Key',

  // Sensitive personal data
  'email',
  'ssn',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',

  // AWS credentials
  'aws_access_key_id',
  'aws_secret_access_key',

  // Stripe
  'stripeKey',
  'stripe_key',
  'webhookSecret',
  'webhook_secret',

  // Nested paths
  '*.apiKey',
  '*.api_key',
  '*.token',
  '*.password',
  '*.secret',
  '*.authorization',
  '*.Authorization',
  '*.email',
  'headers.authorization',
  'headers.Authorization',
  'headers["x-api-key"]',
  'headers["X-Api-Key"]',
  'body.password',
  'body.apiKey',
  'body.token',
  'args.apiKey',
  'args.api_key',
  'args.token',
  'input.apiKey',
  'input.api_key',
  'input.token',
]

/**
 * Logger configuration options
 */
const loggerOptions: LoggerOptions = {
  level: config.logging?.level ?? (config.env === 'production' ? 'info' : 'debug'),
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
  },
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
      service: 'botesq-mcp-server',
    }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: config.env,
  },
}

// In development, use pino-pretty for human-readable output
if (config.env === 'development') {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  }
}

/**
 * Root logger instance
 * Use this for general application logging
 */
export const logger: Logger = pino(loggerOptions)

/**
 * Generate a unique correlation ID for request tracing
 * Format: 16-character hex string
 */
export function generateCorrelationId(): string {
  return randomBytes(8).toString('hex')
}

/**
 * Create a child logger with correlation ID for request tracing
 * Use this at the start of each request to enable end-to-end tracing
 *
 * @param correlationId - Unique identifier for the request (generates one if not provided)
 * @param context - Additional context to include in all log entries
 */
export function createRequestLogger(
  correlationId?: string,
  context?: Record<string, unknown>
): Logger {
  const id = correlationId ?? generateCorrelationId()
  return logger.child({
    correlationId: id,
    ...context,
  })
}

/**
 * Create a child logger for a specific service/module
 * Use this to add context about which part of the system is logging
 *
 * @param serviceName - Name of the service or module
 * @param context - Additional context to include in all log entries
 */
export function createServiceLogger(
  serviceName: string,
  context?: Record<string, unknown>
): Logger {
  return logger.child({
    service: serviceName,
    ...context,
  })
}

/**
 * Log levels for reference
 *
 * trace: Extremely detailed debugging information
 * debug: Debugging information useful during development
 * info: Normal operation, significant events
 * warn: Warning conditions that should be reviewed
 * error: Error conditions that need attention
 * fatal: Critical errors that cause the application to crash
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

/**
 * Request logging middleware data
 */
export interface RequestLogData {
  method: string
  path: string
  statusCode: number
  duration: number
  correlationId: string
  userAgent?: string
  ip?: string
  operatorId?: string
  sessionId?: string
}

/**
 * Log a completed HTTP request
 * Call this at the end of request processing
 */
export function logRequest(data: RequestLogData): void {
  const level = data.statusCode >= 500 ? 'error' : data.statusCode >= 400 ? 'warn' : 'info'

  logger[level](
    {
      type: 'request',
      ...data,
    },
    `${data.method} ${data.path} ${data.statusCode} ${data.duration}ms`
  )
}

/**
 * Log a tool execution
 */
export function logToolExecution(
  correlationId: string,
  toolName: string,
  duration: number,
  success: boolean,
  errorCode?: string
): void {
  const logData = {
    type: 'tool_execution',
    correlationId,
    tool: toolName,
    duration,
    success,
    ...(errorCode && { errorCode }),
  }

  if (success) {
    logger.info(logData, `Tool ${toolName} completed in ${duration}ms`)
  } else {
    logger.warn(logData, `Tool ${toolName} failed with ${errorCode} in ${duration}ms`)
  }
}

// Export pino for advanced usage
export { pino }
export type { Logger }
