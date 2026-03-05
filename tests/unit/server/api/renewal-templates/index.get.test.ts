/**
 * B-023: GET /api/renewal-templates — Auth guard (401 response)
 *
 * Strategy for testing Nitro server route handlers in Vitest:
 * - Mock h3 so that `defineEventHandler` (a Nitro global) simply returns the
 *   inner async function. This lets us call the handler directly in tests.
 * - Mock `#supabase/server` to control `serverSupabaseUser` and
 *   `serverSupabaseServiceRole` without real DB connections.
 * - Create a minimal mock H3Event object satisfying the handler's needs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock h3 first (hoisted), so defineEventHandler/createError work ─────────
// The server route uses these as Nitro auto-import globals (no explicit import).
// We intercept the h3 module so the route's defineEventHandler just returns
// the inner handler function directly, making it callable in tests.

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    // Return the handler fn directly instead of wrapping it
    defineEventHandler: (fn: Function) => fn,
    createError: ({ statusCode, statusMessage }: { statusCode: number; statusMessage?: string }) => {
      const err = new Error(statusMessage ?? String(statusCode)) as any
      err.statusCode = statusCode
      err.statusMessage = statusMessage
      return err
    },
  }
})

// ─── Mock #supabase/server ────────────────────────────────────────────────────

const { mockServerSupabaseUser, mockServiceRole } = vi.hoisted(() => ({
  mockServerSupabaseUser: vi.fn(),
  mockServiceRole:        vi.fn(),
}))

vi.mock('#supabase/server', () => ({
  serverSupabaseUser:        mockServerSupabaseUser,
  serverSupabaseServiceRole: mockServiceRole,
}))

// ─── Import handler AFTER mocks are set up ────────────────────────────────────

import handler from '../../../../../layers/admin/server/api/renewal-templates/index.get'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockEvent = { context: {}, node: { req: {}, res: {} } } as any

function makeSupabaseChain(data: unknown, error: unknown = null) {
  const chain = {
    from:   vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order:  vi.fn().mockResolvedValue({ data, error }),
  }
  return chain
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/renewal-templates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // B-023: Auth guard
  it('throws 401 when user is not authenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null)

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('does not call the Supabase client when auth fails', async () => {
    mockServerSupabaseUser.mockResolvedValue(null)

    await expect((handler as Function)(mockEvent)).rejects.toBeDefined()
    expect(mockServiceRole).not.toHaveBeenCalled()
  })

  it('returns template data when user is authenticated', async () => {
    const mockData = [
      { property_code: 'RS', community_name: 'Residences at 4225' },
      { property_code: 'SB', community_name: 'Stoneybrook' },
    ]
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-123', email: 'test@test.com' })
    mockServiceRole.mockReturnValue(makeSupabaseChain(mockData))

    const result = await (handler as Function)(mockEvent)

    expect(result).toEqual(mockData)
  })

  it('queries renewal_letter_templates ordered by property_code', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-123' })
    const chain = makeSupabaseChain([])
    mockServiceRole.mockReturnValue(chain)

    await (handler as Function)(mockEvent)

    expect(chain.from).toHaveBeenCalledWith('renewal_letter_templates')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.order).toHaveBeenCalledWith('property_code')
  })

  it('throws 500 when Supabase returns an error', async () => {
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-123' })
    mockServiceRole.mockReturnValue(makeSupabaseChain(null, { message: 'DB error' }))

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
