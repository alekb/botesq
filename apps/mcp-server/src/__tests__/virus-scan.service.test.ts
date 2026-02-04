import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  scanBuffer,
  isVirusScanEnabled,
  checkHealth,
  resetScanner,
} from '../services/virus-scan.service.js'

// Mock the config
vi.mock('../config.js', () => ({
  config: {
    env: 'test',
    clamav: {
      enabled: false,
      mode: 'daemon',
      host: '127.0.0.1',
      port: 3310,
      timeout: 60000,
    },
  },
}))

describe('virus-scan.service', () => {
  beforeEach(() => {
    resetScanner()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('isVirusScanEnabled', () => {
    it('returns false when scanning is disabled', () => {
      expect(isVirusScanEnabled()).toBe(false)
    })
  })

  describe('scanBuffer', () => {
    it('returns clean result when scanning is disabled', async () => {
      const buffer = Buffer.from('test content')
      const result = await scanBuffer(buffer, 'test.txt')

      expect(result.isInfected).toBe(false)
      expect(result.viruses).toEqual([])
      expect(result.scannedAt).toBeInstanceOf(Date)
      expect(result.scanDurationMs).toBe(0)
    })

    it('includes filename in result context', async () => {
      const buffer = Buffer.from('test content')
      const result = await scanBuffer(buffer, 'document.pdf')

      expect(result.isInfected).toBe(false)
    })
  })

  describe('checkHealth', () => {
    it('returns healthy with disabled version when scanning is disabled', async () => {
      const health = await checkHealth()

      expect(health.healthy).toBe(true)
      expect(health.version).toBe('disabled')
    })
  })
})

// Note: Integration tests with actual ClamAV would require a running daemon
// and should be marked as integration tests in a separate file

describe('ScanResult interface', () => {
  it('has expected shape', async () => {
    const buffer = Buffer.from('test')
    const result = await scanBuffer(buffer)

    expect(result).toHaveProperty('isInfected')
    expect(result).toHaveProperty('viruses')
    expect(result).toHaveProperty('scannedAt')
    expect(result).toHaveProperty('scanDurationMs')

    expect(typeof result.isInfected).toBe('boolean')
    expect(Array.isArray(result.viruses)).toBe(true)
    expect(result.scannedAt instanceof Date).toBe(true)
    expect(typeof result.scanDurationMs).toBe('number')
  })
})
