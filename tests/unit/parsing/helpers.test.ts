import { describe, it, expect } from 'vitest'
import {
  getApartmentCode,
  normalizeHeader,
} from '../../../layers/parsing/utils/helpers'

// ─── getApartmentCode ─────────────────────────────────────────────────────────

describe('getApartmentCode', () => {
  describe('null / empty inputs', () => {
    it('returns null for null', () => expect(getApartmentCode(null)).toBeNull())
    it('returns null for undefined', () => expect(getApartmentCode(undefined)).toBeNull())
    it('returns null for empty string', () => expect(getApartmentCode('')).toBeNull())
  })

  describe('Pattern 1: (CODE) in parentheses', () => {
    it('extracts code from parentheses', () => {
      expect(getApartmentCode('(ABC)')).toBe('ABC')
      expect(getApartmentCode('(azres422)')).toBe('AZRES422')
    })

    it('extracts Yardi ID from full property line', () => {
      // Yardi group rows look like "City View(cacitvie) - Expiring Leases"
      expect(getApartmentCode('City View(cacitvie)')).toBe('CACITVIE')
      expect(getApartmentCode('Stonebridge(azstoran) - Residents')).toBe('AZSTORAN')
    })

    it('uppercases the extracted code', () => {
      expect(getApartmentCode('(lowercase)')).toBe('LOWERCASE')
    })

    it('trims whitespace inside parentheses', () => {
      expect(getApartmentCode('( SB )')).toBe('SB')
    })
  })

  describe('Pattern 2: CODE - Description format', () => {
    it('extracts code before dash', () => {
      expect(getApartmentCode('SB - Stonebridge')).toBe('SB')
      expect(getApartmentCode('RS - Residences')).toBe('RS')
    })

    it('handles no space around dash', () => {
      expect(getApartmentCode('CV-City View')).toBe('CV')
    })

    it('uppercases the result', () => {
      expect(getApartmentCode('rs - Residences')).toBe('RS')
    })
  })

  describe('Pattern 3: Raw short code (2–6 alphanumeric chars)', () => {
    it('accepts and uppercases 2-char codes', () => {
      expect(getApartmentCode('SB')).toBe('SB')
      expect(getApartmentCode('sb')).toBe('SB')
    })

    it('accepts 6-char codes', () => {
      expect(getApartmentCode('ABCDEF')).toBe('ABCDEF')
    })

    it('returns null for codes longer than 6 chars', () => {
      expect(getApartmentCode('TOOLONGCODE')).toBeNull()
    })

    it('returns null for 1-char codes', () => {
      expect(getApartmentCode('A')).toBeNull()
    })

    it('returns null for codes with special characters', () => {
      expect(getApartmentCode('A B')).toBeNull()
    })
  })
})

// ─── normalizeHeader ──────────────────────────────────────────────────────────

describe('normalizeHeader', () => {
  it('lowercases the header', () => {
    expect(normalizeHeader('Unit')).toBe('unit')
    expect(normalizeHeader('PROPERTY CODE')).toBe('property_code')
  })

  it('replaces non-alphanumeric sequences with underscores', () => {
    expect(normalizeHeader('Prop. Code')).toBe('prop_code')
    expect(normalizeHeader('Move-In Date')).toBe('move_in_date')
    expect(normalizeHeader('Tel Num(Office)')).toBe('tel_num_office')
  })

  it('strips leading and trailing underscores', () => {
    expect(normalizeHeader(' Unit ')).toBe('unit')
    expect(normalizeHeader('.Unit.')).toBe('unit')
  })

  it('collapses multiple separators into one underscore', () => {
    expect(normalizeHeader('Unit  #')).toBe('unit')
    expect(normalizeHeader('A --- B')).toBe('a_b')
  })

  it('handles empty / falsy input gracefully', () => {
    expect(normalizeHeader('')).toBe('')
    // @ts-ignore - testing runtime safety
    expect(normalizeHeader(null)).toBe('')
    // @ts-ignore
    expect(normalizeHeader(undefined)).toBe('')
  })

  it('preserves numbers', () => {
    expect(normalizeHeader('Tel2')).toBe('tel2')
    expect(normalizeHeader('Unit #')).toBe('unit')
  })
})
