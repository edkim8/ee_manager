/**
 * GET /api/note-categories
 * Returns all configs with per-category usage counts aggregated from notes table.
 */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSR } = vi.hoisted(() => ({ mockSR: vi.fn() }))

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: mockSR,
}))

import handler from '../../../../../layers/admin/server/api/note-categories/index.get'

const mockEvent = {} as any

describe('GET /api/note-categories', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns configs and aggregated usage counts', async () => {
    const configs = [
      { record_type: 'installation', categories: ['general', 'service'], updated_at: '2026-03-13', updated_by: null },
      { record_type: 'location',     categories: ['inspection'],          updated_at: '2026-03-13', updated_by: null },
    ]
    const notes = [
      { record_type: 'installation', category: 'service'    },
      { record_type: 'installation', category: 'service'    },
      { record_type: 'installation', category: 'general'    },
      { record_type: 'location',     category: 'inspection' },
    ]

    let callCount = 0
    mockSR.mockReturnValue({
      from: vi.fn().mockImplementation(() => {
        if (callCount === 0) {
          callCount++
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: configs, error: null }),
            }),
          }
        }
        return {
          select: vi.fn().mockResolvedValue({ data: notes, error: null }),
        }
      }),
    })

    const result = await handler(mockEvent)

    expect(result.configs).toHaveLength(2)
    expect(result.usage).toEqual({
      installation: { service: 2, general: 1 },
      location:     { inspection: 1 },
    })
  })

  it('returns empty usage when no notes exist', async () => {
    let callCount = 0
    mockSR.mockReturnValue({
      from: vi.fn().mockImplementation(() => {
        if (callCount === 0) {
          callCount++
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
      }),
    })

    const result = await handler(mockEvent)
    expect(result.configs).toEqual([])
    expect(result.usage).toEqual({})
  })

  it('throws 500 when configs fetch fails', async () => {
    mockSR.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
        }),
      }),
    })

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 })
  })
})
