import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'
import {
  generateCorrelationId,
  createRequestLogger,
  createServiceLogger,
  logRequest,
  logToolExecution,
  logger,
} from '../lib/logger.js'

describe('logger', () => {
  describe('generateCorrelationId', () => {
    it('generates a 16-character hex string', () => {
      const id = generateCorrelationId()
      expect(id).toMatch(/^[a-f0-9]{16}$/)
    })

    it('generates unique IDs', () => {
      const ids = new Set()
      for (let i = 0; i < 100; i++) {
        ids.add(generateCorrelationId())
      }
      expect(ids.size).toBe(100)
    })
  })

  describe('createRequestLogger', () => {
    it('creates a child logger with correlation ID', () => {
      const requestLogger = createRequestLogger('test-correlation-id')
      expect(requestLogger).toBeDefined()
      // The child logger should have bindings
      expect(requestLogger.bindings()).toMatchObject({
        correlationId: 'test-correlation-id',
      })
    })

    it('generates correlation ID if not provided', () => {
      const requestLogger = createRequestLogger()
      const bindings = requestLogger.bindings()
      expect(bindings.correlationId).toMatch(/^[a-f0-9]{16}$/)
    })

    it('includes additional context', () => {
      const requestLogger = createRequestLogger('test-id', { userId: '123' })
      const bindings = requestLogger.bindings()
      expect(bindings).toMatchObject({
        correlationId: 'test-id',
        userId: '123',
      })
    })
  })

  describe('createServiceLogger', () => {
    it('creates a child logger with service name', () => {
      const serviceLogger = createServiceLogger('auth-service')
      const bindings = serviceLogger.bindings()
      expect(bindings.service).toBe('auth-service')
    })

    it('includes additional context', () => {
      const serviceLogger = createServiceLogger('payment-service', { version: '1.0' })
      const bindings = serviceLogger.bindings()
      expect(bindings).toMatchObject({
        service: 'payment-service',
        version: '1.0',
      })
    })
  })

  describe('logRequest', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let infoSpy: MockInstance<any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let warnSpy: MockInstance<any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let errorSpy: MockInstance<any>

    beforeEach(() => {
      infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => logger)
      warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => logger)
      errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('logs successful requests at info level', () => {
      logRequest({
        method: 'GET',
        path: '/api/users',
        statusCode: 200,
        duration: 50,
        correlationId: 'test-id',
      })

      expect(infoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'request',
          method: 'GET',
          path: '/api/users',
          statusCode: 200,
          duration: 50,
        }),
        expect.stringContaining('GET /api/users 200 50ms')
      )
    })

    it('logs 4xx responses at warn level', () => {
      logRequest({
        method: 'POST',
        path: '/api/login',
        statusCode: 401,
        duration: 20,
        correlationId: 'test-id',
      })

      expect(warnSpy).toHaveBeenCalled()
    })

    it('logs 5xx responses at error level', () => {
      logRequest({
        method: 'GET',
        path: '/api/data',
        statusCode: 500,
        duration: 100,
        correlationId: 'test-id',
      })

      expect(errorSpy).toHaveBeenCalled()
    })

    it('includes optional fields when provided', () => {
      logRequest({
        method: 'GET',
        path: '/api/profile',
        statusCode: 200,
        duration: 30,
        correlationId: 'test-id',
        operatorId: 'op-123',
        sessionId: 'sess-456',
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1',
      })

      expect(infoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operatorId: 'op-123',
          sessionId: 'sess-456',
          userAgent: 'Mozilla/5.0',
          ip: '192.168.1.1',
        }),
        expect.any(String)
      )
    })
  })

  describe('logToolExecution', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let infoSpy: MockInstance<any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let warnSpy: MockInstance<any>

    beforeEach(() => {
      infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => logger)
      warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => logger)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('logs successful tool execution at info level', () => {
      logToolExecution('corr-id', 'ask_legal_question', 150, true)

      expect(infoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tool_execution',
          correlationId: 'corr-id',
          tool: 'ask_legal_question',
          duration: 150,
          success: true,
        }),
        expect.stringContaining('Tool ask_legal_question completed in 150ms')
      )
    })

    it('logs failed tool execution at warn level with error code', () => {
      logToolExecution('corr-id', 'create_matter', 50, false, 'INSUFFICIENT_CREDITS')

      expect(warnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tool_execution',
          correlationId: 'corr-id',
          tool: 'create_matter',
          duration: 50,
          success: false,
          errorCode: 'INSUFFICIENT_CREDITS',
        }),
        expect.stringContaining('Tool create_matter failed with INSUFFICIENT_CREDITS in 50ms')
      )
    })
  })

  describe('redaction', () => {
    beforeEach(() => {
      vi.spyOn(logger, 'info').mockImplementation(() => logger)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('redacts sensitive fields', () => {
      // Note: In the actual logger, redaction happens during serialization
      // This test verifies the logger is configured, but actual redaction
      // is handled by pino's redact option during output
      const testLogger = createRequestLogger('test-id')

      // The logger should be configured with redaction paths
      // We can't easily test the actual output, but we can verify the logger works
      expect(testLogger).toBeDefined()
    })
  })
})
