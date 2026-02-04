import { describe, it, expect } from 'vitest'
import { ApiError, AuthError, RateLimitError, PaymentError } from '../types.js'

describe('types', () => {
  describe('ApiError', () => {
    it('should create error with code and message', () => {
      const error = new ApiError('TEST_ERROR', 'Test error message')

      expect(error.code).toBe('TEST_ERROR')
      expect(error.message).toBe('Test error message')
      expect(error.statusCode).toBe(400) // default
      expect(error.name).toBe('ApiError')
    })

    it('should create error with custom status code', () => {
      const error = new ApiError('NOT_FOUND', 'Resource not found', 404)

      expect(error.statusCode).toBe(404)
    })

    it('should create error with details', () => {
      const details = { field: 'email', reason: 'invalid format' }
      const error = new ApiError('VALIDATION_ERROR', 'Validation failed', 400, details)

      expect(error.details).toEqual(details)
    })

    it('should be instanceof Error', () => {
      const error = new ApiError('TEST', 'Test')

      expect(error).toBeInstanceOf(Error)
    })

    it('should have stack trace', () => {
      const error = new ApiError('TEST', 'Test')

      expect(error.stack).toBeDefined()
    })
  })

  describe('AuthError', () => {
    it('should create error with 401 status code', () => {
      const error = new AuthError('INVALID_TOKEN', 'Token is invalid')

      expect(error.code).toBe('INVALID_TOKEN')
      expect(error.message).toBe('Token is invalid')
      expect(error.statusCode).toBe(401)
      expect(error.name).toBe('AuthError')
    })

    it('should be instanceof ApiError', () => {
      const error = new AuthError('TEST', 'Test')

      expect(error).toBeInstanceOf(ApiError)
    })

    it('should be instanceof Error', () => {
      const error = new AuthError('TEST', 'Test')

      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('RateLimitError', () => {
    it('should create error with 429 status code', () => {
      const error = new RateLimitError(30)

      expect(error.statusCode).toBe(429)
      expect(error.name).toBe('RateLimitError')
    })

    it('should have RATE_LIMITED code', () => {
      const error = new RateLimitError(30)

      expect(error.code).toBe('RATE_LIMITED')
    })

    it('should include retry_after_seconds in details', () => {
      const error = new RateLimitError(45)

      expect(error.details).toEqual({ retry_after_seconds: 45 })
    })

    it('should include retry time in message', () => {
      const error = new RateLimitError(60)

      expect(error.message).toContain('60')
      expect(error.message).toContain('seconds')
    })

    it('should be instanceof ApiError', () => {
      const error = new RateLimitError(30)

      expect(error).toBeInstanceOf(ApiError)
    })

    it('should handle various retry times', () => {
      const error1 = new RateLimitError(1)
      expect((error1.details as { retry_after_seconds: number }).retry_after_seconds).toBe(1)

      const error2 = new RateLimitError(3600)
      expect((error2.details as { retry_after_seconds: number }).retry_after_seconds).toBe(3600)
    })
  })

  describe('PaymentError', () => {
    it('should create error with 402 status code', () => {
      const error = new PaymentError('INSUFFICIENT_CREDITS', 'Not enough credits')

      expect(error.code).toBe('INSUFFICIENT_CREDITS')
      expect(error.message).toBe('Not enough credits')
      expect(error.statusCode).toBe(402)
      expect(error.name).toBe('PaymentError')
    })

    it('should be instanceof ApiError', () => {
      const error = new PaymentError('TEST', 'Test')

      expect(error).toBeInstanceOf(ApiError)
    })

    it('should be instanceof Error', () => {
      const error = new PaymentError('TEST', 'Test')

      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('Error inheritance chain', () => {
    it('should allow catching all custom errors as ApiError', () => {
      const errors = [
        new ApiError('API', 'api error'),
        new AuthError('AUTH', 'auth error'),
        new RateLimitError(30),
        new PaymentError('PAYMENT', 'payment error'),
      ]

      for (const error of errors) {
        expect(error).toBeInstanceOf(ApiError)
      }
    })

    it('should allow catching all errors as Error', () => {
      const errors = [
        new ApiError('API', 'api error'),
        new AuthError('AUTH', 'auth error'),
        new RateLimitError(30),
        new PaymentError('PAYMENT', 'payment error'),
      ]

      for (const error of errors) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    it('should preserve error type with try/catch', () => {
      try {
        throw new RateLimitError(30)
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError)
        expect(error).toBeInstanceOf(ApiError)
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe('Error serialization', () => {
    it('should have enumerable properties for JSON serialization', () => {
      const error = new ApiError('TEST', 'Test message', 400, { foo: 'bar' })

      const json = JSON.stringify(error)
      const parsed = JSON.parse(json)

      // Note: Error.message is not enumerable by default
      // but code, statusCode, details should be accessible
      expect(parsed.code).toBe('TEST')
      expect(parsed.statusCode).toBe(400)
      expect(parsed.details).toEqual({ foo: 'bar' })
    })
  })
})
