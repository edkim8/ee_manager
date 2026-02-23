/**
 * Pure utility functions for availability record classification.
 * Extracted from Phase 2C-2 of useSolverEngine so the decision logic can be unit-tested
 * independently of Supabase calls.
 */

export interface ActiveAvail {
  id: string
  unit_id: string
  property_code: string
  status: string
}

export interface TenancyRecord {
  id: string
  unit_id: string
  status: string
}

export interface AvailabilityUpdate {
  id: string
  unit_id: string
  property_code: string
  status: string
  future_tenancy_id: string
}

export interface StaleClassification {
  /** Availability IDs to deactivate (unit now has a Current occupant) */
  toDeactivate: string[]
  /** Availability records to update to Leased or Applied */
  toUpdateStatus: AvailabilityUpdate[]
}

/**
 * Build a unit_id → tenancy map, keeping the highest-priority tenancy per unit.
 * Priority order: Current (3) > Future (2) > Applicant (1)
 */
export function buildTenancyPriorityMap(
  tenancies: TenancyRecord[]
): Map<string, TenancyRecord> {
  const priority: Record<string, number> = { Current: 3, Future: 2, Applicant: 1 }
  const map = new Map<string, TenancyRecord>()

  for (const t of tenancies) {
    const existing = map.get(t.unit_id)
    if (!existing || (priority[t.status] || 0) > (priority[existing.status] || 0)) {
      map.set(t.unit_id, t)
    }
  }

  return map
}

/**
 * Classify active availability records against their current tenancy state.
 *
 * Rules:
 *   - Any status + Current tenancy  → deactivate (unit is occupied)
 *   - Any status + Future tenancy   → update to Leased (skip if already Leased)
 *   - Any status + Applicant tenancy → update to Applied (skip if already Applied)
 *   - No tenancy                   → no change
 */
export function classifyStaleAvailabilities(
  activeAvails: ActiveAvail[],
  tenancyMap: Map<string, TenancyRecord>
): StaleClassification {
  const toDeactivate: string[] = []
  const toUpdateStatus: AvailabilityUpdate[] = []

  for (const avail of activeAvails) {
    const tenancy = tenancyMap.get(avail.unit_id)
    if (!tenancy) continue

    if (tenancy.status === 'Current') {
      toDeactivate.push(avail.id)
    } else if (tenancy.status === 'Future' && avail.status !== 'Leased') {
      toUpdateStatus.push({
        id: avail.id,
        unit_id: avail.unit_id,
        property_code: avail.property_code,
        status: 'Leased',
        future_tenancy_id: tenancy.id
      })
    } else if (tenancy.status === 'Applicant' && avail.status !== 'Applied') {
      toUpdateStatus.push({
        id: avail.id,
        unit_id: avail.unit_id,
        property_code: avail.property_code,
        status: 'Applied',
        future_tenancy_id: tenancy.id
      })
    }
  }

  return { toDeactivate, toUpdateStatus }
}
