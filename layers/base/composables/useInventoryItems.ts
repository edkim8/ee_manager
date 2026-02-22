import { useSupabaseClient } from '#imports'
import type { Database } from '~/types/supabase'

type InventoryItem = Database['public']['Tables']['inventory_items']['Row']
type InventoryItemInsert = Database['public']['Tables']['inventory_items']['Insert']
type InventoryItemUpdate = Database['public']['Tables']['inventory_items']['Update']

// View types for lifecycle data
interface InventoryItemWithLifecycle {
  id: string
  category_id: string
  category_name: string
  expected_life_years: number
  brand: string | null
  model: string | null
  serial_number: string | null
  seller: string | null
  install_date: string | null
  location_type: string
  location_id: string
  property_code: string
  status: string
  notes: string | null
  age_years: number | null
  life_remaining_years: number | null
  health_status: 'healthy' | 'warning' | 'critical' | 'expired' | 'unknown'
  photo_count: number
  last_event_type: string | null
  last_event_date: string | null
  created_at: string
  updated_at: string
}

interface FetchItemsFilters {
  propertyCode?: string
  locationType?: 'unit' | 'building' | 'location'
  locationId?: string
  categoryId?: string
  status?: 'active' | 'retired' | 'replaced'
  healthStatus?: 'healthy' | 'warning' | 'critical' | 'expired' | 'unknown'
}

/**
 * Inventory Items Composable
 * Manages physical asset instances with polymorphic location support
 */
export const useInventoryItems = () => {
  const supabase = useSupabaseClient<Database>()

  /**
   * Fetch items with optional filters
   * Returns items with lifecycle calculations (age, health status)
   */
  const fetchItems = async (filters?: FetchItemsFilters): Promise<InventoryItemWithLifecycle[]> => {

    let query = supabase
      .from('view_inventory_installations')
      .select('*')

    // Apply filters
    if (filters?.propertyCode) {
      query = query.eq('property_code', filters.propertyCode)
    }
    if (filters?.locationType) {
      query = query.eq('location_type', filters.locationType)
    }
    if (filters?.locationId) {
      query = query.eq('location_id', filters.locationId)
    }
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.healthStatus) {
      query = query.eq('health_status', filters.healthStatus)
    }

    // Order by health status (critical first), then by age
    query = query.order('health_status', { ascending: false })
    query = query.order('age_years', { ascending: false, nullsFirst: false })

    const { data, error } = await query

    if (error) {
      console.error('❌ Error fetching items:', error)
      throw error
    }

    return data as InventoryItemWithLifecycle[]
  }

  /**
   * Fetch items for a specific location (reverse search)
   * Example: Get all items in Unit A-101
   */
  const fetchItemsByLocation = async (
    locationType: 'unit' | 'building' | 'location',
    locationId: string
  ): Promise<InventoryItemWithLifecycle[]> => {

    return fetchItems({ locationType, locationId })
  }

  /**
   * Fetch single item by ID
   */
  const fetchItem = async (id: string): Promise<InventoryItem> => {

    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('❌ Error fetching item:', error)
      throw error
    }

    return data
  }

  /**
   * Fetch single item with lifecycle data
   */
  const fetchItemWithLifecycle = async (id: string): Promise<InventoryItemWithLifecycle> => {

    const { data, error } = await supabase
      .from('view_inventory_installations')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('❌ Error fetching item:', error)
      throw error
    }

    return data as InventoryItemWithLifecycle
  }

  /**
   * Create new item
   */
  const createItem = async (item: InventoryItemInsert): Promise<InventoryItem> => {

    const { data, error } = await supabase
      .from('inventory_items')
      .insert(item)
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating item:', error)
      throw error
    }

    return data
  }

  /**
   * Update existing item
   */
  const updateItem = async (id: string, updates: InventoryItemUpdate): Promise<InventoryItem> => {

    const { data, error } = await supabase
      .from('inventory_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating item:', error)
      throw error
    }

    return data
  }

  /**
   * Soft delete item (set is_active = false)
   */
  const deleteItem = async (id: string): Promise<void> => {

    const { error } = await supabase
      .from('inventory_items')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('❌ Error deleting item:', error)
      throw error
    }

  }

  /**
   * Fetch location summary (item counts and health breakdown)
   */
  const fetchLocationSummary = async (
    locationType: 'unit' | 'building' | 'location',
    locationId: string
  ) => {

    const { data, error } = await supabase
      .from('view_inventory_summary_by_location')
      .select('*')
      .eq('location_type', locationType)
      .eq('location_id', locationId)
      .maybeSingle()

    if (error) {
      // No data is not an error - just means no items yet
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('❌ Error fetching location summary:', error)
      throw error
    }

    return data
  }

  return {
    fetchItems,
    fetchItemsByLocation,
    fetchItem,
    fetchItemWithLifecycle,
    createItem,
    updateItem,
    deleteItem,
    fetchLocationSummary,
  }
}
