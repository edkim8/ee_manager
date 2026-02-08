import { ref } from 'vue'

export function useDbIngestion() {
  const isSaving = ref(false)
  const saveError = ref<string | null>(null)
  
  const client = useSupabaseClient()

  async function ingest(tableName: string, data: any[]) {
    isSaving.value = true
    saveError.value = null
    
    try {
      if (!data || data.length === 0) {
        throw new Error('No data to save')
      }

      // Supabase Upsert
      // Assuming 'unique constraints' handle duplicates.
      // Filter out 'unique_id' as it's a parser-only field not present in DB
      const cleanData = data.map(row => {
        const { unique_id, ...rest } = row
        return rest
      })

      const { error } = await client
        .from(tableName)
        .upsert(cleanData)

      if (error) throw error
      
      return true
    } catch (err: any) {
      console.error('DB Ingestion Error:', err)
      saveError.value = err.message || 'Failed to save to database'
      return false
    } finally {
      isSaving.value = false
    }
  }

  return {
    ingest,
    isSaving,
    saveError
  }
}
