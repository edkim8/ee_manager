import { ref } from 'vue'
import { useDbIngestion } from './useDbIngestion'
import { resolveUnitId, resolveAmenityId } from '../../base/utils/lookup'

export function useAmenitiesSync() {
  const supabase = useSupabaseClient()
  const isSyncing = ref(false)
  const syncError = ref<string | null>(null)
  
  const { ingest } = useDbIngestion()

  /**
   * Sync Amenities List (Straight Forward)
   */
  async function syncAmenitiesList(data: any[]) {
    isSyncing.value = true
    syncError.value = null
    
    try {
      if (!data || data.length === 0) throw new Error('No data to sync')

      // Map parser data to DB schema if needed (assuming they match mostly)
      const dbRows = data.map(row => ({
        property_code: row.property_code,
        yardi_code: row.yardi_code,
        yardi_name: row.yardi_name,
        yardi_amenity: row.yardi_amenity,
        amount: row.amount,
        type: row.type || 'fixed', // Lowercase standard
        description: row.description
      }))

      const success = await ingest('amenities', dbRows)
      if (!success) throw new Error('Failed to ingest amenities list')
      
      return true
    } catch (err: any) {
      syncError.value = err.message
      return false
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * Sync Amenities Audit (Business Logic)
   */
  async function syncAmenitiesAudit(data: any[]) {
    isSyncing.value = true
    syncError.value = null
    
    try {
      if (!data || data.length === 0) throw new Error('No data to sync')

      const resolvedEntries: Array<{ unitId: string; amenityId: string; original: any }> = []
      const skippedRows: any[] = []

      // 1. Resolve all IDs first
      for (const row of data) {
        const unitId = resolveUnitId(row.property_code, row.unit_name)
        let amenityId = resolveAmenityId(row.property_code, row.yardi_amenity, 'label')
        if (!amenityId) amenityId = resolveAmenityId(row.property_code, row.yardi_code, 'code')
        if (!amenityId) amenityId = resolveAmenityId(row.property_code, row.yardi_name, 'name')

        if (unitId && amenityId) {
          resolvedEntries.push({ unitId, amenityId, original: row })
        } else {
          skippedRows.push({ ...row, reason: !unitId ? 'Unit not found' : 'Amenity not found' })
        }
      }

      if (resolvedEntries.length === 0) {
        throw new Error('No valid units/amenities resolved. Check lookups.')
      }

      // 2. Fetch current unit_amenities for these units to avoid duplicates/errors
      const unitIds = [...new Set(resolvedEntries.map(e => e.unitId))]
      const { data: existingLinks } = await supabase
        .from('unit_amenities')
        .select('id, unit_id, amenity_id, active')
        .in('unit_id', unitIds)

      const existingMap = new Map<string, { id: string; active: boolean }>()
      existingLinks?.forEach((l: any) => existingMap.set(`${l.unit_id}_${l.amenity_id}`, { id: l.id, active: l.active }))

      const toInsert: any[] = []
      const toReactivate: string[] = []

      // 3. Diff and Prep actions
      for (const entry of resolvedEntries) {
        const key = `${entry.unitId}_${entry.amenityId}`
        const existing = existingMap.get(key)
        const targetActive = entry.original.active ?? true

        if (!existing) {
          if (targetActive) {
            toInsert.push({
              unit_id: entry.unitId,
              amenity_id: entry.amenityId,
              active: true,
              comment: 'Uploaded via Audit'
            })
          }
        } else if (existing.active !== targetActive) {
          // If we need to flip the state
          if (targetActive) toReactivate.push(existing.id)
          // Note: Bulk deactivation could be added here if the report is a full unit snapshot
        }
      }

      // 4. Apply Changes
      if (toInsert.length > 0) {
        const { error } = await supabase.from('unit_amenities').insert(toInsert)
        if (error) throw error
      }
      if (toReactivate.length > 0) {
        const { error } = await supabase
          .from('unit_amenities')
          .update({ active: true, comment: 'Re-activated via Audit' })
          .in('id', toReactivate)
        if (error) throw error
      }

      if (skippedRows.length > 0) {
        console.warn('Amenities Audit Sync completed with skips:', skippedRows)
      }
      
      return true
    } catch (err: any) {
      syncError.value = err.message
      return false
    } finally {
      isSyncing.value = false
    }
  }

  return {
    syncAmenitiesList,
    syncAmenitiesAudit,
    isSyncing,
    syncError
  }
}
