import { useSupabaseClient } from '#imports'
import type { Database } from '~/types/supabase'

type ItemDefinition = Database['public']['Tables']['inventory_item_definitions']['Row']
type ItemDefinitionInsert = Database['public']['Tables']['inventory_item_definitions']['Insert']
type ItemDefinitionUpdate = Database['public']['Tables']['inventory_item_definitions']['Update']

interface ItemDefinitionWithDetails {
  id: string
  property_code: string | null
  category_id: string
  category_name: string
  expected_life_years: number
  brand: string | null
  model: string | null
  manufacturer_part_number: string | null
  description: string | null
  notes: string | null
  is_active: boolean
  photo_count: number
  document_count: number
  created_at: string
  updated_at: string
}

interface FetchItemsFilters {
  propertyCode?: string
  categoryId?: string
  brand?: string
  searchTerm?: string
}

/**
 * Inventory Item Definitions Composable
 * Manages master catalog of item types (brand/model combinations)
 */
export const useInventoryItemDefinitions = () => {
  const supabase = useSupabaseClient<Database>()

  /**
   * Fetch all item definitions with optional filters
   */
  const fetchItemDefinitions = async (filters?: FetchItemsFilters): Promise<ItemDefinitionWithDetails[]> => {
    console.log('📦 Fetching item definitions', filters)

    let query = supabase
      .from('view_inventory_item_definitions')
      .select('*')

    // Apply filters
    if (filters?.propertyCode) {
      query = query.eq('property_code', filters.propertyCode)
    }
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId)
    }
    if (filters?.brand) {
      query = query.ilike('brand', `%${filters.brand}%`)
    }
    if (filters?.searchTerm) {
      query = query.or(`brand.ilike.%${filters.searchTerm}%,model.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`)
    }

    query = query.order('brand', { ascending: true })
    query = query.order('model', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('❌ Error fetching item definitions:', error)
      throw error
    }

    console.log(`✅ Fetched ${data.length} item definitions`)
    return data as ItemDefinitionWithDetails[]
  }

  /**
   * Fetch single item definition by ID
   */
  const fetchItemDefinition = async (id: string): Promise<ItemDefinition> => {
    console.log('📦 Fetching item definition:', id)

    const { data, error } = await supabase
      .from('inventory_item_definitions')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('❌ Error fetching item definition:', error)
      throw error
    }

    return data
  }

  /**
   * Fetch item definition with details (from view)
   */
  const fetchItemDefinitionWithDetails = async (id: string): Promise<ItemDefinitionWithDetails> => {
    console.log('📦 Fetching item definition with details:', id)

    const { data, error } = await supabase
      .from('view_inventory_item_definitions')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('❌ Error fetching item definition:', error)
      throw error
    }

    return data as ItemDefinitionWithDetails
  }

  /**
   * Create new item definition
   */
  const createItemDefinition = async (item: ItemDefinitionInsert): Promise<ItemDefinition> => {
    console.log('📦 Creating item definition:', item)

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('inventory_item_definitions')
      .insert({
        ...item,
        created_by: user?.id
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating item definition:', error)
      throw error
    }

    console.log('✅ Item definition created:', data.id)
    return data
  }

  /**
   * Update existing item definition
   */
  const updateItemDefinition = async (id: string, updates: ItemDefinitionUpdate): Promise<ItemDefinition> => {
    console.log('📦 Updating item definition:', id)

    const { data, error } = await supabase
      .from('inventory_item_definitions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating item definition:', error)
      throw error
    }

    console.log('✅ Item definition updated')
    return data
  }

  /**
   * Soft delete item definition (set is_active = false)
   * Checks for active installations first
   */
  const deleteItemDefinition = async (id: string): Promise<void> => {
    console.log('📦 Deleting item definition:', id)

    // Check if item has active installations
    const { count, error: countError } = await supabase
      .from('inventory_installations')
      .select('*', { count: 'exact', head: true })
      .eq('item_definition_id', id)
      .eq('is_active', true)

    if (countError) {
      console.error('❌ Error checking installations:', countError)
      throw countError
    }

    if (count && count > 0) {
      const error = new Error(`Cannot delete item: ${count} active installation(s) exist. Please remove or retire installations first.`)
      console.error('❌', error.message)
      throw error
    }

    const { error } = await supabase
      .from('inventory_item_definitions')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('❌ Error deleting item definition:', error)
      throw error
    }

    console.log('✅ Item definition deleted')
  }

  /**
   * Get count of items by category
   */
  const getCountByCategory = async (categoryId: string): Promise<number> => {
    const { count, error } = await supabase
      .from('inventory_item_definitions')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId)
      .eq('is_active', true)

    if (error) {
      console.error('❌ Error counting items:', error)
      throw error
    }

    return count || 0
  }

  return {
    fetchItemDefinitions,
    fetchItemDefinition,
    fetchItemDefinitionWithDetails,
    createItemDefinition,
    updateItemDefinition,
    deleteItemDefinition,
    getCountByCategory,
  }
}
