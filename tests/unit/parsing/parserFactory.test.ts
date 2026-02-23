import { describe, it, expect } from 'vitest'
import { transforms, createMapping } from '../../../layers/parsing/composables/useParserFactory'

// ─── transforms.trim ─────────────────────────────────────────────────────────

describe('transforms.trim', () => {
  it('trims whitespace from strings', () => {
    expect(transforms.trim('  hello  ')).toBe('hello')
    expect(transforms.trim('no-spaces')).toBe('no-spaces')
  })

  it('converts non-strings to trimmed strings', () => {
    expect(transforms.trim(123)).toBe('123')
    expect(transforms.trim(null)).toBe('')
    expect(transforms.trim(undefined)).toBe('')
  })
})

// ─── transforms.phone ────────────────────────────────────────────────────────

describe('transforms.phone', () => {
  it('returns null for falsy values', () => {
    expect(transforms.phone(null)).toBeNull()
    expect(transforms.phone('')).toBeNull()
    expect(transforms.phone(undefined)).toBeNull()
  })

  it('strips all non-digit characters', () => {
    expect(transforms.phone('(555) 123-4567')).toBe('5551234567')
    expect(transforms.phone('555.123.4567')).toBe('5551234567')
    expect(transforms.phone('+1-800-555-0100')).toBe('18005550100')
  })

  it('returns digits for 7+ digit numbers', () => {
    expect(transforms.phone('1234567')).toBe('1234567')
    expect(transforms.phone('12345678901')).toBe('12345678901')
  })

  it('returns null for fewer than 7 digits', () => {
    expect(transforms.phone('123456')).toBeNull()
    expect(transforms.phone('123')).toBeNull()
  })

  it('returns null for strings with no digits', () => {
    expect(transforms.phone('N/A')).toBeNull()
    expect(transforms.phone('---')).toBeNull()
  })
})

// ─── transforms.boolean ──────────────────────────────────────────────────────

describe('transforms.boolean', () => {
  it('returns true for truthy values', () => {
    expect(transforms.boolean(true)).toBe(true)
    expect(transforms.boolean(1)).toBe(true)
    expect(transforms.boolean('yes')).toBe(true)
    expect(transforms.boolean('YES')).toBe(true)
    expect(transforms.boolean('Yes')).toBe(true)
  })

  it('returns false for falsy values', () => {
    expect(transforms.boolean(false)).toBe(false)
    expect(transforms.boolean(0)).toBe(false)
    expect(transforms.boolean('no')).toBe(false)
    expect(transforms.boolean('NO')).toBe(false)
    expect(transforms.boolean('No')).toBe(false)
  })

  it('returns null for unrecognized values', () => {
    expect(transforms.boolean(null)).toBeNull()
    expect(transforms.boolean(undefined)).toBeNull()
    expect(transforms.boolean('maybe')).toBeNull()
    expect(transforms.boolean('true')).toBeNull()
    expect(transforms.boolean('false')).toBeNull()
    expect(transforms.boolean(2)).toBeNull()
  })
})

// ─── transforms.integer ──────────────────────────────────────────────────────

describe('transforms.integer', () => {
  it('parses integer strings', () => {
    expect(transforms.integer('42')).toBe(42)
    expect(transforms.integer('0')).toBe(0)
    expect(transforms.integer('-5')).toBe(-5)
  })

  it('truncates decimals to integer', () => {
    expect(transforms.integer('3.9')).toBe(3)
    expect(transforms.integer('3.1')).toBe(3)
  })

  it('passes through numbers', () => {
    expect(transforms.integer(42)).toBe(42)
  })

  it('returns null for non-numeric strings', () => {
    expect(transforms.integer('abc')).toBeNull()
    expect(transforms.integer('')).toBeNull()
    expect(transforms.integer(null)).toBeNull()
    expect(transforms.integer(undefined)).toBeNull()
  })

  it('parses leading number from mixed string', () => {
    // parseInt behavior — stops at first non-digit
    expect(transforms.integer('42abc')).toBe(42)
  })
})

