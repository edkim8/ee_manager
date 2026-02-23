import { describe, it, expect } from 'vitest'
import { resolveUnitId, resolveAmenityId } from '../../../layers/base/utils/lookup'

// ─── resolveUnitId ────────────────────────────────────────────────────────────

describe('resolveUnitId', () => {
  describe('null / empty inputs', () => {
    it('returns null for empty propertyCode', () => {
      expect(resolveUnitId('', 'c101')).toBeNull()
    })

    it('returns null for empty unitName', () => {
      expect(resolveUnitId('CV', '')).toBeNull()
    })

    it('returns null when both are empty', () => {
      expect(resolveUnitId('', '')).toBeNull()
    })
  })

  describe('known units (CV property)', () => {
    it('resolves cv_c101 to correct UUID', () => {
      expect(resolveUnitId('CV', 'c101')).toBe('e83f2f45-ffe4-4c57-b53e-1efbe1332b54')
    })

    it('resolves cv_c102 to correct UUID', () => {
      expect(resolveUnitId('CV', 'c102')).toBe('9b766703-ff94-49b6-a5c7-70dda3cf24fc')
    })
  })

  describe('key normalization', () => {
    it('is case-insensitive for property code', () => {
      expect(resolveUnitId('cv', 'c101')).toBe('e83f2f45-ffe4-4c57-b53e-1efbe1332b54')
      expect(resolveUnitId('CV', 'c101')).toBe('e83f2f45-ffe4-4c57-b53e-1efbe1332b54')
    })

    it('is case-insensitive for unit name', () => {
      expect(resolveUnitId('CV', 'C101')).toBe('e83f2f45-ffe4-4c57-b53e-1efbe1332b54')
      expect(resolveUnitId('CV', 'c101')).toBe('e83f2f45-ffe4-4c57-b53e-1efbe1332b54')
    })

    it('trims whitespace from both arguments', () => {
      expect(resolveUnitId(' CV ', ' c101 ')).toBe('e83f2f45-ffe4-4c57-b53e-1efbe1332b54')
    })
  })

  describe('unknown units', () => {
    it('returns null for unknown property code', () => {
      expect(resolveUnitId('XX', 'c101')).toBeNull()
    })

    it('returns null for unknown unit name', () => {
      expect(resolveUnitId('CV', 'z999')).toBeNull()
    })
  })
})

// ─── resolveAmenityId ────────────────────────────────────────────────────────

describe('resolveAmenityId', () => {
  describe('null / empty inputs', () => {
    it('returns null for empty propertyCode', () => {
      expect(resolveAmenityId('', '1b1')).toBeNull()
    })

    it('returns null for empty key', () => {
      expect(resolveAmenityId('RS', '')).toBeNull()
    })
  })

  describe('known amenities (RS property)', () => {
    it('resolves by code (default type)', () => {
      expect(resolveAmenityId('RS', '1b1')).toBe('04eb8142-ae09-4027-84a2-ddd861834061')
      expect(resolveAmenityId('RS', '1b1', 'code')).toBe('04eb8142-ae09-4027-84a2-ddd861834061')
    })

    it('resolves by name', () => {
      expect(resolveAmenityId('RS', '1st floor 1x1', 'name')).toBe('04eb8142-ae09-4027-84a2-ddd861834061')
    })

    it('resolves by label', () => {
      expect(resolveAmenityId('RS', 'level 01', 'label')).toBe('04eb8142-ae09-4027-84a2-ddd861834061')
    })

    it('all three identifiers for the same amenity return the same UUID', () => {
      const byCode  = resolveAmenityId('RS', '1b1', 'code')
      const byName  = resolveAmenityId('RS', '1st floor 1x1', 'name')
      const byLabel = resolveAmenityId('RS', 'level 01', 'label')
      expect(byCode).toBe(byName)
      expect(byName).toBe(byLabel)
    })
  })

  describe('key normalization', () => {
    it('is case-insensitive for property code', () => {
      expect(resolveAmenityId('rs', '1b1', 'code')).toBe('04eb8142-ae09-4027-84a2-ddd861834061')
      expect(resolveAmenityId('RS', '1b1', 'code')).toBe('04eb8142-ae09-4027-84a2-ddd861834061')
    })

    it('is case-insensitive for key', () => {
      expect(resolveAmenityId('RS', '1B1', 'code')).toBe('04eb8142-ae09-4027-84a2-ddd861834061')
    })

    it('trims whitespace from inputs', () => {
      expect(resolveAmenityId(' RS ', ' 1b1 ', 'code')).toBe('04eb8142-ae09-4027-84a2-ddd861834061')
    })
  })

  describe('unknown amenities', () => {
    it('returns null for unknown property', () => {
      expect(resolveAmenityId('XX', '1b1', 'code')).toBeNull()
    })

    it('returns null for unknown key', () => {
      expect(resolveAmenityId('RS', 'doesnotexist', 'code')).toBeNull()
    })

    it('returns null when type does not match', () => {
      // '1b1' is a code, not a name — wrong type lookup should return null
      expect(resolveAmenityId('RS', '1b1', 'name')).toBeNull()
    })
  })
})
