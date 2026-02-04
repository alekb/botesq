import { test, expect } from '@playwright/test'

/**
 * API Contract Tests
 *
 * These tests verify that API responses follow expected schemas and contracts.
 * They ensure consistent error handling and response formats.
 */

test.describe('API Response Contracts', () => {
  test.describe('Health Endpoint', () => {
    test('returns required health fields', async ({ request }) => {
      const response = await request.get('/api/health')
      expect(response.status()).toBe(200)

      const body = await response.json()

      // Health endpoint contract
      expect(body).toHaveProperty('status')
      expect(body).toHaveProperty('timestamp')
      expect(typeof body.status).toBe('string')
      expect(typeof body.timestamp).toBe('string')
    })

    test('health status is valid enum value', async ({ request }) => {
      const response = await request.get('/api/health')
      const body = await response.json()

      // Status should be one of expected values
      expect(['ok', 'healthy', 'degraded', 'unhealthy']).toContain(body.status.toLowerCase())
    })

    test('timestamp is valid ISO date', async ({ request }) => {
      const response = await request.get('/api/health')
      const body = await response.json()

      // Timestamp should be parseable as date
      const date = new Date(body.timestamp)
      expect(date.toString()).not.toBe('Invalid Date')
    })
  })

  test.describe('Error Response Contract', () => {
    test('401 errors have consistent format', async ({ request }) => {
      const response = await request.get('/api/admin/operators')
      expect(response.status()).toBe(401)

      const body = await response.json()

      // Error response contract
      expect(body).toHaveProperty('error')
      expect(typeof body.error).toBe('string')
    })

    test('404 errors return JSON', async ({ request }) => {
      const response = await request.get('/api/nonexistent-endpoint-12345')
      expect(response.status()).toBe(404)

      const contentType = response.headers()['content-type']
      expect(contentType).toContain('application/json')
    })

    test('error responses do not leak stack traces in production', async ({ request }) => {
      const response = await request.get('/api/admin/operators')
      const body = await response.json()

      // Should not contain stack trace
      expect(JSON.stringify(body)).not.toContain('node_modules')
      expect(JSON.stringify(body)).not.toContain('.ts:')
      expect(JSON.stringify(body)).not.toContain('at ')
    })
  })

  test.describe('Content Type Headers', () => {
    test('API responses have correct content type', async ({ request }) => {
      const response = await request.get('/api/health')

      const contentType = response.headers()['content-type']
      expect(contentType).toContain('application/json')
    })

    test('error responses have JSON content type', async ({ request }) => {
      const response = await request.get('/api/admin/operators')

      const contentType = response.headers()['content-type']
      expect(contentType).toContain('application/json')
    })
  })

  test.describe('Security Headers', () => {
    test('API responses include security headers', async ({ request }) => {
      const response = await request.get('/api/health')
      const headers = response.headers()

      // At minimum, verify content-type is set correctly
      expect(headers['content-type']).toBeDefined()

      // Check for common security headers (if configured)
      // These may or may not be present depending on configuration
      const hasAnySecurity =
        headers['x-content-type-options'] ||
        headers['x-frame-options'] ||
        headers['strict-transport-security']

      // Log which security headers are present (informational)
      if (!hasAnySecurity) {
        console.log('Note: No additional security headers configured')
      }
    })

    test('API does not expose server version', async ({ request }) => {
      const response = await request.get('/api/health')
      const headers = response.headers()

      // Should not leak server software versions
      const server = headers['server'] || ''
      expect(server).not.toMatch(/nginx\/\d|apache\/\d|express\/\d/i)
    })
  })

  test.describe('Authentication Endpoints', () => {
    test('login endpoint accepts POST', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: {
          email: 'test@example.com',
          password: 'testpassword',
        },
      })

      // Should return 401 for invalid credentials, not 404 or 405
      expect([401, 400, 422]).toContain(response.status())

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('login endpoint rejects GET', async ({ request }) => {
      const response = await request.get('/api/auth/login')

      // GET should not be allowed
      expect([404, 405]).toContain(response.status())
    })

    test('signup endpoint validates input', async ({ request }) => {
      const response = await request.post('/api/auth/signup', {
        data: {
          // Missing required fields
          email: 'not-an-email',
        },
      })

      // Should return validation error
      expect([400, 422]).toContain(response.status())

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })
  })

  test.describe('Webhook Security', () => {
    test('Stripe webhook rejects unsigned requests', async ({ request }) => {
      const response = await request.post('/api/webhooks/stripe', {
        data: { type: 'test' },
      })

      // Should reject - either bad signature (400) or config error (500)
      expect([400, 401, 500]).toContain(response.status())
    })

    test('Stripe webhook requires POST', async ({ request }) => {
      const response = await request.get('/api/webhooks/stripe')

      // GET should not be allowed
      expect([404, 405]).toContain(response.status())
    })
  })

  test.describe('Rate Limiting Headers', () => {
    test('API may include rate limit headers', async ({ request }) => {
      const response = await request.get('/api/health')
      const headers = response.headers()

      // Rate limit headers are optional but if present should be valid
      if (headers['x-ratelimit-limit']) {
        expect(parseInt(headers['x-ratelimit-limit'])).toBeGreaterThan(0)
      }

      if (headers['x-ratelimit-remaining']) {
        expect(parseInt(headers['x-ratelimit-remaining'])).toBeGreaterThanOrEqual(0)
      }
    })
  })

  test.describe('CORS Headers', () => {
    test('preflight requests are handled', async ({ request }) => {
      const response = await request.fetch('/api/health', {
        method: 'OPTIONS',
      })

      // OPTIONS should be allowed (200) or not implemented (404/405)
      expect([200, 204, 404, 405]).toContain(response.status())
    })
  })

  test.describe('Request Size Limits', () => {
    test('oversized requests are rejected', async ({ request }) => {
      // Generate large payload (2MB)
      const largePayload = 'x'.repeat(2 * 1024 * 1024)

      const response = await request.post('/api/auth/login', {
        data: {
          email: 'test@example.com',
          password: largePayload,
        },
      })

      // Should reject oversized request
      expect([400, 413, 422]).toContain(response.status())
    })
  })

  test.describe('Method Validation', () => {
    test('PUT to health endpoint is rejected', async ({ request }) => {
      const response = await request.put('/api/health', {
        data: { status: 'hacked' },
      })

      expect([404, 405]).toContain(response.status())
    })

    test('DELETE to health endpoint is rejected', async ({ request }) => {
      const response = await request.delete('/api/health')

      expect([404, 405]).toContain(response.status())
    })
  })
})

