import { useSupabaseClient } from '#imports'
import { useImageCompression } from './useImageCompression'

export interface Attachment {
  id: string
  record_id: string
  record_type: string
  file_url: string
  file_type: 'image' | 'document'
  file_name: string
  file_size?: number
  mime_type?: string
  uploaded_by?: string
  uploaded_at: string
}

/**
 * Generalized Attachment Composable
 * Handles polymorphic file and photo management for any record.
 */
export const useAttachments = () => {
  const supabase = useSupabaseClient()

  /**
   * Fetch all attachments for a specific record
   */
  const fetchAttachments = async (recordId: string, recordType: string): Promise<Attachment[]> => {
    console.log(`📎 Fetching attachments for ${recordType}:`, recordId)

    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('record_id', recordId)
      .eq('record_type', recordType)
      .order('uploaded_at', { ascending: false })

    if (error) {
      console.error('Error fetching attachments:', error)
      throw error
    }

    return data as Attachment[]
  }

  /**
   * Upload a file and create an attachment record
   */
  const addAttachment = async (
    recordId: string,
    recordType: string,
    file: File,
    fileType: 'image' | 'document'
  ): Promise<Attachment> => {
    console.group(`📤 Uploading ${fileType} for ${recordType}`)
    console.log('File:', file.name)
    
    try {
      // 1. Process/Compress if image
      let processedFile: File | Blob = file
      if (fileType === 'image') {
        const { compressNoteAttachment } = useImageCompression()
        processedFile = await compressNoteAttachment(file)
      }

      // 2. Generate path and upload to storage
      const fileExt = fileType === 'image' ? 'jpg' : file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const bucket = fileType === 'image' ? 'images' : 'documents'
      const folder = recordType // Use record type as folder name
      const filePath = `${folder}/${fileName}`

      console.log(`Storing in ${bucket}/${filePath}`)

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, processedFile)

      if (uploadError) throw uploadError

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      // 4. Create database record
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error: dbError } = await supabase
        .from('attachments')
        .insert({
          record_id: recordId,
          record_type: recordType,
          file_url: publicUrl,
          file_type: fileType,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user?.id
        })
        .select()
        .single()

      if (dbError) throw dbError

      console.log('✅ Attachment added successfully')
      return data as Attachment
    } catch (error) {
      console.error('❌ Failed to add attachment:', error)
      throw error
    } finally {
      console.groupEnd()
    }
  }

  /**
   * Delete an attachment record and its storage file
   */
  const deleteAttachment = async (attachment: Attachment): Promise<void> => {
    console.log('🗑️ Deleting attachment:', attachment.id)

    try {
      // 1. Delete from database first (if RLS allows)
      const { error: dbError } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachment.id)

      if (dbError) throw dbError

      // 2. Attempt to delete from storage (best effort)
      const bucket = attachment.file_type === 'image' ? 'images' : 'documents'
      const urlParts = attachment.file_url.split(`/${bucket}/`)
      if (urlParts.length > 1) {
        const filePath = urlParts[1]
        await supabase.storage.from(bucket).remove([filePath])
      }
      
      console.log('✅ Attachment deleted')
    } catch (error) {
      console.error('❌ Failed to delete attachment:', error)
      throw error
    }
  }

  return {
    fetchAttachments,
    addAttachment,
    deleteAttachment
  }
}
