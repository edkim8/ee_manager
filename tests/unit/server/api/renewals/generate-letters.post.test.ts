/**
 * B-025: POST /api/renewals/generate-letters — Limit checks & 503 errors
 *
 * Run in plain Node environment so vi.mock('node:*') intercepts built-ins.
 * (The default nuxt environment uses Vite's browser-like module graph which
 *  bypasses Node built-in mocks, causing real Chrome to run in tests.)
 *
 * @vitest-environment node
 *
 * Nitro globals (defineEventHandler, createError, readBody, setResponseHeaders)
 * are provided by tests/mocks/nitro-globals.ts (loaded via setupFiles).
 *
 * Strategy:
 * - Mock node:fs/promises `access` to control Chrome binary detection.
 *   Reject → Chrome not found (503).  Resolve → Chrome found.
 * - Mock node:child_process `execFile` + node:util `promisify` so that
 *   the execFileAsync wrapper resolves immediately on the success path.
 * - Mock writeFile / readFile / unlink to avoid real filesystem I/O.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockAccess,
  mockWriteFile,
  mockReadFile,
  mockUnlink,
  mockExecFileRaw,
} = vi.hoisted(() => ({
  mockAccess:      vi.fn(),
  mockWriteFile:   vi.fn(),
  mockReadFile:    vi.fn(),
  mockUnlink:      vi.fn(),
  mockExecFileRaw: vi.fn(),
}))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    access:    mockAccess,
    writeFile: mockWriteFile,
    readFile:  mockReadFile,
    unlink:    mockUnlink,
    constants: { X_OK: 1, R_OK: 4 },
  }
})

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>()
  return { ...actual, execFile: mockExecFileRaw }
})

// promisify(execFile) → return our mock directly as an async fn
vi.mock('node:util', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:util')>()
  return {
    ...actual,
    promisify: (_fn: unknown) => async (...args: unknown[]) => mockExecFileRaw(...args),
  }
})

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>()
  return { ...actual, tmpdir: () => '/tmp' }
})

vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>()
  return { ...actual, randomUUID: () => 'test-uuid-1234' }
})

// ─── #supabase/server ─────────────────────────────────────────────────────────

const { mockServerSupabaseUser, mockServiceRole } = vi.hoisted(() => ({
  mockServerSupabaseUser: vi.fn(),
  mockServiceRole:        vi.fn(),
}))

vi.mock('#supabase/server', () => ({
  serverSupabaseUser:        mockServerSupabaseUser,
  serverSupabaseServiceRole: mockServiceRole,
}))

// ─── Import handler AFTER mocks ───────────────────────────────────────────────

import handler from '../../../../../layers/ops/server/api/renewals/generate-letters.post'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockEvent = { context: {}, node: { req: {}, res: {} } } as any

const validRow = {
  unit:             '1017',
  resident_name:    'Paul Gonzales',
  lease_to_date:    '2025-12-31',
  primary_term:     12,
  primary_rent:     1538,
  first_term:       11,
  first_term_rent:  1493,
  second_term:      14,
  second_term_rent: 1583,
  mtm_rent:         2100,
  current_rent:     1493,
}

/** Build a Supabase chain that resolves .maybeSingle() with data/error */
function makeTemplateChain(data: unknown = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error: null })
  const eq          = vi.fn().mockReturnValue({ maybeSingle })
  const select      = vi.fn().mockReturnValue({ eq })
  const from        = vi.fn().mockReturnValue({ select })
  return { from, select, eq, maybeSingle }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/renewals/generate-letters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default readBody: valid payload with 1 row
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({
      rows:         [validRow],
      propertyCode: 'RS',
    }))
    vi.stubGlobal('setResponseHeaders', vi.fn())
    // Default: authenticated user
    mockServerSupabaseUser.mockResolvedValue({ id: 'user-1' })
    // Default: Chrome not found (all access checks reject)
    mockAccess.mockRejectedValue(new Error('ENOENT'))
    // Default: template not found (null data)
    mockServiceRole.mockReturnValue(makeTemplateChain(null))
    // Default: file operations succeed
    mockWriteFile.mockResolvedValue(undefined)
    mockReadFile.mockResolvedValue(Buffer.from('%PDF-1.4'))
    mockUnlink.mockResolvedValue(undefined)
    mockExecFileRaw.mockResolvedValue({ stdout: '', stderr: '' })
  })

  // ── Auth guard ─────────────────────────────────────────────────────────────

  it('throws 401 when user is not authenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null)

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('does not proceed past auth check when unauthenticated', async () => {
    mockServerSupabaseUser.mockResolvedValue(null)
    await expect((handler as Function)(mockEvent)).rejects.toBeDefined()
    expect(mockServiceRole).not.toHaveBeenCalled()
  })

  // ── Input validation ───────────────────────────────────────────────────────

  it('throws 400 when rows is missing from body', async () => {
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ propertyCode: 'RS' }))

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('throws 400 when rows is an empty array', async () => {
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ rows: [], propertyCode: 'RS' }))

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode:    400,
      statusMessage: 'Missing or empty rows array',
    })
  })

  it('throws 400 when rows is not an array', async () => {
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ rows: 'not-an-array', propertyCode: 'RS' }))

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  // ── B-025: Limit check ─────────────────────────────────────────────────────

  it('throws 400 when rows exceeds the 200-row limit', async () => {
    const tooManyRows = Array.from({ length: 201 }, (_, i) => ({ ...validRow, unit: String(i) }))
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ rows: tooManyRows, propertyCode: 'RS' }))

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode:    400,
      statusMessage: 'Maximum 200 letters per request',
    })
  })

  it('does not throw 400 for exactly 200 rows (boundary passes limit check)', async () => {
    const exactlyAtLimit = Array.from({ length: 200 }, (_, i) => ({ ...validRow, unit: String(i) }))
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ rows: exactlyAtLimit, propertyCode: 'RS' }))
    // Chrome not found → 503 (not 400); proves the 200-row limit is not triggered
    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode: 503,
    })
  })

  // ── B-025: Chrome missing (503) ────────────────────────────────────────────

  it('throws 503 when no Chrome binary is found on the system', async () => {
    // mockAccess already rejects for all candidates (set in beforeEach)

    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({
      statusCode:    503,
      statusMessage: expect.stringContaining('Chrome'),
    })
  })

  it('throws 503 before querying the DB (Chrome check precedes Supabase call)', async () => {
    await expect((handler as Function)(mockEvent)).rejects.toMatchObject({ statusCode: 503 })
    // The Supabase service-role client should not have been called yet
    expect(mockServiceRole).not.toHaveBeenCalled()
  })

  // ── Success path ───────────────────────────────────────────────────────────

  it('returns PDF buffer when Chrome is found and execFile succeeds', async () => {
    // Make first access check succeed (Chrome found at first candidate)
    mockAccess.mockResolvedValueOnce(undefined)

    const fakePdf = Buffer.from('%PDF-1.4')
    mockReadFile.mockResolvedValue(fakePdf)

    const result = await (handler as Function)(mockEvent)

    expect(result).toEqual(fakePdf)
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('renewal-letters-'),
      expect.any(String),
      'utf8'
    )
    expect(mockExecFileRaw).toHaveBeenCalledWith(
      expect.stringContaining('Chrome'),
      expect.arrayContaining(['--headless=new', '--no-sandbox']),
      expect.objectContaining({ timeout: expect.any(Number) }),
    )
  })

  it('uses DB template community_name when available', async () => {
    mockAccess.mockResolvedValueOnce(undefined)
    mockServiceRole.mockReturnValue(makeTemplateChain({
      community_name: 'Custom Community Name',
      manager_name:   'Jane Smith',
      manager_phone:  '555-9999',
      letterhead_url: null,
    }))

    await (handler as Function)(mockEvent)

    // HTML should have been written with the community name embedded
    const htmlWritten = mockWriteFile.mock.calls[0][1] as string
    expect(htmlWritten).toContain('Custom Community Name')
  })

  it('cleans up temp files even when execFile throws', async () => {
    mockAccess.mockResolvedValueOnce(undefined)
    mockExecFileRaw.mockRejectedValue(new Error('Chrome crashed'))

    await expect((handler as Function)(mockEvent)).rejects.toThrow()
    // The finally block should have called unlink for both html and pdf paths
    expect(mockUnlink).toHaveBeenCalledTimes(2)
  })
})
