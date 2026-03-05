/**
 * B-024: PATCH /api/renewal-templates/:code — Field whitelist & validation
 *
 * Nitro globals (defineEventHandler, createError, getRouterParam, readBody)
 * are provided by tests/mocks/nitro-globals.ts (setupFiles in vitest.config.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock #supabase/server ────────────────────────────────────────────────────

const { mockServerSupabaseUser, mockServiceRole } = vi.hoisted(() => ({
  mockServerSupabaseUser: vi.fn(),
  mockServiceRole:        vi.fn(),
}))

vi.mock('#supabase/server', () => ({
  serverSupabaseUser:        mockServerSupabaseUser,
  serverSupabaseServiceRole: mockServiceRole,
}))

// ─── Import handler AFTER mocks ───────────────────────────────────────────────

import handler from '../../../../../layers/admin/server/api/renewal-templates/[code].patch'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockEvent = { context: {}, node: { req: {}, res: {} } } as any

/** Supabase upsert chain that resolves to the given data/error */
function makeUpsertChain(data: unknown, error: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data, error })
  const select = vi.fn().mockReturnValue({ single })
  const upsert  = vi.fn().mockReturnValue({ select })
  return {
    from:   vi.fn().mockReturnValue({ upsert }),
    upsert,
    select,
    single,
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PATCH /api/renewal-templates/:code', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset Nitro globals to safe defaults before each test
    vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue('RS'))
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ community_name: 'Test Community' }))
  })

  // ── Auth guard ─────────────────────────────────────────────────────────────

  it('throws 401 when user is not authenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null)

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('does not call Supabase client when auth fails', async () => {
    mockServerSupabaseUser.mockResolvedValue(null)
    await expect((handler as Function)(mockEvent)).rejects.toBeDefined()
    expect(mockServiceRole).not.toHaveBeenCalled()
  })

  // ── Param / body validation ────────────────────────────────────────────────

  it('throws 400 when route param code is missing', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-1' })
    vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue(undefined))

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('throws 400 when body is missing', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-1' })
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue(null))

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Missing body',
    })
  })

  it('throws 400 when body is not an object', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-1' })
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue('not-an-object'))

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Missing body',
    })
  })

  // ── Field whitelist ────────────────────────────────────────────────────────

  it('throws 400 when body contains only disallowed fields', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-1' })
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({
      // These should all be rejected by the whitelist
      property_code: 'HACKED',
      is_active:     false,
      created_at:    '2000-01-01',
    }))

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'No valid fields to update',
    })
  })

  it('strips disallowed fields and only upserts the allowed ones', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-1' })
    const chain = makeUpsertChain({ property_code: 'RS', community_name: 'Residences' })
    mockServiceRole.mockReturnValue(chain)

    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({
      community_name: 'Residences',
      manager_name:   'John Doe',
      property_code:  'INJECTED',   // disallowed — should be stripped
      is_active:      false,        // disallowed — should be stripped
    }))

    await (handler as Function)(mockEvent)

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        community_name: 'Residences',
        manager_name:   'John Doe',
        property_code:  'RS',       // comes from the route param, not the body
      }),
      expect.any(Object)
    )
    // injected/disallowed keys must NOT appear in the upsert payload
    const upsertArg = chain.upsert.mock.calls[0][0]
    expect(upsertArg).not.toHaveProperty('is_active')
  })

  it('accepts all five whitelisted fields without error', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-1' })
    const chain = makeUpsertChain({ property_code: 'RS' })
    mockServiceRole.mockReturnValue(chain)

    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({
      community_name:    'Residences at 4225',
      manager_name:      'Alice Manager',
      manager_phone:     '555-1234',
      letterhead_url:    'https://storage.example.com/lh.png',
      docx_template_url: 'https://storage.example.com/tpl.docx',
    }))

    const result = await (handler as Function)(mockEvent)
    expect(result).toEqual({ property_code: 'RS' })
  })

  it('upserts with onConflict: property_code and includes updated_at', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-1' })
    const chain = makeUpsertChain({})
    mockServiceRole.mockReturnValue(chain)

    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ community_name: 'Test' }))
    vi.stubGlobal('getRouterParam', vi.fn().mockReturnValue('SB'))

    await (handler as Function)(mockEvent)

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ updated_at: expect.any(String) }),
      { onConflict: 'property_code' }
    )
    // Code should be upper-cased from param
    expect(chain.upsert.mock.calls[0][0].property_code).toBe('SB')
  })

  // ── DB error ───────────────────────────────────────────────────────────────

  it('throws 500 when Supabase returns an error', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-1' })
    const chain = makeUpsertChain(null, { message: 'constraint violation' })
    mockServiceRole.mockReturnValue(chain)

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
