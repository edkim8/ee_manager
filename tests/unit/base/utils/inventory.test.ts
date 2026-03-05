import { describe, it, expect } from 'vitest'
import { formatAssetTag, generatePlaceholderTag } from '../../../../layers/base/utils/inventory'

describe('inventory', () => {
  describe('formatAssetTag', () => {
    it('formats a tag correctly', () => {
      const tag = formatAssetTag('CV', 'AP', '101')
      expect(tag).toBe('EE-CV-AP-101')
    })

    it('handles lowercase and whitespace', () => {
      const tag = formatAssetTag('  rs  ', 'hv', 'sn123')
      expect(tag).toBe('EE-RS-HV-SN123')
    })
  })

  describe('generatePlaceholderTag', () => {
    it('generates a tag with the correct prefix', () => {
      const tag = generatePlaceholderTag()
      expect(tag).toMatch(/^EE-XX-YY-\d{4}$/)
    })
  })
})
