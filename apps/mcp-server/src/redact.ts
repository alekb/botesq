// Tool arguments that must never reach logs: credentials, bulk content, and
// privileged client material (questions, matter details, document notes).
const REDACTED_KEYS = new Set([
  'api_key',
  'session_token',
  'content_base64',
  'pre_auth_token',
  'question',
  'context',
  'description',
  'notes',
  'title',
  'filename',
])

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
