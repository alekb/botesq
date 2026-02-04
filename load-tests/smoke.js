import http from 'k6/http'
import { check, sleep } from 'k6'

// Smoke test configuration - light load to verify system works
export const options = {
  vus: 5, // 5 virtual users
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be < 500ms
    http_req_failed: ['rate<0.01'], // Error rate should be < 1%
  },
}

const BASE_URL = __ENV.BASE_URL || 'https://botesq.com'

export default function () {
  // Test home page
  const homeResponse = http.get(`${BASE_URL}/`)
  check(homeResponse, {
    'home page status is 200': (r) => r.status === 200,
    'home page loads in < 1s': (r) => r.timings.duration < 1000,
  })

  sleep(1)

  // Test health endpoint
  const healthResponse = http.get(`${BASE_URL}/api/health`)
  check(healthResponse, {
    'health endpoint status is 200': (r) => r.status === 200,
    'health endpoint returns JSON': (r) =>
      r.headers['Content-Type'].includes('application/json'),
  })

  sleep(1)

  // Test features page
  const featuresResponse = http.get(`${BASE_URL}/features`)
  check(featuresResponse, {
    'features page status is 200': (r) => r.status === 200,
  })

  sleep(1)

  // Test pricing page
  const pricingResponse = http.get(`${BASE_URL}/pricing`)
  check(pricingResponse, {
    'pricing page status is 200': (r) => r.status === 200,
  })

  sleep(1)

  // Test docs page
  const docsResponse = http.get(`${BASE_URL}/docs`)
  check(docsResponse, {
    'docs page status is 200': (r) => r.status === 200,
  })

  sleep(1)
}
