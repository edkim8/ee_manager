import { useSupabaseClient } from '#imports'
import { useAttachments, type Attachment } from './useAttachments'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Note {
  id: string
  record_id: string
  record_type: string
  note_text: string
  category: string
  cost?: number | null
  vendor?: string | null
  created_by?: string
  creator_name?: string
  created_at: string
  updated_at: string
}

export interface NoteWithAttachments extends Note {
  attachments: Attachment[]
}

export interface NoteCategory {
  value: string
  label: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a snake_case or kebab-case value to a display label */
const toLabel = (value: string): string =>
  value.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const extractStoragePath = (fileUrl: string, bucket: string): string | null => {
  const parts = fileUrl.split(`/${bucket}/`)
  return parts.length > 1 ? parts[1] : null
}

// ── Composable ────────────────────────────────────────────────────────────────

export const useNotes = () => {
  const supabase = useSupabaseClient()
  const { addAttachment, deleteAttachment } = useAttachments()

  /**
   * Load the category list for a record type from note_category_configs.
   * Falls back to ['general'] if no config is found.
   */
  const fetchCategories = async (recordType: string): Promise<NoteCategory[]> => {
    const { data } = await supabase
      .from('note_category_configs')
      .select('categories')
      .eq('record_type', recordType)
      .single()

    const values: string[] = data?.categories ?? ['general']
    return values.map(v => ({ value: v, label: toLabel(v) }))
  }

  /**
   * Fetch all notes for a record, with their attachments and creator names.
   */
  const fetchNotes = async (recordId: string, recordType: string): Promise<NoteWithAttachments[]> => {
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('*')
      .eq('record_type', recordType)
      .eq('record_id', recordId)
      .order('created_at', { ascending: false })

    if (notesError) throw notesError
    if (!notes.length) return []

    const noteIds = notes.map(n => n.id)

    // Fetch note attachments (record_type = 'note')
    const { data: attachments, error: attError } = await supabase
      .from('attachments')
      .select('*')
      .eq('record_type', 'note')
      .in('record_id', noteIds)
      .order('uploaded_at', { ascending: true })

    if (attError) throw attError

    // Batch-fetch creator display names
    const creatorIds = [...new Set(notes.map(n => n.created_by).filter(Boolean))] as string[]
    const creatorNameMap: Record<string, string> = {}

    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', creatorIds)

      for (const p of profiles ?? []) {
        const name = [p.first_name, p.last_name].filter(Boolean).join(' ')
        creatorNameMap[p.id] = name || p.email?.split('@')[0] || 'Unknown'
      }
    }

    return notes.map(note => ({
      ...note,
      creator_name: note.created_by ? (creatorNameMap[note.created_by] ?? 'Unknown') : undefined,
      attachments: (attachments ?? []).filter(a => a.record_id === note.id),
    }))
  }

  /**
   * Add a new note to any record.
   */
  const addNote = async (
    recordId: string,
    recordType: string,
    noteText: string,
    category: string,
    options?: { cost?: number | null; vendor?: string | null }
  ): Promise<Note> => {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('notes')
      .insert({
        record_id: recordId,
        record_type: recordType,
        note_text: noteText,
        category,
        cost: options?.cost ?? null,
        vendor: options?.vendor?.trim() || null,
        created_by: user?.id,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update note text, category, cost, or vendor.
   */
  const updateNote = async (
    noteId: string,
    updates: { note_text?: string; category?: string; cost?: number | null; vendor?: string | null }
  ): Promise<Note> => {
    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Delete a note and purge all its attachments from storage + DB.
   */
  const deleteNote = async (noteId: string): Promise<void> => {
    // 1. Collect attachments for this note
    const { data: attachments } = await supabase
      .from('attachments')
      .select('id, file_url, file_type')
      .eq('record_type', 'note')
      .eq('record_id', noteId)

    // 2. Purge storage files (best-effort — orphan scanner safety net)
    if (attachments?.length) {
      const imageFiles: string[] = []
      const docFiles: string[] = []
      for (const att of attachments) {
        if (!att.file_url) continue
        const bucket = att.file_type === 'image' ? 'images' : 'documents'
        const path = extractStoragePath(att.file_url, bucket)
        if (path) att.file_type === 'image' ? imageFiles.push(path) : docFiles.push(path)
      }
      try {
        if (imageFiles.length) await supabase.storage.from('images').remove(imageFiles)
        if (docFiles.length) await supabase.storage.from('documents').remove(docFiles)
      } catch (e) {
        console.warn('[Hybrid Purge] Note storage purge failed — Orphan Scanner will catch:', e)
      }

      // 3. Delete attachment records
      await supabase
        .from('attachments')
        .delete()
        .eq('record_type', 'note')
        .eq('record_id', noteId)
    }

    // 4. Delete the note
    const { error } = await supabase.from('notes').delete().eq('id', noteId)
    if (error) throw error
  }

  /**
   * Count notes for a record (for badges / summary widgets).
   */
  const getNoteCount = async (recordId: string, recordType: string): Promise<number> => {
    const { count, error } = await supabase
      .from('notes')
      .select('id', { count: 'exact', head: true })
      .eq('record_type', recordType)
      .eq('record_id', recordId)

    if (error) return 0
    return count ?? 0
  }

  /**
   * Add a photo or document to a note.
   * Delegates to useAttachments with record_type = 'note'.
   */
  const addNoteAttachment = async (
    noteId: string,
    file: File,
    fileType: 'image' | 'document'
  ): Promise<Attachment> => {
    return addAttachment(noteId, 'note', file, fileType)
  }

  /**
   * Delete a note attachment from storage and DB.
   * Delegates to useAttachments.
   */
  const deleteNoteAttachment = async (attachment: Attachment): Promise<void> => {
    return deleteAttachment(attachment)
  }

  return {
    fetchCategories,
    fetchNotes,
    addNote,
    updateNote,
    deleteNote,
    getNoteCount,
    addNoteAttachment,
    deleteNoteAttachment,
  }
}
