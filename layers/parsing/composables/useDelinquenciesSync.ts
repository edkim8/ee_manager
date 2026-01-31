import { ref } from 'vue'
import type { DelinquenciesRow } from './parsers/useParseDelinquencies'

export function useDelinquenciesSync() {
  const isSyncing = ref(false)
  const syncError = ref<string | null>(null)
  const syncStats = ref<string | null>(null)
  
  const client = useSupabaseClient()

  async function syncDelinquencies(parsedRows: DelinquenciesRow[]) {
    isSyncing.value = true
    syncError.value = null
    syncStats.value = null
    
    try {
      if (!parsedRows || parsedRows.length === 0) {
        throw new Error('No data to sync')
      }

      // 1. Fetch ALL existing delinquencies (both active and inactive)
      const { data: existingData, error: fetchError } = await client
        .from('delinquencies')
        .select('*')

      if (fetchError) throw fetchError

      // 2. Build Map of Existing Records
      const existingMap = new Map<string, any>()
      existingData?.forEach((row: any) => {
        const key = `${row.property_code}_${row.unit_name}_${row.tenancy_id}`
        existingMap.set(key, row)
      })

      // 3. Process Parsed Rows (Upsert Preparation)
      const toUpsert: any[] = []
      const parsedKeys = new Set<string>()

      for (const row of parsedRows) {
        const key = `${row.property_code}_${row.unit_name}_${row.tenancy_id}`
        parsedKeys.add(key)
        
        const existing = existingMap.get(key)
        
        // Remove parser metadata
        const { unique_id, ...dbRow } = row

        // Prepare row for Upsert
        const record: any = {
            ...dbRow,
            is_active: true,
            updated_at: new Date().toISOString()
        }

        if (existing) {
            record.id = existing.id
            record.created_at = existing.created_at
        } else {
            record.created_at = new Date().toISOString()
        }
        
        toUpsert.push(record)
      }

      // 4. Identify Resolved Delinquencies (Soft Delete)
      const idsToDeactivate: string[] = []
      
      existingMap.forEach((row, key) => {
        if (!parsedKeys.has(key)) {
           if (row.is_active !== false) {
             idsToDeactivate.push(row.id)
           }
        }
      })

      // 5. Execute Database Operations
      
      // A. Upsert
      if (toUpsert.length > 0) {
        const { error: upsertError } = await client
          .from('delinquencies')
          .upsert(toUpsert)
        
        if (upsertError) throw upsertError
      }

      // B. Deactivate
      if (idsToDeactivate.length > 0) {
        const { error: deleteError } = await client
          .from('delinquencies')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .in('id', idsToDeactivate)

        if (deleteError) throw deleteError
      }

      // 6. Stats
      const dateStr = new Date().toISOString().split('T')[0]
      const totalActive = toUpsert.length
      const resolved = idsToDeactivate.length
      
      syncStats.value = `Date: ${dateStr}, Active Delinquencies: ${totalActive}, Resolved: ${resolved}`
      
      return true

    } catch (err: any) {
      console.error('Delinquencies Sync Error:', err)
      syncError.value = err.message || 'Failed to sync delinquencies'
      return false
    } finally {
      isSyncing.value = false
    }
  }

  return {
    syncDelinquencies,
    isSyncing,
    syncError,
    syncStats
  }
}
