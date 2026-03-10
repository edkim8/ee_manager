/**
 * POST /api/solver/save-snapshot
 *
 * Tests for the availability snapshot persistence route.
 * Uses service_role to bypass RLS (Option B — H-061).
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

import handler from '../../../../../layers/admin/server/api/solver/save-snapshot.post'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockEvent = { context: {}, node: { req: {}, res: {} } } as any

const VALID_BODY = {
  property_code:         'RS',
  snapshot_date:         '2026-03-09',
  solver_run_id:         'run-abc123',
  available_count:       5,
  applied_count:         2,
  leased_count:          3,
  occupied_count:        90,
  total_active_count:    100,
  total_units:           105,
  avg_market_rent:       1500,
  avg_offered_rent:      1480,
  avg_contracted_rent:   1490,
  avg_days_on_market:    12,
  avg_concession_days:   7,
  avg_concession_amount: 100,
  price_changes_count:   0,
}

function makeUpsertChain(error: unknown = null) {
  return {
    from:   vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error }),
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/solver/save-snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: authenticated user
    mockUser.mockResolvedValue({ id: 'user-xyz', email: 'test@test.com' })
    // Default: readBody returns valid snapshot body
    vi.stubGlobal('readBody', async () => ({ ...VALID_BODY }))
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

  it('throws 400 when property_code is missing', async () => {
    vi.stubGlobal('readBody', async () => ({ snapshot_date: '2026-03-09' }))

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('throws 400 when snapshot_date is missing', async () => {
    vi.stubGlobal('readBody', async () => ({ property_code: 'RS' }))

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('throws 400 when both required fields are missing', async () => {
    vi.stubGlobal('readBody', async () => ({}))

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  // ── DB interaction ─────────────────────────────────────────────────────────

  it('calls upsert on availability_snapshots with onConflict', async () => {
    const chain = makeUpsertChain()
    mockSR.mockReturnValue(chain)

    await (handler as Function)(mockEvent)

    expect(chain.from).toHaveBeenCalledWith('availability_snapshots')
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        property_code: 'RS',
        snapshot_date: '2026-03-09',
      }),
      { onConflict: 'property_code,snapshot_date', ignoreDuplicates: true }
    )
  })

  it('includes all snapshot metric fields in the upsert payload', async () => {
    const chain = makeUpsertChain()
    mockSR.mockReturnValue(chain)

    await (handler as Function)(mockEvent)

    const [payload] = chain.upsert.mock.calls[0]
    expect(payload).toMatchObject({
      solver_run_id:         'run-abc123',
      available_count:       5,
      applied_count:         2,
      leased_count:          3,
      occupied_count:        90,
      total_active_count:    100,
      total_units:           105,
      avg_market_rent:       1500,
      avg_offered_rent:      1480,
      avg_contracted_rent:   1490,
      avg_days_on_market:    12,
      avg_concession_days:   7,
      avg_concession_amount: 100,
      price_changes_count:   0,
    })
  })

  it('returns success object with property_code and snapshot_date', async () => {
    const chain = makeUpsertChain()
    mockSR.mockReturnValue(chain)

    const result = await (handler as Function)(mockEvent)

    expect(result).toEqual({
      success:       true,
      property_code: 'RS',
      snapshot_date: '2026-03-09',
    })
  })

  // ── DB error handling ──────────────────────────────────────────────────────

  it('throws 500 when Supabase returns an error', async () => {
    const chain = makeUpsertChain({ message: 'unique constraint violation' })
    mockSR.mockReturnValue(chain)

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode: 500,
    })
  })

  it('does not throw when Supabase returns null error (success)', async () => {
    const chain = makeUpsertChain(null)
    mockSR.mockReturnValue(chain)

    await expect((handler as Function)(mockEvent)).resolves.toBeDefined()
  })

  // ── Each property code ─────────────────────────────────────────────────────

  it.each(['RS', 'SB', 'CV', 'OB', 'WO'])(
    'handles property_code "%s" correctly',
    async (propertyCode) => {
      vi.stubGlobal('readBody', async () => ({
        property_code: propertyCode,
        snapshot_date: '2026-03-09',
      }))
      const chain = makeUpsertChain()
      mockSR.mockReturnValue(chain)

      const result = await (handler as Function)(mockEvent)

      expect(result.property_code).toBe(propertyCode)
    }
  )
})
