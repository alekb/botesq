import { describe, it, expect } from 'vitest'
import { redactArgs } from '../redact.js'

describe('redactArgs', () => {
  it('redacts credentials, bulk content, and privileged client material', () => {
    const result = redactArgs({
      api_key: 'besq_live_secret',
      session_token: 'sess_secret',
      pre_auth_token: 'preauth_secret',
      content_base64: 'AAAA',
      question: 'Is this legal?',
      context: 'privileged background',
      description: 'matter details',
      notes: 'document notes',
      jurisdiction: 'California',
    })

    expect(result).toEqual({
      api_key: '[REDACTED]',
      session_token: '[REDACTED]',
      pre_auth_token: '[REDACTED]',
      content_base64: '[REDACTED]',
      question: '[REDACTED]',
      context: '[REDACTED]',
      description: '[REDACTED]',
      notes: '[REDACTED]',
      jurisdiction: 'California',
    })
  })

  it('passes through non-object values unchanged', () => {
    expect(redactArgs(undefined)).toBeUndefined()
    expect(redactArgs(null)).toBeNull()
    expect(redactArgs('string')).toBe('string')
    expect(redactArgs([1, 2])).toEqual([1, 2])
  })
})
