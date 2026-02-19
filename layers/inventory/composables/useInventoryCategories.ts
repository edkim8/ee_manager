import { useSupabaseClient } from '#imports'
import type { Database } from '~/types/supabase'

type InventoryCategory = Database['public']['Tables']['inventory_categories']['Row']
type InventoryCategoryInsert = Database['public']['Tables']['inventory_categories']['Insert']
type InventoryCategoryUpdate = Database['public']['Tables']['inventory_categories']['Update']

/**
 * Inventory Categories Composable
 * Manages asset type categories with expected lifespan
 */
export const useInventoryCategories = () => {
  const supabase = useSupabaseClient<Database>()

  /**
   * Fetch all active categories
   */
  const fetchCategories = async (): Promise<InventoryCategory[]> => {
    console.log('📦 Fetching inventory categories')

    const { data, error } = await supabase
      .from('inventory_categories')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('❌ Error fetching categories:', error)
      throw error
    }

    console.log(`✅ Fetched ${data.length} categories`)
    return data
  }

  /**
   * Fetch single category by ID
   */
  const fetchCategory = async (id: string): Promise<InventoryCategory> => {
    console.log('📦 Fetching category:', id)

    const { data, error } = await supabase
      .from('inventory_categories')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('❌ Error fetching category:', error)
      throw error
    }

    return data
  }

  /**
   * Create new category
   */
  const createCategory = async (category: InventoryCategoryInsert): Promise<InventoryCategory> => {
    console.log('📦 Creating category:', category.name)

    const { data, error } = await supabase
      .from('inventory_categories')
      .insert(category)
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating category:', error)
      throw error
    }

    console.log('✅ Category created:', data.id)
    return data
  }

  /**
   * Update existing category
   */
  const updateCategory = async (id: string, updates: InventoryCategoryUpdate): Promise<InventoryCategory> => {
    console.log('📦 Updating category:', id)

    const { data, error } = await supabase
      .from('inventory_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating category:', error)
      throw error
    }

    console.log('✅ Category updated')
    return data
  }

  /**
   * Soft delete category (set is_active = false)
   */
  const deleteCategory = async (id: string): Promise<void> => {
    console.log('📦 Deleting category:', id)

    const { error } = await supabase
      .from('inventory_categories')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('❌ Error deleting category:', error)
      throw error
    }

    console.log('✅ Category deleted')
  }

  return {
    fetchCategories,
    fetchCategory,
    createCategory,
    updateCategory,
    deleteCategory,
  }
}
