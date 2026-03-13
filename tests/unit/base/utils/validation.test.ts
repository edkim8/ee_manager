import { describe, it, expect } from 'vitest'
import { isValidAssetTag, isSanitizedBarcode } from '../../../../layers/base/utils/validation'

describe('validation', () => {
  describe('isValidAssetTag', () => {
    it('returns true for valid pre-printed asset tags', () => {
      expect(isValidAssetTag('SB-000001')).toBe(true)
      expect(isValidAssetTag('WO-000042')).toBe(true)
      expect(isValidAssetTag('CV-000452')).toBe(true)
      expect(isValidAssetTag('RS-999999')).toBe(true)
    })

    it('is case-insensitive', () => {
      expect(isValidAssetTag('sb-000001')).toBe(true)
      expect(isValidAssetTag('Sb-000001')).toBe(true)
    })

    it('trims whitespace', () => {
      expect(isValidAssetTag('  SB-000001  ')).toBe(true)
    })

    it('returns false for old EE-PROP-ID format (obsolete)', () => {
      expect(isValidAssetTag('EE-CV-123')).toBe(false)
      expect(isValidAssetTag('EE-AP-456789')).toBe(false)
    })

    it('returns false for malformed tags', () => {
      expect(isValidAssetTag('SB-00001')).toBe(false)   // sequence too short (5 digits)
      expect(isValidAssetTag('SB-0000001')).toBe(false) // sequence too long (7 digits)
      expect(isValidAssetTag('S-000001')).toBe(false)   // property code too short
      expect(isValidAssetTag('SBX-000001')).toBe(false) // property code too long
      expect(isValidAssetTag('SB000001')).toBe(false)   // missing hyphen
      expect(isValidAssetTag('')).toBe(false)
      expect(isValidAssetTag(null)).toBe(false)
      expect(isValidAssetTag(undefined)).toBe(false)
    })
  })

  describe('isSanitizedBarcode', () => {
    it('returns true for valid barcodes', () => {
      expect(isSanitizedBarcode('12345678')).toBe(true)
      expect(isSanitizedBarcode('ABC-123')).toBe(true)
      expect(isSanitizedBarcode('SB-000001')).toBe(true) // asset tags are valid barcodes
      expect(isSanitizedBarcode('CV-000452')).toBe(true)
    })

    it('returns false for invalid barcodes', () => {
      expect(isSanitizedBarcode('123')).toBe(false)    // too short
      expect(isSanitizedBarcode('ABC!@#')).toBe(false) // invalid chars
      expect(isSanitizedBarcode('')).toBe(false)
      expect(isSanitizedBarcode(null)).toBe(false)
      expect(isSanitizedBarcode(undefined)).toBe(false)
    })
  })
})
