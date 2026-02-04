# BotEsq Load Tests

Load testing scripts using [k6](https://k6.io/).

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6
```

## Available Tests

### Smoke Test (`smoke.js`)

Light load test to verify the system works correctly under minimal load.

- **VUs:** 5 concurrent users
- **Duration:** 30 seconds
- **Thresholds:**
  - 95% of requests < 500ms
  - Error rate < 1%

### Stress Test (`stress.js`)

Gradually increasing load to find system limits.

- **VUs:** Ramps from 10 → 25 → 50 users
- **Duration:** ~11 minutes total
- **Thresholds:**
  - 95% of requests < 2s
  - Error rate < 5%

## Running Tests

### Against Production

```bash
# Smoke test
k6 run smoke.js

# Stress test (use with caution on production!)
k6 run stress.js
```

### Against Staging

```bash
# Smoke test
k6 run -e BASE_URL=https://staging.botesq.com smoke.js

# Stress test
k6 run -e BASE_URL=https://staging.botesq.com stress.js
```

### Against Local Development

```bash
# Start local server first
pnpm dev

# Run tests
k6 run -e BASE_URL=http://localhost:3000 smoke.js
```

### With Docker

```bash
docker run -i grafana/k6 run - < smoke.js
```

## Interpreting Results

k6 outputs metrics including:

- **http_req_duration:** Response time statistics
- **http_req_failed:** Percentage of failed requests
- **http_reqs:** Total requests made
- **vus:** Number of virtual users
- **iterations:** Number of complete test iterations

### Example Output

```
✓ home page status is 200
✓ home page loads in < 1s
✓ health endpoint status is 200

checks.........................: 100.00% ✓ 150 ✗ 0
http_req_duration..............: avg=123ms min=45ms med=98ms max=456ms p(90)=234ms p(95)=345ms
http_req_failed................: 0.00%   ✓ 0   ✗ 150
http_reqs......................: 150     5/s
```

## Thresholds

Tests will fail if thresholds are not met:

| Test   | Metric         | Threshold |
| ------ | -------------- | --------- |
| Smoke  | p(95) duration | < 500ms   |
| Smoke  | Error rate     | < 1%      |
| Stress | p(95) duration | < 2000ms  |
| Stress | Error rate     | < 5%      |

## Adding New Tests

Create a new `.js` file following the k6 script format:

```javascript
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 10,
  duration: '30s',
}

export default function () {
  const response = http.get('https://botesq.com/')
  check(response, {
    'status is 200': (r) => r.status === 200,
  })
  sleep(1)
}
```

## CI Integration

Add to GitHub Actions:

```yaml
- name: Run load tests
  uses: grafana/k6-action@v0.3.0
  with:
    filename: load-tests/smoke.js
  env:
    BASE_URL: https://staging.botesq.com
```
