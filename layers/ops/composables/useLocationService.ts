import { useSupabaseClient } from '#imports'
import { useImageCompression } from '../../base/composables/useImageCompression'

export interface LocationRecord {
  id?: string
  latitude: number
  longitude: number
  icon_type: 
    | 'electrical' 
    | 'plumbing' 
    | 'hvac'
    | 'structural' 
    | 'lighting' 
    | 'safety_fire'
    | 'landscaping'
    | 'pavement_parking'
    | 'waste'
    | 'incident'
    | 'general'
  source_image_url?: string
  description?: string
  property_code: string
  created_at?: string
  created_by?: string
}

export const useLocationService = () => {
  const supabase = useSupabaseClient()

  const fetchLocations = async (propertyCode: string) => {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('property_code', propertyCode)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as LocationRecord[]
  }

  const addLocation = async (location: LocationRecord) => {
    const { data, error } = await supabase
      .from('locations')
      .insert(location)
      .select()
      .single()

    if (error) throw error
    return data as LocationRecord
  }

  const deleteLocation = async (id: string) => {
    // First, get the location to find the image URL
    const { data: location, error: fetchError } = await supabase
      .from('locations')
      .select('source_image_url')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    // Delete the location record
    const { error: deleteError } = await supabase
      .from('locations')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    // If there's an image, try to delete it from storage
    if (location?.source_image_url) {
      try {
        // Extract file path from URL (format: .../storage/v1/object/public/images/locations/filename.jpg)
        const urlParts = location.source_image_url.split('/images/')
        if (urlParts.length > 1) {
          const filePath = urlParts[1]
          await supabase.storage
            .from('images')
            .remove([filePath])
        }
      } catch (storageError) {
        // Log but don't fail - location is already deleted
        console.warn('Failed to delete image from storage:', storageError)
      }
    }

    return true
  }

  const uploadLocationImage = async (file: File) => {
    console.group('📤 Uploading Location Image')
    console.log('Original file info:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
    })

    // Compress image before uploading
    const { compressLocationImage } = useImageCompression()
    const compressedFile = await compressLocationImage(file)

    // Use .jpg extension since compression converts to JPEG
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.jpg`
    const filePath = `locations/${fileName}`

    console.log('Upload path:', filePath)
    console.log('Bucket:', 'images')

    const { data, error } = await supabase.storage
      .from('images')
      .upload(filePath, compressedFile)

    if (error) {
      console.error('❌ Upload failed:', {
        message: error.message,
        statusCode: error.statusCode,
        error: error
      })
      console.groupEnd()

      // Provide helpful error messages
      if (error.message.includes('bucket')) {
        throw new Error('Storage bucket "images" not found. Please run database migrations.')
      } else if (error.message.includes('policy')) {
        throw new Error('Storage permission denied. Please check authentication.')
      } else if (error.message.includes('size')) {
        throw new Error('File too large. Images are compressed but upload failed.')
      } else {
        throw new Error(`Upload failed: ${error.message}`)
      }
    }

    console.log('✅ Upload successful:', data)

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath)

    console.log('Public URL:', publicUrl)
    console.groupEnd()

    return publicUrl
  }

  return {
    fetchLocations,
    addLocation,
    deleteLocation,
    uploadLocationImage
  }
}