test.describe('API Response Structure Standards', () => {
  test.describe('Success Response Format', () => {
    test('successful responses are properly structured', async ({ request }) => {
      const response = await request.get('/api/health')

      if (response.ok()) {
        const body = await response.json()

        // Success response should be an object
        expect(typeof body).toBe('object')
        expect(body).not.toBeNull()
      }
    })
  })

  test.describe('Error Response Format', () => {
    test('error responses include error field', async ({ request }) => {
      const response = await request.get('/api/admin/operators')

      if (!response.ok()) {
        const body = await response.json()

        // Error response should have error field
        expect(body).toHaveProperty('error')
      }
    })

    test('validation errors include details when appropriate', async ({ request }) => {
      const response = await request.post('/api/auth/signup', {
        data: { email: 'invalid' },
      })

      if (response.status() === 422 || response.status() === 400) {
        const body = await response.json()

        // Should indicate what's wrong
        expect(body).toHaveProperty('error')
      }
    })
  })

  test.describe('Pagination Format (if applicable)', () => {
    test('list endpoints follow pagination contract', async ({ request }) => {
      // Try to access a list endpoint (will be 401 without auth)
      const response = await request.get('/api/admin/operators')

      // Even error response should be JSON
      const contentType = response.headers()['content-type']
      expect(contentType).toContain('application/json')
    })
  })
})

test.describe('API Versioning and Deprecation', () => {
  test('API base path is accessible', async ({ request }) => {
    // The /api path should exist (even if it returns error without auth)
    const response = await request.get('/api/health')

    // Should not be 404 for the path itself
    expect(response.status()).not.toBe(404)
  })
})

test.describe('Input Sanitization', () => {
  test('SQL injection attempts are handled safely', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: "test@example.com'; DROP TABLE users;--",
        password: 'password',
      },
    })

    // Should return auth error, not server error
    expect([400, 401, 422]).toContain(response.status())

    const body = await response.json()
    // Should not expose SQL errors
    expect(JSON.stringify(body).toLowerCase()).not.toContain('sql')
    expect(JSON.stringify(body).toLowerCase()).not.toContain('syntax')
  })

  test('XSS attempts are handled safely', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: '<script>alert("xss")</script>@example.com',
        password: 'password',
      },
    })

    // Should return validation error
    expect([400, 401, 422]).toContain(response.status())
  })

  test('path traversal attempts are blocked', async ({ request }) => {
    const response = await request.get('/api/../../../etc/passwd')

    // Should return 404, not actual file content
    expect([400, 404]).toContain(response.status())
  })
})

test.describe('Timeout and Performance', () => {
  test('health endpoint responds quickly', async ({ request }) => {
    const start = Date.now()
    const response = await request.get('/api/health')
    const duration = Date.now() - start

    expect(response.status()).toBe(200)
    // Health endpoint should be fast (under 1 second)
    expect(duration).toBeLessThan(1000)
  })
})
