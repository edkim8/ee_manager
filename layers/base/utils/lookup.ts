import { CLIENT_UNIT_LOOKUP } from './unit-lookup-data'
import { CLIENT_AMENITY_LOOKUP } from './amenity-lookup-data'

/**
 * Resolves a Unit ID from Property Code and Unit Name using the client-side lookup.
 * 
 * @param propertyCode - The property code (e.g., "CV")
 * @param unitName - The unit name (e.g., "101")
 * @returns The Unit ID UUID if found, otherwise null.
 */
export function resolveUnitId(propertyCode: string, unitName: string): string | null {
  if (!propertyCode || !unitName) return null

  // Normalize Key: lowercase, trim
  const key = `${propertyCode.trim()}_${unitName.trim()}`.toLowerCase()
  
  return CLIENT_UNIT_LOOKUP[key] || null
}

/**
 * Resolves an Amenity ID from Property Code and a key (code, name, or label).
 * 
 * @param propertyCode - The property code (e.g., "CV")
 * @param key - The identifier (e.g., "POOLD")
 * @param type - Which field to match ('code', 'name', or 'label'). Defaults to 'code'.
 * @returns The Amenity ID UUID if found, otherwise null.
 */
export function resolveAmenityId(
  propertyCode: string, 
  key: string, 
  type: 'code' | 'name' | 'label' = 'code'
): string | null {
  if (!propertyCode || !key) return null

  // Normalize Key: property_type_key (lowercase)
  const lookupKey = `${propertyCode.trim()}_${type}_${key.trim()}`.toLowerCase()
  
  return CLIENT_AMENITY_LOOKUP[lookupKey] || null
}
