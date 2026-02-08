import { ref } from 'vue'
import type { AlertsRow } from './parsers/useParseAlerts'
import { AlertsConfig } from './parsers/useParseAlerts'

export function useAlertsSync() {
  const isSyncing = ref(false)
  const syncError = ref<string | null>(null)
  const syncStats = ref<string | null>(null)
  
  const client = useSupabaseClient()

  async function syncAlerts(parsedRows: AlertsRow[]) {
    isSyncing.value = true
    syncError.value = null
    syncStats.value = null

    try {
      if (!parsedRows || parsedRows.length === 0) {
        throw new Error('No data to sync')
      }

      // 1. Extract property codes from incoming data (for property-scoped sync)
      const propertyCodes = [...new Set(parsedRows.map(r => r.property_code))].filter(Boolean)

      // 2. Fetch ONLY alerts for the properties in this batch
      const query = client.from('alerts').select('*')

      if (propertyCodes.length > 0) {
        query.in('property_code', propertyCodes)
      }

      const { data: existingData, error: fetchError } = await query

      if (fetchError) throw fetchError

      // 3. Build Map
      const existingMap = new Map<string, any>()
      existingData?.forEach(row => {
        const key = AlertsConfig.getUniqueId ? AlertsConfig.getUniqueId(row) : `${row.property_code || ''}_${row.unit_name || ''}_${row.description || ''}_${row.resident || ''}`
        existingMap.set(key, row)
      })

      // 4. Process Parsed Rows & Identify Deletions
      const toInsert: any[] = []
      const idsToReactivate: string[] = []
      const parsedKeys = new Set<string>()

      for (const row of parsedRows) {
        // Generate key for keys Set (Deactivation check)
        const key = row.unique_id || `${row.property_code || ''}_${row.unit_name || ''}_${row.description || ''}_${row.resident || ''}`
        parsedKeys.add(key)
        
        // Check Existing
        const existing = existingMap.get(key)
        
        // Remove parser metadata for DB
        const { unique_id, ...dbRow } = row

        if (existing) {
           // Exists. Check if we need to reactivate
           if (existing.is_active === false) {
             idsToReactivate.push(existing.id)
           }
           // If already active, DO NOTHING
        } else {
           // New Alert -> Insert
           toInsert.push({
             ...dbRow,
             is_active: true
           })
        }
      }

      // 5. Identify Removed (Soft Delete - within property scope)
      const idsToDeactivate: string[] = []
      
      existingMap.forEach((row, key) => {
        if (!parsedKeys.has(key)) {
           // Was in DB, not in file.
           // Only deactivate if currently active
           if (row.is_active === true) {
             idsToDeactivate.push(row.id)
           }
        }
      })

      // 6. Execute DB Operations
      
      // A. Inserts (New)
      if (toInsert.length > 0) {
        const { error: insertError } = await client
          .from('alerts')
          .insert(toInsert)
        
        if (insertError) throw insertError
      }

      // B. Reactivations (Update Existing)
      if (idsToReactivate.length > 0) {
        const { error: reactivateError } = await client
          .from('alerts')
          .update({ is_active: true })
          .in('id', idsToReactivate)

        if (reactivateError) throw reactivateError
      }

      // C. Deactivations (Soft Delete)
      if (idsToDeactivate.length > 0) {
        const { error: deactivateError } = await client
          .from('alerts')
          .update({ is_active: false })
          .in('id', idsToDeactivate)

        if (deactivateError) throw deactivateError
      }

      // Update counts for stats
      // addedCount = Verified Active rows (New + Reactivated + ExistingActive)
      // We can't easily distinguish 'New' vs 'Reactivated' without existingMap checks.
      
      const addedCount = toInsert.length 
      const removedCount = idsToDeactivate.length
      
      // Calculate 'Reactivated' using map
      // New = Key not in Map. Reactivated = Key in Map AND is_active: false.
      const reactivatedCount = idsToReactivate.length



      // 7. Generate Stats
      // Alert date: yyyy-mm-dd, Alerts count: nn, Alerts added: nn, Alerts removed: nn
      const dateStr = new Date().toISOString().split('T')[0]
      const totalParsed = parsedRows.length
      
      const stats = `Alert date: ${dateStr}, Alerts count: ${totalParsed}, Alerts added: ${addedCount}, Alerts removed: ${removedCount}, Alerts reactivated: ${reactivatedCount}`
      syncStats.value = stats
      
      return true

    } catch (err: any) {
      console.error('Alerts Sync Error:', err)
      syncError.value = err.message || 'Failed to sync alerts'
      return false
    } finally {
      isSyncing.value = false
    }
  }

  return {
    syncAlerts,
    isSyncing,
    syncError,
    syncStats
  }
}
