import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatCredits,
  formatCurrency,
  formatRelativeTime,
} from '../lib/utils/format'

describe('format utilities', () => {
  describe('formatDate', () => {
    it('should format Date object', () => {
      const result = formatDate(new Date('2025-01-15T12:00:00Z'))

      expect(result).toContain('Jan')
      expect(result).toContain('15')
      expect(result).toContain('2025')
    })

    it('should format date string', () => {
      const result = formatDate('2025-06-15T12:00:00Z')

      expect(result).toContain('Jun')
      expect(result).toContain('2025')
    })

    it('should accept custom format options', () => {
      const result = formatDate(new Date('2025-01-15'), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      expect(result).toContain('January')
    })
  })

  describe('formatDateTime', () => {
    it('should include time in output', () => {
      const result = formatDateTime(new Date('2025-01-15T14:30:00'))

      expect(result).toContain('Jan')
      expect(result).toContain('15')
      expect(result).toContain('2025')
      // Should include time component
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })

    it('should accept string input', () => {
      const result = formatDateTime('2025-01-15T14:30:00')

      expect(result).toContain('Jan')
    })
  })

  describe('formatCredits', () => {
    it('should format numbers with locale separators', () => {
      expect(formatCredits(1000)).toBe('1,000')
      expect(formatCredits(1000000)).toBe('1,000,000')
    })

    it('should handle zero', () => {
      expect(formatCredits(0)).toBe('0')
    })

    it('should handle small numbers', () => {
      expect(formatCredits(5)).toBe('5')
      expect(formatCredits(100)).toBe('100')
    })
  })

  describe('formatCurrency', () => {
    it('should convert cents to dollars', () => {
      const result = formatCurrency(1000)

      expect(result).toBe('$10.00')
    })

    it('should handle zero cents', () => {
      const result = formatCurrency(0)

      expect(result).toBe('$0.00')
    })

    it('should handle fractional dollars', () => {
      const result = formatCurrency(1050)

      expect(result).toBe('$10.50')
    })

    it('should format large amounts', () => {
      const result = formatCurrency(1000000)

      expect(result).toBe('$10,000.00')
    })
  })

  describe('formatRelativeTime', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return "just now" for recent times', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-15T12:00:30Z'))

      const result = formatRelativeTime(new Date('2025-01-15T12:00:00Z'))

      expect(result).toBe('just now')
    })

    it('should return minutes ago', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-15T12:05:00Z'))

      const result = formatRelativeTime(new Date('2025-01-15T12:00:00Z'))

      expect(result).toBe('5 minutes ago')
    })

    it('should return singular minute', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-15T12:01:30Z'))

      const result = formatRelativeTime(new Date('2025-01-15T12:00:00Z'))

      expect(result).toBe('1 minute ago')
    })

    it('should return hours ago', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-15T15:00:00Z'))

      const result = formatRelativeTime(new Date('2025-01-15T12:00:00Z'))

      expect(result).toBe('3 hours ago')
    })

    it('should return days ago', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-17T12:00:00Z'))

      const result = formatRelativeTime(new Date('2025-01-15T12:00:00Z'))

      expect(result).toBe('2 days ago')
    })

    it('should accept string input', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-15T15:00:00Z'))

      const result = formatRelativeTime('2025-01-15T12:00:00Z')

      expect(result).toBe('3 hours ago')
    })
  })
})
