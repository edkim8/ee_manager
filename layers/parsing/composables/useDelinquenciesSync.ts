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

      // 1. Pre-validation: Fetch ALL existing tenancy IDs to avoid FK violations
      // Note: Supabase/PostgREST often has a 1000-row server-side limit.
      // We loop to ensure we get the full roster (user has ~1.2k).
      let allTenancies: { id: string }[] = []
      let from = 0
      const PAGE_SIZE = 1000
      let hasMore = true

      while (hasMore) {
        const { data, error: tErr } = await client
          .from('tenancies')
          .select('id')
          .order('id') // Added order to ensure stable pagination
          .range(from, from + PAGE_SIZE - 1)
        
        if (tErr) throw tErr
        if (data && data.length > 0) {
          allTenancies = [...allTenancies, ...data]
          from += PAGE_SIZE
          if (data.length < PAGE_SIZE) hasMore = false
        } else {
          hasMore = false
        }
      }
      
      console.log(`Delinquencies Sync: Fetched ${allTenancies.length} registration records (Tenancy IDs) from DB.`)
      
      const validTenancyIds = new Set(allTenancies.map((t: { id: string }) => t.id.trim().toLowerCase()))

      const missingTenancyIds: string[] = []
      const rowsToProcess = parsedRows.filter(row => {
        if (!row.tenancy_id) return false
        const tid = String(row.tenancy_id).trim().toLowerCase()
        if (!validTenancyIds.has(tid)) {
          missingTenancyIds.push(row.tenancy_id)
          return false
        }
        return true
      })

      if (missingTenancyIds.length > 0) {
        console.warn('Delinquencies Sync: Skipping residents missing from tenancies table:', missingTenancyIds)
      }

      if (rowsToProcess.length === 0 && parsedRows.length > 0) {
        throw new Error(`Critical Error: None of the ${parsedRows.length} residents in the file exist in the tenancies table. (First few missing: ${missingTenancyIds.slice(0, 3).join(', ')})`)
      }

      // 2. Fetch currently ACTIVE delinquencies ONLY for properties in this batch (property-scoped)
      const propertyCodes = [...new Set(rowsToProcess.map(r => r.property_code))].filter(Boolean)

      const query = client.from('delinquencies').select('*').eq('is_active', true)
      if (propertyCodes.length > 0) {
          query.in('property_code', propertyCodes)
      }

      const { data: activeData, error: fetchError } = await query
      if (fetchError) throw fetchError

      // 3. Build Map of ACTIVE Records
      const activeMap = new Map<string, any>()
      activeData?.forEach((row: any) => {
        activeMap.set(row.tenancy_id, row)
      })

      // 4. Compare Snapshots
      const toDeactivate: string[] = []
      const toInsert: any[] = []
      const processedTenancyIds = new Set<string>()

      for (const row of rowsToProcess) {
        if (!row.tenancy_id) continue
        processedTenancyIds.add(row.tenancy_id)
        
        const active = activeMap.get(row.tenancy_id)
        const { unique_id, ...dbRow } = row

        if (active) {
            // Check if balance has changed
            if (Number(active.balance) !== Number(row.balance)) {
                toDeactivate.push(active.id)
                toInsert.push({ ...dbRow, is_active: true })
            }
        } else {
            toInsert.push({ ...dbRow, is_active: true })
        }
      }

      // 5. Handle Residents who were active but are MISSING from the report (Resolved)
      activeMap.forEach((row, tenancyId) => {
        if (!processedTenancyIds.has(tenancyId)) {
            toDeactivate.push(row.id)
        }
      })

      // 6. Execute DB Operations
      if (toDeactivate.length > 0) {
        const { error: deleteError } = await client
          .from('delinquencies')
          .update({ is_active: false })
          .in('id', toDeactivate)

        if (deleteError) throw deleteError
      }

      if (toInsert.length > 0) {
        const { error: insertError } = await client
          .from('delinquencies')
          .insert(toInsert)
        
        if (insertError) throw insertError
      }

      // 7. Stats
      const dateStr = new Date().toISOString().split('T')[0]
      let stats = `Snapshot Date: ${dateStr}, Updated/New: ${toInsert.length}, Resolved: ${toDeactivate.length - (toInsert.length > 0 ? toInsert.filter(i => activeMap.has(i.tenancy_id)).length : 0)}`
      
      if (missingTenancyIds.length > 0) {
        stats += ` | SKIPPED: ${missingTenancyIds.length} unknown residents (check console)`
      }
      
      syncStats.value = stats
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
