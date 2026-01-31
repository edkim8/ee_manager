import { ref } from 'vue'
import type { WorkordersRow } from './parsers/useParseWorkorders'
import { resolveUnitId } from '../../base/utils/lookup'

export function useWorkOrdersSync() {
  const isSyncing = ref(false)
  const syncError = ref<string | null>(null)
  const syncStats = ref<string | null>(null)
  
  const client = useSupabaseClient()

  async function syncWorkOrders(parsedRows: WorkordersRow[]) {
    isSyncing.value = true
    syncError.value = null
    syncStats.value = null
    
    try {
      if (!parsedRows || parsedRows.length === 0) {
        throw new Error('No data to sync')
      }

      // 1. Fetch Existing ACTIVE Work Orders (Optimized Diffing)
      const { data: existingData, error: fetchError } = await client
        .from('work_orders')
        .select('id, property_code, yardi_work_order_id')
        .eq('is_active', true)

      if (fetchError) throw fetchError

      // Build Map for Fast Lookup: `${property_code}_${yardi_work_order_id}`
      const existingActiveMap = new Set<string>()
      const existingIdMap = new Map<string, string>() // Key -> UUID
      
      existingData?.forEach(row => {
        const key = `${row.property_code}_${row.yardi_work_order_id}`
        existingActiveMap.add(key)
        existingIdMap.set(key, row.id)
      })

      // 2. Process Parsed Rows & Build Upsert Payload
      const parsedKeys = new Set<string>()
      
      const upsertPayload = parsedRows.map(row => {
        // Generate Key
        const key = `${row.property_code}_${row.yardi_work_order_id}`
        parsedKeys.add(key)

        // Resolve Unit ID
        const resolvedUnitId = row.property_code && row.unit_name 
          ? resolveUnitId(row.property_code, row.unit_name)
          : null

        return {
          property_code: row.property_code,
          unit_name: row.unit_name,
          unit_id: resolvedUnitId, // Resolved UUID or null
          yardi_work_order_id: row.yardi_work_order_id,
          description: row.description,
          status: row.status,
          category: row.category,
          call_date: row.call_date, 
          resident: row.resident,
          phone: row.phone,
          is_active: true // Force active
        }
      })

      // 3. Identify Deletions (In Active DB but NOT in File)
      const idsToDeactivate: string[] = []
      existingIdMap.forEach((id, key) => {
        if (!parsedKeys.has(key)) {
          idsToDeactivate.push(id)
        }
      })

      // 4. Execute Operations
      
      // A. Deactivations (Soft Delete + Completion Date)
      if (idsToDeactivate.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD
        const { error: deactivateError } = await client
          .from('work_orders')
          .update({ 
            is_active: false,
            completion_date: todayStr 
          })
          .in('id', idsToDeactivate)

        if (deactivateError) throw deactivateError
      }

      // B. Upsert (Insert / Update Active)
      const { error: upsertError } = await client
        .from('work_orders')
        .upsert(upsertPayload, {
          onConflict: 'property_code,yardi_work_order_id'
        })

      if (upsertError) throw upsertError

      // 5. Generate Stats
      const dateStr = new Date().toISOString().split('T')[0]
      const processed = upsertPayload.length
      const deactivated = idsToDeactivate.length
      
      syncStats.value = `Sync Date: ${dateStr}, Processed: ${processed}, Deactivated: ${deactivated}`
      
      return true

    } catch (err: any) {
      console.error('Work Orders Sync Error:', err)
      syncError.value = err.message || 'Failed to sync work orders'
      return false
    } finally {
      isSyncing.value = false
    }
  }

  return {
    syncWorkOrders,
    isSyncing,
    syncError,
    syncStats
  }
}
