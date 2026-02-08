import { useSupabaseClient, useToast } from '#imports'
import type { Database } from '../../../../types/supabase'

export interface AppConstant {
  id: string
  key: string
  value: string
  default_value: string
  data_type: string
  category: string
  apt_code: string
  label: string
  description?: string
  help_text?: string
  min_value?: number
  max_value?: number
}

export const useConstantsMutation = () => {
  const supabase = useSupabaseClient<Database>()
  const toast = useToast()

  const fetchConstants = async (propertyCode: string) => {
    try {
      const { data, error } = await supabase
        .from('app_constants' as any)
        .select('*')
        .eq('apt_code', propertyCode)
        .order('display_order', { ascending: true })

      if (error) throw error
      return data as AppConstant[]
    } catch (error: any) {
      console.error('Error fetching constants:', error)
      toast.add({
        title: 'Error',
        description: 'Failed to fetch settings',
        color: 'red'
      })
      return []
    }
  }

  const updateConstant = async (id: string, value: string) => {
    try {
      const { error } = await supabase
        .from('app_constants' as any)
        .update({ value, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      
      return true
    } catch (error: any) {
      console.error('Error updating constant:', error)
      toast.add({
        title: 'Error',
        description: error.message || 'Failed to update setting',
        color: 'red'
      })
      return false
    }
  }

  const updateMultipleConstants = async (updates: { id: string; value: string }[]) => {
     try {
       for (const update of updates) {
         const { error } = await supabase
           .from('app_constants' as any)
           .update({ value: update.value, updated_at: new Date().toISOString() })
           .eq('id', update.id)
         if (error) throw error
       }

       toast.add({
         title: 'Success',
         description: 'Settings updated successfully',
         color: 'green'
       })
       return true
     } catch (error: any) {
       console.error('Error updating multiple constants:', error)
       toast.add({
         title: 'Error',
         description: 'Failed to update some settings',
         color: 'red'
       })
       return false
     }
  }

  return {
    fetchConstants,
    updateConstant,
    updateMultipleConstants
  }
}
