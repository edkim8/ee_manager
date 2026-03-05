/**
 * Test stub for the #supabase/server Nitro virtual module.
 *
 * This file is mapped via the vitest.config.ts `resolve.alias` to satisfy
 * Vite's import resolution when server route handlers are imported in tests.
 * Individual test files use vi.mock('#supabase/server', ...) to configure
 * per-test behavior.
 */
import { vi } from 'vitest'

export const serverSupabaseUser        = vi.fn()
export const serverSupabaseServiceRole = vi.fn()
export const serverSupabaseClient      = vi.fn()
