import http from 'k6/http'
import { check, sleep } from 'k6'

// Stress test configuration - ramp up load to find breaking point
export const options = {
  stages: [
    { duration: '1m', target: 10 }, // Ramp up to 10 users over 1 minute
    { duration: '2m', target: 10 }, // Stay at 10 users for 2 minutes
    { duration: '1m', target: 25 }, // Ramp up to 25 users over 1 minute
    { duration: '2m', target: 25 }, // Stay at 25 users for 2 minutes
    { duration: '1m', target: 50 }, // Ramp up to 50 users over 1 minute
    { duration: '2m', target: 50 }, // Stay at 50 users for 2 minutes
    { duration: '2m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be < 2s under load
    http_req_failed: ['rate<0.05'], // Error rate should be < 5% under stress
  },
}

const BASE_URL = __ENV.BASE_URL || 'https://botesq.com'

export default function () {
  // Mix of page loads and API calls
  const pages = ['/', '/features', '/pricing', '/docs', '/login']

  // Random page load
  const page = pages[Math.floor(Math.random() * pages.length)]
  const pageResponse = http.get(`${BASE_URL}${page}`)
  check(pageResponse, {
    'page status is 200': (r) => r.status === 200,
  })

  sleep(Math.random() * 2 + 0.5) // Random sleep 0.5-2.5s

  // Health check
  const healthResponse = http.get(`${BASE_URL}/api/health`)
  check(healthResponse, {
    'health status is 200': (r) => r.status === 200,
  })

  sleep(Math.random() * 2 + 0.5)
}
