import { useSupabaseClient } from '#imports'
import type { Database } from '~/types/supabase'

interface LocationOption {
  id: string
  name: string
  type: 'unit' | 'building' | 'location'
}

/**
 * Location Selector Composable
 * Loads units, buildings, and locations for dropdowns
 */
export const useLocationSelector = () => {
  const supabase = useSupabaseClient<Database>()

  /**
   * Fetch units for a property
   */
  const fetchUnits = async (propertyCode: string): Promise<LocationOption[]> => {

    const { data, error } = await supabase
      .from('units')
      .select('id, unit_name')
      .eq('property_code', propertyCode)
      .order('unit_name')

    if (error) {
      console.error('❌ Error fetching units:', error)
      throw error
    }

    return data.map(u => ({
      id: u.id,
      name: u.unit_name,
      type: 'unit' as const
    }))
  }

  /**
   * Fetch buildings for a property
   */
  const fetchBuildings = async (propertyCode: string): Promise<LocationOption[]> => {

    const { data, error } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('property_code', propertyCode)
      .order('name')

    if (error) {
      console.error('❌ Error fetching buildings:', error)
      throw error
    }

    return data.map(b => ({
      id: b.id,
      name: b.name,
      type: 'building' as const
    }))
  }

  /**
   * Fetch locations (common areas) for a property
   */
  const fetchLocations = async (propertyCode: string): Promise<LocationOption[]> => {

    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, description')
        .eq('property_code', propertyCode)
        .order('description')

      if (error) {
        console.warn('⚠️ Locations table not available:', error.message)
        return []
      }

      return data.map(l => ({
        id: l.id,
        name: l.description || `Location ${l.id.substring(0, 8)}`,
        type: 'location' as const
      }))
    } catch (err) {
      console.warn('⚠️ Could not fetch locations:', err)
      return []
    }
  }

  /**
   * Get location name by ID and type
   */
  const getLocationName = async (
    locationType: 'unit' | 'building' | 'common_area',
    locationId: string
  ): Promise<string | null> => {
    if (!locationId) return null

    try {
      if (locationType === 'unit') {
        const { data } = await supabase
          .from('units')
          .select('unit_name')
          .eq('id', locationId)
          .single()
        return data?.unit_name || null
      }

      if (locationType === 'building') {
        const { data } = await supabase
          .from('buildings')
          .select('name')
          .eq('id', locationId)
          .single()
        return data?.name || null
      }

      if (locationType === 'common_area') {
        const { data } = await supabase
          .from('locations')
          .select('description')
          .eq('id', locationId)
          .single()
        return data?.description || null
      }
    } catch (err) {
      console.error('Error fetching location name:', err)
    }

    return null
  }

  return {
    fetchUnits,
    fetchBuildings,
    fetchLocations,
    getLocationName,
  }
}
