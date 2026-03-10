/**
 * POST /api/solver/update-tenancy-status
 *
 * Tests for the tenancy status transition route (H-075 RLS gap fix).
 * Uses service_role to bypass the RLS policy that silently blocks
 * authenticated-JWT status updates on tenancies.
 *
 * Test strategy:
 *  - Mock #supabase/server to avoid real DB connections.
 *  - Stub readBody via vi.stubGlobal to control request body.
 *  - Handler is exported directly as a function via the defineEventHandler stub
 *    in tests/mocks/nitro-globals.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Hoist mocks ─────────────────────────────────────────────────────────────

const { mockUser, mockSR } = vi.hoisted(() => ({
  mockUser: vi.fn(),
  mockSR:   vi.fn(),
}))

vi.mock('#supabase/server', () => ({
  serverSupabaseUser:        mockUser,
  serverSupabaseServiceRole: mockSR,
}))

// ─── Import handler AFTER mocks ───────────────────────────────────────────────

import handler from '../../../../../layers/admin/server/api/solver/update-tenancy-status.post'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockEvent = { context: {}, node: { req: {}, res: {} } } as any

/**
 * Build a Supabase client chain that simulates the fluent
 * .from().update().in('id', ids).select('id') pattern.
 */
function makeUpdateChain(data: { id: string }[] | null, error: unknown = null) {
  const selectMock = vi.fn().mockResolvedValue({ data, error })
  const inMock     = vi.fn().mockReturnValue({ select: selectMock })
  const updateMock = vi.fn().mockReturnValue({ in: inMock })
  const fromMock   = vi.fn().mockReturnValue({ update: updateMock })

  return {
    from:   fromMock,
    update: updateMock,
    in:     inMock,
    select: selectMock,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/solver/update-tenancy-status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.mockResolvedValue({ id: 'user-xyz', email: 'solver@test.com' })
    // Default: empty arrays — no transitions
    vi.stubGlobal('readBody', async () => ({
      toPastIds:     [],
      toCanceledIds: [],
      propertyCode:  'RS',
    }))
  })

  // ── Auth guard ─────────────────────────────────────────────────────────────

  it('throws 401 when user is not authenticated', async () => {
    mockUser.mockResolvedValue(null)

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('does not call service role client when auth fails', async () => {
    mockUser.mockResolvedValue(null)

    await expect((handler as Function)(mockEvent)).rejects.toBeDefined()
    expect(mockSR).not.toHaveBeenCalled()
  })

  // ── Input validation ───────────────────────────────────────────────────────

  it('throws 400 when toPastIds is not an array', async () => {
    vi.stubGlobal('readBody', async () => ({
      toPastIds:     'not-an-array',
      toCanceledIds: [],
    }))

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('throws 400 when toCanceledIds is not an array', async () => {
    vi.stubGlobal('readBody', async () => ({
      toPastIds:     [],
      toCanceledIds: 'also-not-an-array',
    }))

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('throws 400 when both arrays are invalid', async () => {
    vi.stubGlobal('readBody', async () => ({
      toPastIds:     null,
      toCanceledIds: 123,
    }))

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  // ── Empty arrays — no DB calls ─────────────────────────────────────────────

  it('returns zero counts when both arrays are empty', async () => {
    const chain = makeUpdateChain([])
    mockSR.mockReturnValue(chain)

    const result = await (handler as Function)(mockEvent)

    expect(result).toEqual({ past: 0, canceled: 0, errors: [] })
  })

  it('does not call from() when both arrays are empty', async () => {
    const chain = makeUpdateChain([])
    mockSR.mockReturnValue(chain)

    await (handler as Function)(mockEvent)

    expect(chain.from).not.toHaveBeenCalled()
  })

  // ── Past transitions ───────────────────────────────────────────────────────

  it('calls update with status Past for toPastIds', async () => {
    vi.stubGlobal('readBody', async () => ({
      toPastIds:     ['t-001', 't-002'],
      toCanceledIds: [],
      propertyCode:  'SB',
    }))
    const chain = makeUpdateChain([{ id: 't-001' }, { id: 't-002' }])
    mockSR.mockReturnValue(chain)

    const result = await (handler as Function)(mockEvent)

    expect(chain.from).toHaveBeenCalledWith('tenancies')
    expect(chain.update).toHaveBeenCalledWith({ status: 'Past' })
    expect(chain.in).toHaveBeenCalledWith('id', ['t-001', 't-002'])
    expect(result.past).toBe(2)
    expect(result.canceled).toBe(0)
  })

  // ── Canceled transitions ───────────────────────────────────────────────────

  it('calls update with status Canceled for toCanceledIds', async () => {
    vi.stubGlobal('readBody', async () => ({
      toPastIds:     [],
      toCanceledIds: ['t-010', 't-011', 't-012'],
      propertyCode:  'CV',
    }))
    const chain = makeUpdateChain([{ id: 't-010' }, { id: 't-011' }, { id: 't-012' }])
    mockSR.mockReturnValue(chain)

    const result = await (handler as Function)(mockEvent)

    expect(chain.update).toHaveBeenCalledWith({ status: 'Canceled' })
    expect(chain.in).toHaveBeenCalledWith('id', ['t-010', 't-011', 't-012'])
    expect(result.canceled).toBe(3)
    expect(result.past).toBe(0)
  })

  // ── Mixed Past + Canceled ──────────────────────────────────────────────────

  it('handles both Past and Canceled transitions in the same call', async () => {
    vi.stubGlobal('readBody', async () => ({
      toPastIds:     ['p-001'],
      toCanceledIds: ['c-001', 'c-002'],
      propertyCode:  'OB',
    }))

    // The handler creates ONE client and calls .from() twice — once for Past,
    // once for Canceled. We track .from() invocations to return the right data.
    const pastSelectMock     = vi.fn().mockResolvedValue({ data: [{ id: 'p-001' }], error: null })
    const canceledSelectMock = vi.fn().mockResolvedValue({ data: [{ id: 'c-001' }, { id: 'c-002' }], error: null })
    let fromCallCount = 0

    const client = {
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        const selectMock = fromCallCount === 1 ? pastSelectMock : canceledSelectMock
        return { update: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ select: selectMock }) }) }
      }),
    }
    mockSR.mockReturnValue(client)

    const result = await (handler as Function)(mockEvent)

    expect(result.past).toBe(1)
    expect(result.canceled).toBe(2)
    expect(result.errors).toHaveLength(0)
  })

  // ── DB error handling ──────────────────────────────────────────────────────

  it('accumulates errors without throwing when Past update fails', async () => {
    vi.stubGlobal('readBody', async () => ({
      toPastIds:     ['t-bad'],
      toCanceledIds: [],
      propertyCode:  'WO',
    }))
    const chain = makeUpdateChain(null, { message: 'permission denied' })
    mockSR.mockReturnValue(chain)

    const result = await (handler as Function)(mockEvent)

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('Past error')
    expect(result.past).toBe(0)
  })

  it('accumulates errors without throwing when Canceled update fails', async () => {
    vi.stubGlobal('readBody', async () => ({
      toPastIds:     [],
      toCanceledIds: ['t-bad'],
      propertyCode:  'RS',
    }))
    const chain = makeUpdateChain(null, { message: 'row level security policy violation' })
    mockSR.mockReturnValue(chain)

    const result = await (handler as Function)(mockEvent)

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('Canceled error')
    expect(result.canceled).toBe(0)
  })

  // ── 0-row warning (not an error, but count stays 0) ───────────────────────

  it('returns past count of 0 when DB returns empty data array (0 rows affected)', async () => {
    vi.stubGlobal('readBody', async () => ({
      toPastIds:     ['stale-id'],
      toCanceledIds: [],
      propertyCode:  'RS',
    }))
    // data = [] means the .select() returned no matching rows
    const chain = makeUpdateChain([])
    mockSR.mockReturnValue(chain)

    const result = await (handler as Function)(mockEvent)

    expect(result.past).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  // ── Chunking (> 1000 IDs) ─────────────────────────────────────────────────

  it('processes toPastIds in chunks of 1000', async () => {
    const ids = Array.from({ length: 1500 }, (_, i) => `t-${String(i).padStart(4, '0')}`)

    vi.stubGlobal('readBody', async () => ({
      toPastIds:     ids,
      toCanceledIds: [],
      propertyCode:  'RS',
    }))

    // The handler creates ONE client. .from() is called once per chunk.
    // Track which IDs each .in() call receives.
    const inCalls: string[][] = []

    let chunkCallIdx = 0
    const chunkResults = [
      // Chunk 1: 1000 rows returned
      new Array(1000).fill(0).map((_, i) => ({ id: `t-${String(i).padStart(4, '0')}` })),
      // Chunk 2: 500 rows returned
      new Array(500).fill(0).map((_, i) => ({ id: `t-${String(1000 + i).padStart(4, '0')}` })),
    ]

    const client = {
      from: vi.fn().mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockImplementation((_col: string, chunkIds: string[]) => {
            inCalls.push(chunkIds)
            const result = chunkResults[chunkCallIdx++] ?? []
            return { select: vi.fn().mockResolvedValue({ data: result, error: null }) }
          }),
        }),
      })),
    }
    mockSR.mockReturnValue(client)

    const result = await (handler as Function)(mockEvent)

    // Two .from() calls — one per chunk
    expect(client.from).toHaveBeenCalledTimes(2)
    // First chunk covers IDs 0–999
    expect(inCalls[0]).toEqual(ids.slice(0, 1000))
    // Second chunk covers IDs 1000–1499
    expect(inCalls[1]).toEqual(ids.slice(1000))
    // Total past = 1000 + 500 = 1500
    expect(result.past).toBe(1500)
  })

  // ── Default propertyCode ───────────────────────────────────────────────────

  it('defaults propertyCode to UNKNOWN when not provided', async () => {
    vi.stubGlobal('readBody', async () => ({
      toPastIds:     [],
      toCanceledIds: [],
      // No propertyCode
    }))
    const chain = makeUpdateChain([])
    mockSR.mockReturnValue(chain)

    // Should not throw — UNKNOWN is the fallback
    await expect((handler as Function)(mockEvent)).resolves.toEqual({
      past:     0,
      canceled: 0,
      errors:   [],
    })
  })
})
