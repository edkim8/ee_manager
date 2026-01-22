import { describe, it, expect } from 'vitest'
import {
  PROPERTY_LIST,
  getPropertyName,
  type PropertyCode,
} from '../../../layers/base/constants/properties'

describe('Property Constants', () => {
  describe('PROPERTY_LIST', () => {
    it('should contain 5 properties', () => {
      expect(PROPERTY_LIST).toHaveLength(5)
    })

    it('should have required fields for each property', () => {
      PROPERTY_LIST.forEach((property) => {
        expect(property).toHaveProperty('name')
        expect(property).toHaveProperty('code')
        expect(property).toHaveProperty('yardiId')
        expect(typeof property.name).toBe('string')
        expect(typeof property.code).toBe('string')
        expect(typeof property.yardiId).toBe('string')
      })
    })
  })

  describe('getPropertyName', () => {
    it('should return "Stonebridge" for code "SB"', () => {
      expect(getPropertyName('SB')).toBe('Stonebridge')
    })

    it('should return "Residences" for code "RS"', () => {
      expect(getPropertyName('RS')).toBe('Residences')
    })

    it('should return "Ocean Breeze" for code "OB"', () => {
      expect(getPropertyName('OB')).toBe('Ocean Breeze')
    })

    it('should return "City View" for code "CV"', () => {
      expect(getPropertyName('CV')).toBe('City View')
    })

    it('should return "Whispering Oaks" for code "WO"', () => {
      expect(getPropertyName('WO')).toBe('Whispering Oaks')
    })

    it('should return empty string for invalid code', () => {
      expect(getPropertyName('INVALID')).toBe('')
    })

    it('should return empty string for empty string', () => {
      expect(getPropertyName('')).toBe('')
    })

    it('should be case-sensitive', () => {
      expect(getPropertyName('sb')).toBe('')
      expect(getPropertyName('Sb')).toBe('')
    })
  })

  describe('PropertyCode type', () => {
    it('should allow valid property codes', () => {
      const validCodes: PropertyCode[] = ['SB', 'RS', 'OB', 'CV', 'WO']
      expect(validCodes).toHaveLength(5)
    })
  })
})
