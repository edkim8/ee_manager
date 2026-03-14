/**
 * @vitest-environment node
 *
 * Unit tests for the context-filter logic used in the Installations page.
 * The page reads unit_id / building_id / location_id query params and narrows
 * the installation list to just that location context.
 */
import { describe, it, expect } from 'vitest'

// ── Pure helper replicated from the page (no Vue reactivity needed) ─────────

type Installation = {
  location_type: string
  location_id: string
  [key: string]: any
}

function applyContextFilter(
  installations: Installation[],
  context: { unitId?: string; buildingId?: string; locationId?: string }
): Installation[] {
  return installations.filter(inst => {
    if (context.unitId     && !(inst.location_type === 'unit'        && inst.location_id === context.unitId))     return false
    if (context.buildingId && !(inst.location_type === 'building'    && inst.location_id === context.buildingId)) return false
    if (context.locationId && !(inst.location_type === 'common_area' && inst.location_id === context.locationId)) return false
    return true
  })
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const UNIT_1    = 'unit-uuid-1'
const UNIT_2    = 'unit-uuid-2'
const BLDG_1    = 'bldg-uuid-1'
const COMMON_1  = 'common-uuid-1'

const installations: Installation[] = [
  { id: 'a', location_type: 'unit',        location_id: UNIT_1 },
  { id: 'b', location_type: 'unit',        location_id: UNIT_2 },
  { id: 'c', location_type: 'building',    location_id: BLDG_1 },
  { id: 'd', location_type: 'common_area', location_id: COMMON_1 },
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('applyContextFilter', () => {
  it('returns all installations when no context is provided', () => {
    const result = applyContextFilter(installations, {})
    expect(result).toHaveLength(4)
  })

  it('filters by unit_id — only returns installations in that unit', () => {
    const result = applyContextFilter(installations, { unitId: UNIT_1 })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
  })

  it('filters by building_id — only returns building-level installations', () => {
    const result = applyContextFilter(installations, { buildingId: BLDG_1 })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('c')
  })

  it('filters by location_id — only returns common_area installations', () => {
    const result = applyContextFilter(installations, { locationId: COMMON_1 })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('d')
  })

  it('returns empty when unit_id does not match any installation', () => {
    const result = applyContextFilter(installations, { unitId: 'no-such-unit' })
    expect(result).toHaveLength(0)
  })

  it('does not mix location types — unit context excludes building rows', () => {
    const result = applyContextFilter(installations, { unitId: UNIT_1 })
    const types = result.map(r => r.location_type)
    expect(types.every(t => t === 'unit')).toBe(true)
  })

  it('unit_id must match exactly — UNIT_1 does not surface UNIT_2 records', () => {
    const result = applyContextFilter(installations, { unitId: UNIT_1 })
    const ids = result.map(r => r.location_id)
    expect(ids).not.toContain(UNIT_2)
  })
})

// ── contextBannerText helper ──────────────────────────────────────────────────

type LocationList = Array<{ id: string; name: string }>

function buildBannerText(
  context: { unitId?: string; buildingId?: string; locationId?: string },
  units: LocationList,
  buildings: LocationList,
  locations: LocationList
): string {
  if (context.unitId) {
    const u = units.find(x => x.id === context.unitId)
    return u ? `Unit: ${u.name}` : `Unit filter active`
  }
  if (context.buildingId) {
    const b = buildings.find(x => x.id === context.buildingId)
    return b ? `Building: ${b.name}` : `Building filter active`
  }
  if (context.locationId) {
    const l = locations.find(x => x.id === context.locationId)
    return l ? `Location: ${l.name}` : `Location filter active`
  }
  return ''
}

describe('buildBannerText', () => {
  const units     = [{ id: UNIT_1, name: '101' }]
  const buildings = [{ id: BLDG_1, name: 'Building A' }]
  const locs      = [{ id: COMMON_1, name: 'Pool Area' }]

  it('shows unit name when unit context is active', () => {
    expect(buildBannerText({ unitId: UNIT_1 }, units, buildings, locs)).toBe('Unit: 101')
  })

  it('shows building name when building context is active', () => {
    expect(buildBannerText({ buildingId: BLDG_1 }, units, buildings, locs)).toBe('Building: Building A')
  })

  it('shows location name when location context is active', () => {
    expect(buildBannerText({ locationId: COMMON_1 }, units, buildings, locs)).toBe('Location: Pool Area')
  })

  it('falls back gracefully when the ID is not in the list', () => {
    expect(buildBannerText({ unitId: 'unknown' }, units, buildings, locs)).toBe('Unit filter active')
  })

  it('returns empty string when no context', () => {
    expect(buildBannerText({}, units, buildings, locs)).toBe('')
  })
})
