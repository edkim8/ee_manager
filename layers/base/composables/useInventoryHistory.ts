import { useSupabaseClient } from '#imports'
import type { Database } from '~/types/supabase'

type InventoryHistory = Database['public']['Tables']['inventory_history']['Row']
type InventoryHistoryInsert = Database['public']['Tables']['inventory_history']['Insert']

interface InventoryHistoryWithAttachment extends InventoryHistory {
  attachment?: {
    id: string
    file_url: string
    file_name: string
    file_type: string
  } | null
}

/**
 * Inventory History Composable
 * Manages event ledger for tracking install, refinish, replace, repair, retire events
 */
export const useInventoryHistory = () => {
  const supabase = useSupabaseClient<Database>()

  /**
   * Fetch event history for an item
   */
  const fetchHistory = async (itemId: string): Promise<InventoryHistoryWithAttachment[]> => {

    const { data, error } = await supabase
      .from('inventory_history')
      .select(`
        *,
        attachment:attachments(id, file_url, file_name, file_type)
      `)
      .eq('item_id', itemId)
      .order('event_date', { ascending: false })

    if (error) {
      console.error('❌ Error fetching history:', error)
      throw error
    }

    return data as InventoryHistoryWithAttachment[]
  }

  /**
   * Fetch single history event
   */
  const fetchEvent = async (id: string): Promise<InventoryHistoryWithAttachment> => {

    const { data, error } = await supabase
      .from('inventory_history')
      .select(`
        *,
        attachment:attachments(id, file_url, file_name, file_type)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('❌ Error fetching event:', error)
      throw error
    }

    return data as InventoryHistoryWithAttachment
  }

  /**
   * Create new event
   * @param event - Event data
   * @returns Created event
   */
  const addEvent = async (event: InventoryHistoryInsert): Promise<InventoryHistory> => {

    const { data, error } = await supabase
      .from('inventory_history')
      .insert(event)
      .select()
      .single()

    if (error) {
      console.error('❌ Error adding event:', error)
      throw error
    }

    return data
  }

  /**
   * Get latest event for an item
   */
  const fetchLatestEvent = async (itemId: string): Promise<InventoryHistoryWithAttachment | null> => {

    const { data, error } = await supabase
      .from('inventory_history')
      .select(`
        *,
        attachment:attachments(id, file_url, file_name, file_type)
      `)
      .eq('item_id', itemId)
      .order('event_date', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      // No events is not an error
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('❌ Error fetching latest event:', error)
      throw error
    }

    return data as InventoryHistoryWithAttachment
  }

  /**
   * Get events by type for an item
   */
  const fetchEventsByType = async (
    itemId: string,
    eventType: 'install' | 'refinish' | 'replace' | 'repair' | 'retire'
  ): Promise<InventoryHistoryWithAttachment[]> => {

    const { data, error } = await supabase
      .from('inventory_history')
      .select(`
        *,
        attachment:attachments(id, file_url, file_name, file_type)
      `)
      .eq('item_id', itemId)
      .eq('event_type', eventType)
      .order('event_date', { ascending: false })

    if (error) {
      console.error('❌ Error fetching events by type:', error)
      throw error
    }

    return data as InventoryHistoryWithAttachment[]
  }

  /**
   * Get total cost for an item (sum of all event costs)
   */
  const calculateTotalCost = async (itemId: string): Promise<number> => {

    const { data, error } = await supabase
      .from('inventory_history')
      .select('cost')
      .eq('item_id', itemId)

    if (error) {
      console.error('❌ Error calculating total cost:', error)
      throw error
    }

    const total = data.reduce((sum, event) => {
      return sum + (event.cost ? Number(event.cost) : 0)
    }, 0)

    return total
  }

  /**
   * Helper: Create Install event with photo
   * Common pattern: Install event + upload photo
   */
  const addInstallEvent = async (
    itemId: string,
    eventData: {
      event_date: string
      description?: string
      cost?: number
      vendor?: string
      attachment_id?: string
    }
  ): Promise<InventoryHistory> => {

    return addEvent({
      item_id: itemId,
      event_type: 'install',
      ...eventData,
    })
  }

  /**
   * Helper: Create Refinish event
   * Refinish resets lifecycle calculations in some business logic
   */
  const addRefinishEvent = async (
    itemId: string,
    eventData: {
      event_date: string
      description?: string
      cost?: number
      vendor?: string
      attachment_id?: string
    }
  ): Promise<InventoryHistory> => {

    return addEvent({
      item_id: itemId,
      event_type: 'refinish',
      ...eventData,
    })
  }

  return {
    fetchHistory,
    fetchEvent,
    addEvent,
    fetchLatestEvent,
    fetchEventsByType,
    calculateTotalCost,
    // Helper methods
    addInstallEvent,
    addRefinishEvent,
  }
}