// ─── createMapping ───────────────────────────────────────────────────────────

describe('createMapping', () => {
  it('converts string shorthand to FieldMapping with targetField', () => {
    const result = createMapping({ 'Unit': 'unit_name' })
    expect(result['Unit']).toEqual({ targetField: 'unit_name' })
    expect(result['Unit'].transform).toBeUndefined()
    expect(result['Unit'].required).toBeUndefined()
  })

  it('converts object spec to FieldMapping', () => {
    const result = createMapping({
      'Rent': { target: 'lease_rent', transform: 'currency' }
    })
    expect(result['Rent']).toEqual({
      targetField: 'lease_rent',
      transform: 'currency',
      required: undefined
    })
  })

  it('preserves required flag', () => {
    const result = createMapping({
      'Move In': { target: 'move_in_date', transform: 'date', required: true }
    })
    expect(result['Move In'].required).toBe(true)
    expect(result['Move In'].targetField).toBe('move_in_date')
    expect(result['Move In'].transform).toBe('date')
  })

  it('handles mixed shorthand and object entries', () => {
    const result = createMapping({
      'Unit': 'unit_name',
      'Rent': { target: 'rent', transform: 'currency' },
    })
    expect(Object.keys(result)).toHaveLength(2)
    expect(result['Unit'].targetField).toBe('unit_name')
    expect(result['Rent'].targetField).toBe('rent')
  })

  it('returns empty object for empty input', () => {
    expect(createMapping({})).toEqual({})
  })
})

// ─── transforms.currency ─────────────────────────────────────────────────────
// Delegates to parseCurrency — spot-check the wiring

describe('transforms.currency', () => {
  it('parses a dollar-sign string', () => {
    expect(transforms.currency('$1,250.00')).toBe(1250)
  })

  it('passes through a number', () => {
    expect(transforms.currency(1850)).toBe(1850)
  })

  it('returns null for null', () => {
    expect(transforms.currency(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(transforms.currency('')).toBeNull()
  })
})

// ─── transforms.date ─────────────────────────────────────────────────────────
// Delegates to formatDateForDB — spot-check including the PST regression case

describe('transforms.date', () => {
  it('passes through YYYY-MM-DD unchanged', () => {
    expect(transforms.date('2026-03-15')).toBe('2026-03-15')
  })

  it('parses M/D/YY short-year format', () => {
    expect(transforms.date('1/14/26')).toBe('2026-01-14')
  })

  it('extracts UTC date from ISO timestamp (regression: no PST off-by-one)', () => {
    // "2026-01-14T00:00:00.000Z" must not become "2026-01-13" in PST timezone
    expect(transforms.date('2026-01-14T00:00:00.000Z')).toBe('2026-01-14')
  })

  it('returns null for null', () => {
    expect(transforms.date(null)).toBeNull()
  })
})

// ─── transforms.aptCode ──────────────────────────────────────────────────────
// Delegates to getApartmentCode — spot-check the wiring

describe('transforms.aptCode', () => {
  it('extracts code from parentheses format', () => {
    expect(transforms.aptCode('City View(cacitvie)')).toBe('CACITVIE')
  })

  it('extracts code from dash format', () => {
    expect(transforms.aptCode('SB - Stonebridge')).toBe('SB')
  })

  it('returns null for null', () => {
    expect(transforms.aptCode(null)).toBeNull()
  })
})

// ─── transforms.name ─────────────────────────────────────────────────────────
// Delegates to normalizeNameFormat — spot-check the wiring

describe('transforms.name', () => {
  it('trims leading/trailing whitespace', () => {
    expect(transforms.name('  Jane Smith  ')).toBe('Jane Smith')
  })

  it('collapses multiple internal spaces to one', () => {
    expect(transforms.name('Jane   Smith')).toBe('Jane Smith')
  })

  it('returns empty string for null', () => {
    expect(transforms.name(null)).toBe('')
  })

  it('returns the string unchanged when already clean', () => {
    expect(transforms.name('Jane Smith')).toBe('Jane Smith')
  })
})
