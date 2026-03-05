import { defineVitestConfig } from '@nuxt/test-utils/config'
import path from 'path'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    setupFiles: ['./tests/mocks/nitro-globals.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['layers/**'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.d.ts',
        '.nuxt/**',
      ],
      all: true, // Include all files in coverage, even those not tested
    },
  },
  resolve: {
    alias: {
      // #supabase/server is a Nitro-only virtual module unavailable in the
      // browser-like nuxt test environment. This alias points to a real file
      // that satisfies Vite's import resolution. Individual test files then
      // use vi.mock('#supabase/server', factory) to configure per-test mocks.
      '#supabase/server': path.resolve('./tests/mocks/supabase-server.ts'),
    },
  },
})
