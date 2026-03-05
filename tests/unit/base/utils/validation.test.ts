import { describe, it, expect } from 'vitest'
import { isValidAssetTag, isSanitizedBarcode } from '../../../../layers/base/utils/validation'

describe('validation', () => {
  describe('isValidAssetTag', () => {
    it('returns true for valid tags (EE-PROP-ID)', () => {
      expect(isValidAssetTag('EE-CV-123')).toBe(true)
      expect(isValidAssetTag('EE-AP-456789')).toBe(true)
      expect(isValidAssetTag('ee-rs-001')).toBe(true) // case insensitive
    })

    it('returns false for malformed tags', () => {
      expect(isValidAssetTag('CV-123')).toBe(false) // missing EE
      expect(isValidAssetTag('EE-C-123')).toBe(false) // property too short
      expect(isValidAssetTag('EE-CV-12')).toBe(false) // id too short
      expect(isValidAssetTag('EE-CV-1234567')).toBe(false) // id too long
      expect(isValidAssetTag('')).toBe(false)
      expect(isValidAssetTag(null)).toBe(false)
    })

    it('trims whitespace', () => {
      expect(isValidAssetTag('  EE-CV-123  ')).toBe(true)
    })
  })

  describe('isSanitizedBarcode', () => {
    it('returns true for valid barcodes', () => {
      expect(isSanitizedBarcode('12345678')).toBe(true)
      expect(isSanitizedBarcode('ABC-123')).toBe(true)
    })

    it('returns false for invalid barcodes', () => {
      expect(isSanitizedBarcode('123')).toBe(false) // too short
      expect(isSanitizedBarcode('ABC!@#')).toBe(false) // invalid chars
      expect(isSanitizedBarcode('')).toBe(false)
      expect(isSanitizedBarcode(null)).toBe(false)
    })
  })
})
