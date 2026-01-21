# Spec: Testing Infrastructure (QA Foundation)

## Goal
Establish a "Zero-Trust" verification layer by implementing Unit (Vitest) and End-to-End (Playwright) testing frameworks. This ensures future features like Assets and Leasing can be verified automatically.

## Requirements

### 1. Dependencies
- **Unit Testing**: `vitest`, `@nuxt/test-utils` (Runtime environment for components/composables).
- **E2E Testing**: `playwright` (Browser automation).
- **Environment**: `jsdom` or `happy-dom` (DOM simulation for Unit tests).

### 2. Configuration
- **`vitest.config.ts`**:
  - Must define the Nuxt environment.
  - Enable globals if preferred, or imports.
- **`package.json` Scripts**:
  - `"test:unit": "vitest run"`
  - `"test:unit:watch": "vitest"`
  - `"test:e2e": "playwright test"`

### 3. Directory Structure
- `tests/` (Root)
  - `unit/` (Logic & Component tests)
  - `e2e/` (Playwright specs)
  - `setup.ts` (Global setup if needed)

### 4. Proof of Life
- Create `tests/unit/setup.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest'

  describe('QA Infrastructure', () => {
    it('is alive', () => {
      expect(true).toBe(true)
    })
  })
  ```

## Implementation Steps (Builder Instructions)

1.  **Install**: `npm install -D vitest @nuxt/test-utils playwright happy-dom`.
2.  **Config**: Create `vitest.config.ts` at project root.
    ```typescript
    import { defineVitestConfig } from '@nuxt/test-utils/config'

    export default defineVitestConfig({
      test: {
        environment: 'nuxt',
      }
    })
    ```
3.  **Scripts**: Add test scripts to `package.json`.
4.  **Verify**: Run `npm run test:unit` and ensure the proof-of-life test passes.

## verification
- [ ] Automated: `npm run test:unit` returns Pass.
- [ ] Manual: `package.json` contains new scripts.
