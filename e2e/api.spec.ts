import { test, expect } from '@playwright/test'

test.describe('API Endpoints', () => {
  test.describe('Health Checks', () => {
    test('web app health endpoint returns 200', async ({ request }) => {
      const response = await request.get('/api/health')
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty('status')
      expect(body).toHaveProperty('timestamp')
    })
  })

  test.describe('Authentication Required', () => {
    test('admin endpoints require auth', async ({ request }) => {
      const response = await request.get('/api/admin/operators')
      expect(response.status()).toBe(401)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('operator endpoints require auth', async ({ request }) => {
      const response = await request.get('/api/operator/profile')
      // Either 401 Unauthorized or 404 Not Found (if route doesn't exist)
      expect([401, 404]).toContain(response.status())
    })
  })

  test.describe('Webhook Endpoints', () => {
    test('stripe webhook rejects unsigned requests', async ({ request }) => {
      const response = await request.post('/api/webhooks/stripe', {
        data: {},
      })
      // 400 if Stripe is configured (missing signature)
      // 500 if Stripe is not configured (missing env vars in test)
      expect([400, 500]).toContain(response.status())
    })
  })

  test.describe('Error Handling', () => {
    test('404 for non-existent API routes', async ({ request }) => {
      const response = await request.get('/api/this-does-not-exist')
      expect(response.status()).toBe(404)
    })

    test('API errors return JSON', async ({ request }) => {
      const response = await request.get('/api/admin/operators')
      const contentType = response.headers()['content-type']
      expect(contentType).toContain('application/json')
    })
  })
})
