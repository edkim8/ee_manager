import { CLIENT_UNIT_LOOKUP } from './unit-lookup-data'

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
