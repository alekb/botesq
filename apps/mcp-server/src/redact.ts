// Tool arguments that must never reach logs: credentials and bulk content.
const REDACTED_KEYS = new Set(['api_key', 'session_token', 'content_base64', 'pre_auth_token'])

/**
 * Redact sensitive fields from tool arguments before logging
 */
export function redactArgs(args: unknown): unknown {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    return args
  }

  return Object.fromEntries(
    Object.entries(args as Record<string, unknown>).map(([key, value]) => [
      key,
      REDACTED_KEYS.has(key) ? '[REDACTED]' : value,
    ])
  )
}
