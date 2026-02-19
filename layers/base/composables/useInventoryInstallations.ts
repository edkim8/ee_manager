import { useSupabaseClient } from '#imports'
import type { Database } from '~/types/supabase'

type Installation = Database['public']['Tables']['inventory_installations']['Row']
type InstallationInsert = Database['public']['Tables']['inventory_installations']['Insert']
type InstallationUpdate = Database['public']['Tables']['inventory_installations']['Update']

interface InstallationWithDetails {
  id: string
  property_code: string
  item_definition_id: string
  category_id: string
  category_name: string
  expected_life_years: number
  brand: string | null
  model: string | null
  manufacturer_part_number: string | null
  item_description: string | null
  serial_number: string | null
  asset_tag: string | null
  install_date: string | null
  warranty_expiration: string | null
  purchase_price: number | null
  supplier: string | null
  location_type: string | null
  location_id: string | null
  location_name: string | null
  status: string
  condition: string | null
  age_years: number | null
  life_remaining_years: number | null
  health_status: string
  warranty_status: string
  notes: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

interface FetchInstallationsFilters {
  propertyCode?: string
  itemDefinitionId?: string
  locationType?: string
  locationId?: string
  status?: string
  healthStatus?: string
}

/**
 * Inventory Installations Composable
 * Manages physical inventory items installed at locations
 */
export const useInventoryInstallations = () => {
  const supabase = useSupabaseClient<Database>()

  /**
   * Fetch all installations with optional filters
   */
  const fetchInstallations = async (filters?: FetchInstallationsFilters): Promise<InstallationWithDetails[]> => {
    console.log('🏗️ Fetching installations', filters)

    let query = supabase
      .from('view_inventory_installations')
      .select('*')

    // Apply filters
    if (filters?.propertyCode) {
      query = query.eq('property_code', filters.propertyCode)
    }
    if (filters?.itemDefinitionId) {
      query = query.eq('item_definition_id', filters.itemDefinitionId)
    }
    if (filters?.locationType) {
      query = query.eq('location_type', filters.locationType)
    }
    if (filters?.locationId) {
      query = query.eq('location_id', filters.locationId)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.healthStatus) {
      query = query.eq('health_status', filters.healthStatus)
    }

    query = query.order('install_date', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('❌ Error fetching installations:', error)
      throw error
    }

    console.log(`✅ Fetched ${data.length} installations`)
    return data as InstallationWithDetails[]
  }

  /**
   * Fetch single installation by ID
   */
  const fetchInstallation = async (id: string): Promise<Installation> => {
    console.log('🏗️ Fetching installation:', id)

    const { data, error } = await supabase
      .from('inventory_installations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('❌ Error fetching installation:', error)
      throw error
    }

    return data
  }

  /**
   * Fetch installation with details (from view)
   */
  const fetchInstallationWithDetails = async (id: string): Promise<InstallationWithDetails> => {
    console.log('🏗️ Fetching installation with details:', id)

    const { data, error } = await supabase
      .from('view_inventory_installations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('❌ Error fetching installation:', error)
      throw error
    }

    return data as InstallationWithDetails
  }

  /**
   * Create new installation
   */
  const createInstallation = async (installation: InstallationInsert): Promise<Installation> => {
    console.log('🏗️ Creating installation:', installation)

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('inventory_installations')
      .insert({
        ...installation,
        created_by: user?.id
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating installation:', error)
      throw error
    }

    console.log('✅ Installation created:', data.id)
    return data
  }

  /**
   * Update existing installation
   */
  const updateInstallation = async (id: string, updates: InstallationUpdate): Promise<Installation> => {
    console.log('🏗️ Updating installation:', id)

    const { data, error } = await supabase
      .from('inventory_installations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating installation:', error)
      throw error
    }

    console.log('✅ Installation updated')
    return data
  }

  /**
   * Soft delete installation (set is_active = false)
   */
  const deleteInstallation = async (id: string): Promise<void> => {
    console.log('🏗️ Deleting installation:', id)

    const { error } = await supabase
      .from('inventory_installations')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('❌ Error deleting installation:', error)
      throw error
    }

    console.log('✅ Installation deleted')
  }

  /**
   * Get count of installations for an item definition
   */
  const getInstallationCount = async (itemDefinitionId: string): Promise<number> => {
    const { count, error } = await supabase
      .from('inventory_installations')
      .select('*', { count: 'exact', head: true })
      .eq('item_definition_id', itemDefinitionId)
      .eq('is_active', true)

    if (error) {
      console.error('❌ Error counting installations:', error)
      throw error
    }

    return count || 0
  }

  /**
   * Check if item definition can be deleted (no active installations)
   */
  const canDeleteItemDefinition = async (itemDefinitionId: string): Promise<boolean> => {
    const count = await getInstallationCount(itemDefinitionId)
    return count === 0
  }

  /**
   * Get installations by location
   */
  const getInstallationsByLocation = async (
    locationType: string,
    locationId: string,
    propertyCode?: string
  ): Promise<InstallationWithDetails[]> => {
    return fetchInstallations({
      locationType,
      locationId,
      propertyCode,
      status: 'active'
    })
  }

  return {
    fetchInstallations,
    fetchInstallation,
    fetchInstallationWithDetails,
    createInstallation,
    updateInstallation,
    deleteInstallation,
    getInstallationCount,
    canDeleteItemDefinition,
    getInstallationsByLocation,
  }
}
