/**
 * POST /api/note-categories/:type/rename
 * Renames a category value in config; optionally updates matching notes.
 */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSR } = vi.hoisted(() => ({ mockSR: vi.fn() }))

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: mockSR,
}))

import handler from '../../../../../layers/admin/server/api/note-categories/[type]/rename.post'

const mockEvent = (type: string, body: object) => ({
  context: { params: { type } },
  __body: body,
} as any)

vi.stubGlobal('getRouterParam', (_event: any, key: string) => _event.context.params[key])
vi.stubGlobal('readBody',       (_event: any) => Promise.resolve(_event.__body))

describe('POST /api/note-categories/:type/rename', () => {
  beforeEach(() => { vi.clearAllMocks() })

  const makeClient = (categories: string[], noteCount = 0) => {
    let callCount = 0
    return {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockImplementation(() => {
        // First call: fetch config
        if (callCount === 0) {
          callCount++
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { categories }, error: null }),
              }),
            }),
          }
        }
        // Second call: update config
        if (callCount === 1) {
          callCount++
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        // Third call: update notes
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({ count: noteCount, error: null }),
              }),
            }),
          }),
        }
      }),
    }
  }

  it('renames category in config array preserving order', async () => {
    const client = makeClient(['general', 'service', 'repair'])
    mockSR.mockReturnValue(client)

    const result = await handler(
      mockEvent('installation', { from: 'service', to: 'maintenance', updateNotes: false })
    )

    expect(result).toEqual({ ok: true, notesUpdated: 0 })

    const updateCall = client.from.mock.results[1].value.update.mock.calls[0][0]
    expect(updateCall.categories).toEqual(['general', 'maintenance', 'repair'])
  })

  it('updates notes when updateNotes=true', async () => {
    const client = makeClient(['service'], 5)
    mockSR.mockReturnValue(client)

    const result = await handler(
      mockEvent('installation', { from: 'service', to: 'maintenance', updateNotes: true })
    )

    expect(result).toEqual({ ok: true, notesUpdated: 5 })
  })

  it('throws 400 when from === to', async () => {
    mockSR.mockReturnValue({
      auth: { getUser: vi.fn() },
      from: vi.fn(),
    })

    await expect(
      handler(mockEvent('installation', { from: 'service', to: 'service', updateNotes: false }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 when target category already exists', async () => {
    mockSR.mockReturnValue({
      auth: { getUser: vi.fn() },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { categories: ['service', 'repair'] }, error: null,
            }),
          }),
        }),
      }),
    })

    await expect(
      handler(mockEvent('installation', { from: 'service', to: 'repair', updateNotes: false }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 404 when record_type config not found', async () => {
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
      handler(mockEvent('unknown', { from: 'x', to: 'y', updateNotes: false }))
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})
