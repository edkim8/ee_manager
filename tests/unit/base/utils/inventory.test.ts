import { describe, it, expect } from 'vitest'
import { formatAssetTag, generatePlaceholderTag } from '../../../../layers/base/utils/inventory'

describe('inventory', () => {
  describe('formatAssetTag', () => {
    it('formats a pre-printed tag correctly', () => {
      expect(formatAssetTag('SB', 1)).toBe('SB-000001')
      expect(formatAssetTag('CV', 452)).toBe('CV-000452')
      expect(formatAssetTag('WO', 42)).toBe('WO-000042')
    })

    it('zero-pads the sequence to 6 digits', () => {
      expect(formatAssetTag('RS', 1)).toBe('RS-000001')
      expect(formatAssetTag('OB', 999999)).toBe('OB-999999')
    })

    it('uppercases the property code and trims whitespace', () => {
      expect(formatAssetTag('  sb  ', 1)).toBe('SB-000001')
    })
  })

  describe('generatePlaceholderTag', () => {
    it('generates a placeholder tag matching the asset tag format', () => {
      const tag = generatePlaceholderTag()
      expect(tag).toMatch(/^[A-Z]{2}-\d{6}$/)
    })
  })
})
