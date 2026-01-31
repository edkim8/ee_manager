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
      // If data is massive, we might want to chunk it, but let's start simple.
      const { error } = await client
        .from(tableName)
        .upsert(data)

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
