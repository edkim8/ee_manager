import { useSupabaseClient } from '#imports'
import { useImageCompression } from '../../base/composables/useImageCompression'

export interface LocationNote {
  id: string
  location_id: string
  note_text: string
  category: 'inspection' | 'repair_replacement' | 'incident' | 'maintenance' | 'update'
  created_by?: string
  created_by_user?: { email: string }
  created_at: string
  updated_at: string
}

export interface NoteAttachment {
  id: string
  note_id: string
  file_url: string
  file_type: 'image' | 'document'
  file_name: string
  file_size?: number
  mime_type?: string
  uploaded_by?: string
  uploaded_at: string
}

export interface NoteWithAttachments extends LocationNote {
  attachments: NoteAttachment[]
}

export const useLocationNotes = () => {
  const supabase = useSupabaseClient()

  // Fetch all notes for a location
  const fetchLocationNotes = async (locationId: string): Promise<NoteWithAttachments[]> => {

    // Fetch notes (without user email for now - auth.users is protected)
    const { data: notes, error: notesError } = await supabase
      .from('location_notes')
      .select('*')
      .eq('location_id', locationId)
      .order('created_at', { ascending: false })

    if (notesError) {
      console.error('Error fetching notes:', notesError)
      throw notesError
    }

    // Fetch attachments for all notes
    const noteIds = notes.map(n => n.id)

    if (noteIds.length === 0) {
      return []
    }

    const { data: attachments, error: attachmentsError } = await supabase
      .from('location_note_attachments')
      .select('*')
      .in('note_id', noteIds)
      .order('uploaded_at', { ascending: true })

    if (attachmentsError) {
      console.error('Error fetching attachments:', attachmentsError)
      throw attachmentsError
    }

    // Combine notes with their attachments
    const notesWithAttachments: NoteWithAttachments[] = notes.map(note => ({
      ...note,
      attachments: attachments.filter(att => att.note_id === note.id)
    }))

    return notesWithAttachments
  }

  // Add a new note
  const addLocationNote = async (
    locationId: string,
    noteText: string,
    category: LocationNote['category']
  ): Promise<LocationNote> => {

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('location_notes')
      .insert({
        location_id: locationId,
        note_text: noteText,
        category: category,
        created_by: user?.id  // Explicitly set created_by
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error adding note:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }

    return data
  }

  // Update a note
  const updateLocationNote = async (
    noteId: string,
    updates: { note_text?: string; category?: LocationNote['category'] }
  ): Promise<LocationNote> => {

    const { data, error } = await supabase
      .from('location_notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single()

    if (error) {
      console.error('Error updating note:', error)
      throw error
    }

    return data
  }

  // Delete a note (cascades to attachments)
  const deleteLocationNote = async (noteId: string): Promise<boolean> => {

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    // Get note to check created_by
    const { data: note } = await supabase
      .from('location_notes')
      .select('created_by')
      .eq('id', noteId)
      .single()


    const { error, count } = await supabase
      .from('location_notes')
      .delete({ count: 'exact' })
      .eq('id', noteId)

    if (error) {
      console.error('❌ Error deleting note:', error)
      throw error
    }

    if (count === 0) {
    } else {
    }
    return true
  }

  // Upload attachment file
  const uploadAttachment = async (
    file: File,
    fileType: 'image' | 'document'
  ): Promise<string> => {

    // Compress images before uploading (documents are not compressed)
    const { compressNoteAttachment } = useImageCompression()
    const processedFile = await compressNoteAttachment(file)

    // Use .jpg for images, keep original extension for documents
    const fileExt = fileType === 'image' ? 'jpg' : file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
    const bucket = fileType === 'image' ? 'images' : 'documents'
    const folder = fileType === 'image' ? 'location-notes' : 'location-notes'
    const filePath = `${folder}/${fileName}`


    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, processedFile)

    if (error) {
      console.error('Upload failed:', error)
      throw new Error(`File upload failed: ${error.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return publicUrl
  }

  // Add attachment to note
  const addNoteAttachment = async (
    noteId: string,
    file: File,
    fileType: 'image' | 'document'
  ): Promise<NoteAttachment> => {

    // Upload file first
    const fileUrl = await uploadAttachment(file, fileType)

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser()

    // Create attachment record
    const { data, error } = await supabase
      .from('location_note_attachments')
      .insert({
        note_id: noteId,
        file_url: fileUrl,
        file_type: fileType,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user?.id  // Explicitly set uploaded_by
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding attachment record:', error)
      throw error
    }

    return data
  }

  // Delete attachment
  const deleteNoteAttachment = async (attachmentId: string): Promise<boolean> => {

    // Get attachment to find file path
    const { data: attachment } = await supabase
      .from('location_note_attachments')
      .select('file_url, file_type')
      .eq('id', attachmentId)
      .single()

    // Delete from database
    const { error } = await supabase
      .from('location_note_attachments')
      .delete()
      .eq('id', attachmentId)

    if (error) {
      console.error('Error deleting attachment:', error)
      throw error
    }

    // Try to delete file from storage
    if (attachment?.file_url) {
      try {
        const bucket = attachment.file_type === 'image' ? 'images' : 'documents'
        const urlParts = attachment.file_url.split(`/${bucket}/`)
        if (urlParts.length > 1) {
          const filePath = urlParts[1]
          await supabase.storage.from(bucket).remove([filePath])
        }
      } catch (storageError) {
      }
    }

    return true
  }

  // Get note count for a location
  const getLocationNoteCount = async (locationId: string): Promise<number> => {
    const { count, error } = await supabase
      .from('location_notes')
      .select('id', { count: 'exact', head: true })
      .eq('location_id', locationId)

    if (error) {
      console.error('Error getting note count:', error)
      return 0
    }

    return count || 0
  }

  return {
    fetchLocationNotes,
    addLocationNote,
    updateLocationNote,
    deleteLocationNote,
    addNoteAttachment,
    deleteNoteAttachment,
    getLocationNoteCount
  }
}
