/**
 * POST /api/note-categories/:type/delete-category
 * Removes a category from config; optionally deletes orphaned notes.
 */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSR } = vi.hoisted(() => ({ mockSR: vi.fn() }))

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: mockSR,
}))

import handler from '../../../../../layers/admin/server/api/note-categories/[type]/delete-category.post'

const mockEvent = (type: string, body: object) => ({
  context: { params: { type } },
  __body: body,
} as any)

vi.stubGlobal('getRouterParam', (_event: any, key: string) => _event.context.params[key])
vi.stubGlobal('readBody',       (_event: any) => Promise.resolve(_event.__body))

describe('POST /api/note-categories/:type/delete-category', () => {
  beforeEach(() => { vi.clearAllMocks() })

  const makeClient = (categories: string[], deleteNotesCount = 0) => {
    let callCount = 0
    return {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockImplementation(() => {
        if (callCount === 0) {
          callCount++
          // Fetch current config
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { categories }, error: null }),
              }),
            }),
          }
        }
        if (callCount === 1) {
          callCount++
          // Update config
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        // Delete notes
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({ count: deleteNotesCount, error: null }),
              }),
            }),
          }),
        }
      }),
    }
  }

  it('removes category from array without deleting notes', async () => {
    const client = makeClient(['general', 'service', 'repair'])
    mockSR.mockReturnValue(client)

    const result = await handler(
      mockEvent('installation', { value: 'service', deleteNotes: false })
    )

    expect(result).toEqual({ ok: true, notesDeleted: 0 })

    const updateCall = client.from.mock.results[1].value.update.mock.calls[0][0]
    expect(updateCall.categories).toEqual(['general', 'repair'])
    expect(updateCall.categories).not.toContain('service')
  })

  it('deletes notes when deleteNotes=true', async () => {
    const client = makeClient(['service'], 3)
    mockSR.mockReturnValue(client)

    const result = await handler(
      mockEvent('installation', { value: 'service', deleteNotes: true })
    )

    expect(result).toEqual({ ok: true, notesDeleted: 3 })
  })

  it('throws 400 when value is missing', async () => {
    mockSR.mockReturnValue({ auth: { getUser: vi.fn() }, from: vi.fn() })

    await expect(
      handler(mockEvent('installation', { deleteNotes: false }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 404 when config not found', async () => {
    mockSR.mockReturnValue({
      auth: { getUser: vi.fn() },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      }),
    })

    await expect(
      handler(mockEvent('unknown', { value: 'service', deleteNotes: false }))
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})
