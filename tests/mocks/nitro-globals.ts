/**
 * Nitro auto-import globals for Vitest server route tests.
 *
 * Nitro injects defineEventHandler, createError, getRouterParam, and readBody
 * as globals at build time. In Vitest they are undefined. This setup file
 * provides minimal stubs so server route files can be imported and called
 * directly in tests. Individual test files may override via vi.stubGlobal or
 * by returning controlled values from vi.mock('#supabase/server', ...).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Allow tests to call the handler function directly
;(globalThis as any).defineEventHandler = (fn: (...args: any[]) => any) => fn

// Standard H3 error factory used inside route throw statements
;(globalThis as any).createError = ({
  statusCode,
  statusMessage,
}: {
  statusCode: number
  statusMessage?: string
}) => {
  const err = new Error(statusMessage ?? String(statusCode)) as any
  err.statusCode = statusCode
  err.statusMessage = statusMessage
  return err
}

// Route-param helper — default returns undefined; tests stub via vi.stubGlobal
;(globalThis as any).getRouterParam = (_event: any, _name: string): string | undefined =>
  undefined

// Body-read helper — default returns empty object; tests stub via vi.stubGlobal
;(globalThis as any).readBody = async (_event: any): Promise<any> => ({})
