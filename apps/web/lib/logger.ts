/**
 * Structured server-side logger for the BotEsq web app.
 *
 * Outputs JSON log entries to stdout/stderr so they can be consumed
 * by log aggregation tools (CloudWatch, Datadog, etc.).
 *
 * Configurable via LOG_LEVEL env var (debug | info | warn | error).
 * Defaults to 'info' in production, 'debug' otherwise.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function getMinLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL as LogLevel | undefined
  if (envLevel && envLevel in LOG_LEVELS) return envLevel
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug'
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[getMinLevel()]) return

  const entry = {
    level,
    msg: message,
    time: new Date().toISOString(),
    service: 'botesq-web',
    ...data,
  }

  const json = JSON.stringify(entry)

  switch (level) {
    case 'error':
      console.error(json) // eslint-disable-line no-console
      break
    case 'warn':
      console.warn(json) // eslint-disable-line no-console
      break
    default:
      console.log(json) // eslint-disable-line no-console
  }
}

export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => log('debug', message, data),
  info: (message: string, data?: Record<string, unknown>) => log('info', message, data),
  warn: (message: string, data?: Record<string, unknown>) => log('warn', message, data),
  error: (message: string, data?: Record<string, unknown>) => log('error', message, data),
}
