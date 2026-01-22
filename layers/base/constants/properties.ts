/**
 * Property Constants
 * Immutable list of properties with their codes and Yardi IDs
 */

export const PROPERTY_LIST = [
  { name: 'Stonebridge', code: 'SB', yardiId: 'azstoran' },
  { name: 'Residences', code: 'RS', yardiId: 'azres422' },
  { name: 'Ocean Breeze', code: 'OB', yardiId: 'caoceabr' },
  { name: 'City View', code: 'CV', yardiId: 'cacitvie' },
  { name: 'Whispering Oaks', code: 'WO', yardiId: 'cawhioak' },
] as const

export type PropertyCode = (typeof PROPERTY_LIST)[number]['code']

export type Property = (typeof PROPERTY_LIST)[number]

/**
 * Get property name by code
 * @param code - The property code (e.g., 'SB', 'RS')
 * @returns The property name or empty string if not found
 */
export function getPropertyName(code: string): string {
  const property = PROPERTY_LIST.find((p) => p.code === code)
  return property?.name ?? ''
}
