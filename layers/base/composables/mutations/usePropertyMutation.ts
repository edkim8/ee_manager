import { useSupabaseClient, useToast } from '#imports'
import type { Database } from '../../../../types/supabase'

export const usePropertyMutation = () => {
  const supabase = useSupabaseClient<Database>()
  const toast = useToast()

  const updateProperty = async (id: string, updates: { code?: string; name?: string }) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      toast.add({
        title: 'Success',
        description: 'Property updated successfully',
        color: 'green'
      })
      
      return true
    } catch (error: any) {
      console.error('Error updating property:', error)
      toast.add({
        title: 'Error',
        description: error.message || 'Failed to update property',
        color: 'red'
      })
      return false
    }
  }

  return {
    updateProperty
  }
}
