/**
 * B-001 + B-015: useInventoryInstallations composable
 *
 * Environmental fix: `vi.mock('#imports', ...)` does NOT intercept Nuxt auto-imports
 * because Nuxt's Vite plugin resolves `#imports` to actual module paths at transform
 * time. The correct pattern is `mockNuxtImport` from `@nuxt/test-utils/runtime`, which
 * generates the correct vi.mock call for the resolved module path.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

// vi.hoisted ensures these mock functions are created before any imports,
// so they're available in the mockNuxtImport factory (which becomes a hoisted vi.mock).
const { mockSingle, mockEq, mockSelect, mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockEq     = vi.fn()
  const mockSelect = vi.fn()
  const mockFrom   = vi.fn()
  return { mockSingle, mockEq, mockSelect, mockFrom }
})

// B-001: The correct way to mock a Nuxt auto-imported composable in Vitest.
// This generates a vi.mock for the resolved module path of useSupabaseClient.
mockNuxtImport('useSupabaseClient', () => {
  return () => ({ from: mockFrom })
})

import { useInventoryInstallations } from '../../../../layers/base/composables/useInventoryInstallations'

describe('useInventoryInstallations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-establish the query builder chain after clearAllMocks resets return values.
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ eq: mockEq, single: mockSingle })
  })

  // B-015: findByAssetTag DB lookup
  describe('findByAssetTag', () => {
    it('returns the installation record when found', async () => {
      const { findByAssetTag } = useInventoryInstallations()
      const mockData = { id: '123', asset_tag: 'TAG1', property_code: 'CV' }
      mockSingle.mockResolvedValue({ data: mockData, error: null })

      const result = await findByAssetTag('CV', 'TAG1')

      expect(mockFrom).toHaveBeenCalledWith('view_inventory_installations')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('property_code', 'CV')
      expect(mockEq).toHaveBeenCalledWith('asset_tag', 'TAG1')
      expect(result).toEqual(mockData)
    })

    it('returns null for PGRST116 (not found — expected path)', async () => {
      const { findByAssetTag } = useInventoryInstallations()
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const result = await findByAssetTag('CV', 'MISSING-TAG')

      expect(result).toBeNull()
    })

    it('throws for any other database error', async () => {
      const { findByAssetTag } = useInventoryInstallations()
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: '42P01', message: 'relation does not exist' },
      })

      await expect(findByAssetTag('CV', 'TAG1')).rejects.toMatchObject({
        message: 'relation does not exist',
      })
    })

    it('queries view_inventory_installations (not the base table)', async () => {
      const { findByAssetTag } = useInventoryInstallations()
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: '' } })

      await findByAssetTag('RS', 'SOME-TAG')

      expect(mockFrom).toHaveBeenCalledWith('view_inventory_installations')
      expect(mockFrom).not.toHaveBeenCalledWith('inventory_installations')
    })

    it('scopes query to property_code before asset_tag', async () => {
      const { findByAssetTag } = useInventoryInstallations()
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: '' } })

      await findByAssetTag('SB', 'TAG-99')

      const calls = mockEq.mock.calls
      const propCall = calls.find(c => c[0] === 'property_code')
      const tagCall  = calls.find(c => c[0] === 'asset_tag')
      expect(propCall).toEqual(['property_code', 'SB'])
      expect(tagCall).toEqual(['asset_tag', 'TAG-99'])
    })
  })
})
