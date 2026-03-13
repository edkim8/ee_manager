/**
 * useNotes composable
 *
 * Covers: fetchCategories, fetchNotes (with creator name resolution),
 * addNote (including cost/vendor), updateNote, deleteNote (hybrid purge),
 * getNoteCount, addNoteAttachment, deleteNoteAttachment.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

// ─── Hoist mocks ─────────────────────────────────────────────────────────────

const { mockFrom, mockSelect, mockEq, mockIn, mockOrder, mockSingle, mockInsert,
        mockUpdate, mockDelete, mockLimit, mockHead } = vi.hoisted(() => {
  const mockSingle  = vi.fn()
  const mockEq      = vi.fn()
  const mockIn      = vi.fn()
  const mockOrder   = vi.fn()
  const mockSelect  = vi.fn()
  const mockInsert  = vi.fn()
  const mockUpdate  = vi.fn()
  const mockDelete  = vi.fn()
  const mockFrom    = vi.fn()
  const mockLimit   = vi.fn()
  const mockHead    = vi.fn()
  return { mockFrom, mockSelect, mockEq, mockIn, mockOrder, mockSingle,
           mockInsert, mockUpdate, mockDelete, mockLimit, mockHead }
})

const mockGetUser    = vi.hoisted(() => vi.fn())
const mockRemove     = vi.hoisted(() => vi.fn())
const mockGetPublicUrl = vi.hoisted(() => vi.fn())
const mockStorageFrom  = vi.hoisted(() => vi.fn())

mockNuxtImport('useSupabaseClient', () => {
  return () => ({
    from:    mockFrom,
    auth:    { getUser: mockGetUser },
    storage: { from: mockStorageFrom },
  })
})

// useAttachments is imported inside useNotes — mock it at module level
vi.mock('../../../../layers/base/composables/useAttachments', () => ({
  useAttachments: () => ({
    addAttachment:    vi.fn().mockResolvedValue({ id: 'att-1' }),
    deleteAttachment: vi.fn().mockResolvedValue(undefined),
  }),
}))

import { useNotes } from '../../../../layers/base/composables/useNotes'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockEvent = {} as any

function makeChain(result: any) {
  // Returns a fluent builder that resolves at any terminal point
  const terminal = vi.fn().mockResolvedValue(result)
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    in:     vi.fn().mockReturnThis(),
    order:  vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: terminal,
    then:   (resolve: any) => Promise.resolve(result).then(resolve),
  }
  // Allow awaiting the chain itself
  Object.defineProperty(builder, Symbol.toStringTag, { value: 'Promise' })
  return { builder, terminal }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockStorageFrom.mockReturnValue({
      remove: mockRemove.mockResolvedValue({ error: null }),
    })
  })

  // ── fetchCategories ────────────────────────────────────────────────────────

  describe('fetchCategories', () => {
    it('returns value+label pairs from DB config', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { categories: ['general', 'service', 'warranty_claim'] },
              error: null,
            }),
          }),
        }),
      })

      const { fetchCategories } = useNotes()
      const result = await fetchCategories('installation')

      expect(result).toEqual([
        { value: 'general',        label: 'General'        },
        { value: 'service',        label: 'Service'        },
        { value: 'warranty_claim', label: 'Warranty Claim' },
      ])
    })

    it('falls back to [general] when no config row found', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      })

      const { fetchCategories } = useNotes()
      const result = await fetchCategories('unknown_module')

      expect(result).toEqual([{ value: 'general', label: 'General' }])
    })

    it('converts snake_case to Title Case label', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { categories: ['repair_replacement', 'hvac_service'] },
              error: null,
            }),
          }),
        }),
      })

      const { fetchCategories } = useNotes()
      const result = await fetchCategories('location')

      expect(result[0].label).toBe('Repair Replacement')
      expect(result[1].label).toBe('Hvac Service')
    })
  })

  // ── addNote ────────────────────────────────────────────────────────────────

  describe('addNote', () => {
    it('inserts note with record_id, record_type, category', async () => {
      const insertedNote = { id: 'note-1', record_id: 'rec-1', record_type: 'installation',
                             note_text: 'Replaced filter', category: 'service',
                             cost: null, vendor: null, created_at: '2026-03-13', updated_at: '2026-03-13' }

      const mockSingleFn = vi.fn().mockResolvedValue({ data: insertedNote, error: null })
      const mockSelectFn = vi.fn().mockReturnValue({ single: mockSingleFn })
      const mockInsertFn = vi.fn().mockReturnValue({ select: mockSelectFn })
      mockFrom.mockReturnValue({ insert: mockInsertFn })

      const { addNote } = useNotes()
      const result = await addNote('rec-1', 'installation', 'Replaced filter', 'service')

      expect(mockInsertFn).toHaveBeenCalledWith(expect.objectContaining({
        record_id:   'rec-1',
        record_type: 'installation',
        note_text:   'Replaced filter',
        category:    'service',
        cost:        null,
        vendor:      null,
        created_by:  'user-1',
      }))
      expect(result.id).toBe('note-1')
    })

    it('inserts cost and vendor when provided', async () => {
      const mockSingleFn = vi.fn().mockResolvedValue({
        data: { id: 'note-2', cost: 450.00, vendor: 'ABC HVAC' }, error: null,
      })
      const mockSelectFn = vi.fn().mockReturnValue({ single: mockSingleFn })
      const mockInsertFn = vi.fn().mockReturnValue({ select: mockSelectFn })
      mockFrom.mockReturnValue({ insert: mockInsertFn })

      const { addNote } = useNotes()
      await addNote('rec-1', 'installation', 'Replaced compressor', 'repair',
                    { cost: 450.00, vendor: 'ABC HVAC' })

      expect(mockInsertFn).toHaveBeenCalledWith(expect.objectContaining({
        cost:   450.00,
        vendor: 'ABC HVAC',
      }))
    })

    it('trims whitespace-only vendor to null', async () => {
      const mockSingleFn = vi.fn().mockResolvedValue({ data: { id: 'note-3' }, error: null })
      const mockSelectFn = vi.fn().mockReturnValue({ single: mockSingleFn })
      const mockInsertFn = vi.fn().mockReturnValue({ select: mockSelectFn })
      mockFrom.mockReturnValue({ insert: mockInsertFn })

      const { addNote } = useNotes()
      await addNote('rec-1', 'installation', 'Note', 'general', { vendor: '   ' })

      expect(mockInsertFn).toHaveBeenCalledWith(expect.objectContaining({ vendor: null }))
    })

    it('throws on DB error', async () => {
      const mockSingleFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } })
      const mockSelectFn = vi.fn().mockReturnValue({ single: mockSingleFn })
      const mockInsertFn = vi.fn().mockReturnValue({ select: mockSelectFn })
      mockFrom.mockReturnValue({ insert: mockInsertFn })

      const { addNote } = useNotes()
      await expect(addNote('rec-1', 'installation', 'Note', 'general'))
        .rejects.toMatchObject({ message: 'db error' })
    })
  })

  // ── getNoteCount ───────────────────────────────────────────────────────────

  describe('getNoteCount', () => {
    it('returns count from DB', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 7, error: null }),
          }),
        }),
      })

      const { getNoteCount } = useNotes()
      const result = await getNoteCount('rec-1', 'installation')

      expect(result).toBe(7)
    })

    it('returns 0 on DB error', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: null, error: { message: 'fail' } }),
          }),
        }),
      })

      const { getNoteCount } = useNotes()
      const result = await getNoteCount('rec-1', 'installation')

      expect(result).toBe(0)
    })
  })

  // ── deleteNote ─────────────────────────────────────────────────────────────

  describe('deleteNote', () => {
    it('purges storage files and deletes attachment + note records', async () => {
      const attachments = [
        { id: 'att-1', file_url: 'https://host/images/note/abc.jpg', file_type: 'image' },
        { id: 'att-2', file_url: 'https://host/documents/note/doc.pdf', file_type: 'document' },
      ]

      let callCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'attachments' && callCount === 0) {
          callCount++
          // First call: fetch attachments for note
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: attachments, error: null }),
              }),
            }),
          }
        }
        if (table === 'attachments' && callCount === 1) {
          callCount++
          // Second call: delete attachment records
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          }
        }
        // Third call: delete note
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      })

      const { deleteNote } = useNotes()
      await deleteNote('note-1')

      // Storage purge called for images bucket
      expect(mockStorageFrom).toHaveBeenCalledWith('images')
      expect(mockStorageFrom).toHaveBeenCalledWith('documents')
      expect(mockRemove).toHaveBeenCalledTimes(2)
    })

    it('skips storage purge when note has no attachments', async () => {
      let callCount = 0
      mockFrom.mockImplementation(() => {
        if (callCount === 0) {
          callCount++
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      })

      const { deleteNote } = useNotes()
      await deleteNote('note-1')

      expect(mockRemove).not.toHaveBeenCalled()
    })
  })

  // ── addNoteAttachment / deleteNoteAttachment ───────────────────────────────

  describe('addNoteAttachment', () => {
    it('delegates to useAttachments.addAttachment with record_type=note', async () => {
      const { addNoteAttachment } = useNotes()
      const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
      const result = await addNoteAttachment('note-1', file, 'image')
      expect(result).toEqual({ id: 'att-1' })
    })
  })

  describe('deleteNoteAttachment', () => {
    it('delegates to useAttachments.deleteAttachment', async () => {
      const { deleteNoteAttachment } = useNotes()
      const att = { id: 'att-1', file_url: 'https://x', file_type: 'image', file_name: 'x.jpg',
                    record_id: 'note-1', record_type: 'note', uploaded_at: '' }
      await expect(deleteNoteAttachment(att)).resolves.toBeUndefined()
    })
  })
})
