import { config } from '../config.js'
import { RateLimitError } from '../types.js'

// Simple in-memory rate limiter
// In production, use Redis for distributed rate limiting
interface RateLimitEntry {
  count: number
  resetAt: number
}

const minuteWindows = new Map<string, RateLimitEntry>()
const hourWindows = new Map<string, RateLimitEntry>()

/**
 * Check rate limits for a session
 * Throws RateLimitError if limits exceeded
 */
export function checkRateLimit(sessionToken: string): void {
  const now = Date.now()

  // Check minute window
  const minuteKey = `${sessionToken}:minute`
  const minuteEntry = minuteWindows.get(minuteKey)

  if (minuteEntry) {
    if (now < minuteEntry.resetAt) {
      if (minuteEntry.count >= config.rateLimit.requestsPerMinute) {
        const retryAfter = Math.ceil((minuteEntry.resetAt - now) / 1000)
        throw new RateLimitError(retryAfter)
      }
      minuteEntry.count++
    } else {
      // Reset window
      minuteWindows.set(minuteKey, { count: 1, resetAt: now + 60000 })
    }
  } else {
    minuteWindows.set(minuteKey, { count: 1, resetAt: now + 60000 })
  }

  // Check hour window
  const hourKey = `${sessionToken}:hour`
  const hourEntry = hourWindows.get(hourKey)

  if (hourEntry) {
    if (now < hourEntry.resetAt) {
      if (hourEntry.count >= config.rateLimit.requestsPerHour) {
        const retryAfter = Math.ceil((hourEntry.resetAt - now) / 1000)
        throw new RateLimitError(retryAfter)
      }
      hourEntry.count++
    } else {
      // Reset window
      hourWindows.set(hourKey, { count: 1, resetAt: now + 3600000 })
    }
  } else {
    hourWindows.set(hourKey, { count: 1, resetAt: now + 3600000 })
  }
}

/**
 * Get current rate limit status for a session
 */
export function getRateLimitStatus(sessionToken: string): {
  minute: { remaining: number; resetAt: number }
  hour: { remaining: number; resetAt: number }
} {
  const now = Date.now()

  const minuteEntry = minuteWindows.get(`${sessionToken}:minute`)
  const hourEntry = hourWindows.get(`${sessionToken}:hour`)

  return {
    minute: {
      remaining:
        minuteEntry && now < minuteEntry.resetAt
          ? Math.max(0, config.rateLimit.requestsPerMinute - minuteEntry.count)
          : config.rateLimit.requestsPerMinute,
      resetAt: minuteEntry?.resetAt ?? now + 60000,
    },
    hour: {
      remaining:
        hourEntry && now < hourEntry.resetAt
          ? Math.max(0, config.rateLimit.requestsPerHour - hourEntry.count)
          : config.rateLimit.requestsPerHour,
      resetAt: hourEntry?.resetAt ?? now + 3600000,
    },
  }
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now()

  for (const [key, entry] of minuteWindows) {
    if (now >= entry.resetAt) {
      minuteWindows.delete(key)
    }
  }

  for (const [key, entry] of hourWindows) {
    if (now >= entry.resetAt) {
      hourWindows.delete(key)
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000)
