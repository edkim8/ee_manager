import { describe, it, expect } from 'vitest'
import {
  parseCurrency,
  formatDateForDB,
  normalizeNameFormat,
  yardiToPropertyCode,
  getValidPropertyCodes,
} from '../../../layers/parsing/utils/formatters'

// ─── parseCurrency ────────────────────────────────────────────────────────────

describe('parseCurrency', () => {
  it('returns null for null', () => expect(parseCurrency(null)).toBeNull())
  it('returns null for undefined', () => expect(parseCurrency(undefined)).toBeNull())
  it('returns null for empty string', () => expect(parseCurrency('')).toBeNull())

  it('passes through numbers unchanged', () => {
    expect(parseCurrency(1234.56)).toBe(1234.56)
    expect(parseCurrency(0)).toBe(0)
    expect(parseCurrency(-100)).toBe(-100)
  })

  it('strips $ and commas', () => {
    expect(parseCurrency('$1,234.56')).toBe(1234.56)
    expect(parseCurrency('$500')).toBe(500)
    expect(parseCurrency('1,234.56')).toBe(1234.56)
  })

  it('parses accounting negative format (1,234.56) → -1234.56', () => {
    expect(parseCurrency('(1,234.56)')).toBe(-1234.56)
    expect(parseCurrency('($500.00)')).toBe(-500)
  })

  it('returns null for non-numeric strings', () => {
    expect(parseCurrency('N/A')).toBeNull()
    expect(parseCurrency('abc')).toBeNull()
  })
})

// ─── formatDateForDB ──────────────────────────────────────────────────────────

describe('formatDateForDB', () => {

  describe('null / empty inputs', () => {
    it('returns null for null', () => expect(formatDateForDB(null)).toBeNull())
    it('returns null for undefined', () => expect(formatDateForDB(undefined)).toBeNull())
    it('returns null for empty string', () => expect(formatDateForDB('')).toBeNull())
    it('returns null for 0 (not a valid Excel serial)', () => expect(formatDateForDB(0)).toBeNull())
  })

  describe('US date strings (Yardi format)', () => {
    it('parses MM/DD/YYYY', () => {
      expect(formatDateForDB('01/15/2024')).toBe('2024-01-15')
    })

    it('parses M/D/YYYY without leading zeros', () => {
      expect(formatDateForDB('1/5/2024')).toBe('2024-01-05')
    })

    it('parses MM/DD/YY short year — must NOT shift by local timezone (regression: unit 1049)', () => {
      // Bug we fixed: 1/14/26 was returning '2026-01-13' in PST due to local timezone conversion
      expect(formatDateForDB('1/14/26')).toBe('2026-01-14')
      expect(formatDateForDB('01/14/26')).toBe('2026-01-14')
    })

    it('parses M/D/YY short year', () => {
      expect(formatDateForDB('1/5/24')).toBe('2024-01-05')
    })
  })

  describe('ISO date strings', () => {
    it('passes through YYYY-MM-DD unchanged', () => {
      expect(formatDateForDB('2024-01-15')).toBe('2024-01-15')
      expect(formatDateForDB('2026-02-23')).toBe('2026-02-23')
    })

    it('extracts UTC date from ISO timestamp — must NOT shift by local timezone', () => {
      // Bug we fixed: ISO timestamps were interpreted in local timezone, shifting dates by -1
      expect(formatDateForDB('2026-01-14T00:00:00.000Z')).toBe('2026-01-14')
      expect(formatDateForDB('2024-03-01T00:00:00.000Z')).toBe('2024-03-01')
    })
  })

  describe('Excel serial numbers', () => {
    // Excel epoch: Dec 30, 1899. Serial 45292 = Jan 1, 2024 (verified via UTC arithmetic)
    it('converts serial 45292 to 2024-01-01', () => {
      expect(formatDateForDB(45292)).toBe('2024-01-01')
    })

    it('converts serial 45306 to 2024-01-15', () => {
      expect(formatDateForDB(45306)).toBe('2024-01-15')
    })
  })

  describe('Date objects', () => {
    it('extracts UTC date from Date objects without timezone shift', () => {
      const d = new Date('2024-01-15T00:00:00.000Z')
      expect(formatDateForDB(d)).toBe('2024-01-15')
    })

    it('handles midnight UTC correctly', () => {
      const d = new Date(Date.UTC(2026, 0, 14)) // Jan 14, 2026 midnight UTC
      expect(formatDateForDB(d)).toBe('2026-01-14')
    })
  })

  describe('JS Date.toString() format', () => {
    it('parses output of Date.toString()', () => {
      // Happens when Date objects are coerced to strings via JSON serialization edge cases
      expect(formatDateForDB('Thu Sep 11 2025 00:00:00 GMT+0000')).toBe('2025-09-11')
    })
  })
})

// ─── normalizeNameFormat ──────────────────────────────────────────────────────

describe('normalizeNameFormat', () => {
  it('returns empty string for falsy values', () => {
    expect(normalizeNameFormat(null)).toBe('')
    expect(normalizeNameFormat(undefined)).toBe('')
    expect(normalizeNameFormat('')).toBe('')
  })

  it('trims leading/trailing whitespace', () => {
    expect(normalizeNameFormat('  John Doe  ')).toBe('John Doe')
  })

  it('collapses multiple internal spaces', () => {
    expect(normalizeNameFormat('John  Doe')).toBe('John Doe')
    expect(normalizeNameFormat('Jane   Marie   Smith')).toBe('Jane Marie Smith')
  })

  it('converts non-strings to strings', () => {
    expect(normalizeNameFormat(123)).toBe('123')
  })
})

// ─── yardiToPropertyCode ──────────────────────────────────────────────────────

describe('yardiToPropertyCode', () => {
  it('returns null for null/empty inputs', () => {
    expect(yardiToPropertyCode(null)).toBeNull()
    expect(yardiToPropertyCode('')).toBeNull()
    expect(yardiToPropertyCode(undefined)).toBeNull()
  })

  it('maps all five known Yardi IDs', () => {
    expect(yardiToPropertyCode('azstoran')).toBe('SB')
    expect(yardiToPropertyCode('azres422')).toBe('RS')
    expect(yardiToPropertyCode('caoceabr')).toBe('OB')
    expect(yardiToPropertyCode('cacitvie')).toBe('CV')
    expect(yardiToPropertyCode('cawhioak')).toBe('WO')
  })

  it('is case-insensitive', () => {
    expect(yardiToPropertyCode('AZSTORAN')).toBe('SB')
    expect(yardiToPropertyCode('Azres422')).toBe('RS')
    expect(yardiToPropertyCode('CAOCEABR')).toBe('OB')
  })

  it('returns null for unknown Yardi IDs', () => {
    expect(yardiToPropertyCode('unknownid')).toBeNull()
  })

  it('returns null when given a property code (not a Yardi ID)', () => {
    // Property codes are not valid Yardi IDs — lookup should fail
    expect(yardiToPropertyCode('SB')).toBeNull()
    expect(yardiToPropertyCode('RS')).toBeNull()
  })
})

// ─── getValidPropertyCodes ────────────────────────────────────────────────────

describe('getValidPropertyCodes', () => {
  it('returns all five property codes', () => {
    const codes = getValidPropertyCodes()
    expect(codes).toHaveLength(5)
    expect(codes).toContain('SB')
    expect(codes).toContain('RS')
    expect(codes).toContain('OB')
    expect(codes).toContain('CV')
    expect(codes).toContain('WO')
  })
})
