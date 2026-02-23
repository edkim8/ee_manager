import { describe, it, expect } from 'vitest'
import {
  mapTenancyStatus,
  parseDate,
  deriveAvailabilityStatus,
  classifyMissingTenancies,
  isRenewal,
  type TenancyRef,
  type MissingTenancy,
} from '../../../layers/admin/utils/solverUtils'

// ─── mapTenancyStatus ─────────────────────────────────────────────────────────

describe('mapTenancyStatus', () => {
  describe('exact canonical values', () => {
    it('maps "Current" → Current', () => expect(mapTenancyStatus('Current')).toBe('Current'))
    it('maps "Past" → Past', () => expect(mapTenancyStatus('Past')).toBe('Past'))
    it('maps "Future" → Future', () => expect(mapTenancyStatus('Future')).toBe('Future'))
    it('maps "Notice" → Notice', () => expect(mapTenancyStatus('Notice')).toBe('Notice'))
    it('maps "Eviction" → Eviction', () => expect(mapTenancyStatus('Eviction')).toBe('Eviction'))
    it('maps "Applicant" → Applicant', () => expect(mapTenancyStatus('Applicant')).toBe('Applicant'))
    it('maps "Denied" → Denied', () => expect(mapTenancyStatus('Denied')).toBe('Denied'))
    it('maps "Canceled" → Canceled', () => expect(mapTenancyStatus('Canceled')).toBe('Canceled'))
  })

  describe('case-insensitive substring matching', () => {
    it('matches "current resident" → Current', () => expect(mapTenancyStatus('current resident')).toBe('Current'))
    it('matches "PAST" → Past', () => expect(mapTenancyStatus('PAST')).toBe('Past'))
    it('matches "Notice to Vacate" → Notice', () => expect(mapTenancyStatus('Notice to Vacate')).toBe('Notice'))
    it('matches "Cancel" (without d) → Canceled', () => expect(mapTenancyStatus('Cancel')).toBe('Canceled'))
    it('matches "CANCELLED" → Canceled', () => expect(mapTenancyStatus('CANCELLED')).toBe('Canceled'))
  })

  describe('fallback', () => {
    it('returns Current for null', () => expect(mapTenancyStatus(null)).toBe('Current'))
    it('returns Current for empty string', () => expect(mapTenancyStatus('')).toBe('Current'))
    it('returns Current for unrecognized value', () => expect(mapTenancyStatus('Unknown Status')).toBe('Current'))
  })
})

// ─── parseDate ────────────────────────────────────────────────────────────────

describe('parseDate', () => {
  describe('passthrough for valid YYYY-MM-DD', () => {
    it('returns YYYY-MM-DD string as-is', () => {
      expect(parseDate('2026-01-14')).toBe('2026-01-14')
      expect(parseDate('2026-12-31')).toBe('2026-12-31')
    })
  })

  describe('ISO timestamp → UTC date extraction', () => {
    it('extracts date from ISO timestamp without PST offset error', () => {
      // Critical regression: "2026-01-14T00:00:00.000Z" must not become "2026-01-13" in PST
      expect(parseDate('2026-01-14T00:00:00.000Z')).toBe('2026-01-14')
    })

    it('handles end-of-day timestamps', () => {
      expect(parseDate('2026-06-30T23:59:59.999Z')).toBe('2026-06-30')
    })

    it('handles midnight UTC timestamps', () => {
      expect(parseDate('2026-03-15T00:00:00Z')).toBe('2026-03-15')
    })
  })

  describe('null / falsy inputs', () => {
    it('returns null for null', () => expect(parseDate(null)).toBeNull())
    it('returns null for undefined', () => expect(parseDate(undefined)).toBeNull())
    it('returns null for empty string', () => expect(parseDate('')).toBeNull())
  })

  describe('pass-through for other strings', () => {
    it('returns unrecognized format as-is (caller validates)', () => {
      expect(parseDate('Jan 14, 2026')).toBe('Jan 14, 2026')
    })
  })
})

// ─── deriveAvailabilityStatus ─────────────────────────────────────────────────

describe('deriveAvailabilityStatus', () => {
  const tenancy = (status: TenancyRef['status']): TenancyRef => ({ id: 'tid-1', status })

  it('returns Available/active defaults when tenancyData is null', () => {
    const result = deriveAvailabilityStatus(null)
    expect(result.status).toBe('Available')
    expect(result.isActive).toBe(true)
    expect(result.shouldClearApplicantFields).toBe(false)
    expect(result.futureTenancyId).toBeNull()
  })

  it('returns Available/active defaults when tenancyData is undefined', () => {
    const result = deriveAvailabilityStatus(undefined)
    expect(result.status).toBe('Available')
    expect(result.isActive).toBe(true)
  })

  describe('Current → Occupied (deactivate)', () => {
    it('maps Current to Occupied with isActive=false', () => {
      const result = deriveAvailabilityStatus(tenancy('Current'))
      expect(result.status).toBe('Occupied')
      expect(result.isActive).toBe(false)
      expect(result.futureTenancyId).toBeNull()
    })
  })

  describe('Future → Leased (link tenancy)', () => {
    it('maps Future to Leased with futureTenancyId set', () => {
      const result = deriveAvailabilityStatus(tenancy('Future'))
      expect(result.status).toBe('Leased')
      expect(result.isActive).toBe(true)
      expect(result.futureTenancyId).toBe('tid-1')
    })
  })

  describe('Applicant → Applied (link tenancy)', () => {
    it('maps Applicant to Applied with futureTenancyId set', () => {
      const result = deriveAvailabilityStatus(tenancy('Applicant'))
      expect(result.status).toBe('Applied')
      expect(result.isActive).toBe(true)
      expect(result.futureTenancyId).toBe('tid-1')
    })
  })

  describe('Notice / Eviction → Available (stay listed)', () => {
    it('maps Notice to Available', () => {
      const result = deriveAvailabilityStatus(tenancy('Notice'))
      expect(result.status).toBe('Available')
      expect(result.isActive).toBe(true)
      expect(result.shouldClearApplicantFields).toBe(false)
    })

    it('maps Eviction to Available', () => {
      const result = deriveAvailabilityStatus(tenancy('Eviction'))
      expect(result.status).toBe('Available')
    })
  })

  describe('Denied / Canceled → Available + clear applicant fields', () => {
    it('maps Denied to Available with shouldClearApplicantFields=true', () => {
      const result = deriveAvailabilityStatus(tenancy('Denied'))
      expect(result.status).toBe('Available')
      expect(result.shouldClearApplicantFields).toBe(true)
      expect(result.futureTenancyId).toBeNull()
    })

    it('maps Canceled to Available with shouldClearApplicantFields=true', () => {
      const result = deriveAvailabilityStatus(tenancy('Canceled'))
      expect(result.status).toBe('Available')
      expect(result.shouldClearApplicantFields).toBe(true)
    })
  })

  describe('Past → Available (default)', () => {
    it('maps Past to Available', () => {
      const result = deriveAvailabilityStatus(tenancy('Past'))
      expect(result.status).toBe('Available')
      expect(result.isActive).toBe(true)
      expect(result.shouldClearApplicantFields).toBe(false)
    })
  })
})

// ─── classifyMissingTenancies ─────────────────────────────────────────────────

describe('classifyMissingTenancies', () => {
  const t = (id: string, unit_id: string, status: string): MissingTenancy => ({ id, unit_id, status })

  it('returns empty results when no tenancies are missing', () => {
    const reported = new Set(['t1', 't2'])
    const active = [t('t1', 'u1', 'Current'), t('t2', 'u2', 'Notice')]
    const result = classifyMissingTenancies(reported, active)
    expect(result.missing).toHaveLength(0)
    expect(result.toPastIds).toHaveLength(0)
    expect(result.toCanceledIds).toHaveLength(0)
    expect(result.availabilityResetUnitIds).toHaveLength(0)
  })

  it('returns empty results when active tenancy list is empty', () => {
    const result = classifyMissingTenancies(new Set(['t1']), [])
    expect(result.missing).toHaveLength(0)
  })

  describe('Current/Notice → Past', () => {
    it('sends Current tenancy to toPastIds when missing from report', () => {
      const reported = new Set<string>()
      const active = [t('t1', 'u1', 'Current')]
      const { toPastIds, toCanceledIds } = classifyMissingTenancies(reported, active)
      expect(toPastIds).toContain('t1')
      expect(toCanceledIds).toHaveLength(0)
    })

    it('sends Notice tenancy to toPastIds when missing from report', () => {
      const reported = new Set<string>()
      const active = [t('t1', 'u1', 'Notice')]
      const { toPastIds } = classifyMissingTenancies(reported, active)
      expect(toPastIds).toContain('t1')
    })
  })

  describe('Applicant/Future → Canceled + reset availability', () => {
    it('sends Applicant tenancy to toCanceledIds', () => {
      const reported = new Set<string>()
      const active = [t('t1', 'u1', 'Applicant')]
      const { toCanceledIds, availabilityResetUnitIds, toPastIds } = classifyMissingTenancies(reported, active)
      expect(toCanceledIds).toContain('t1')
      expect(toPastIds).toHaveLength(0)
      expect(availabilityResetUnitIds).toContain('u1')
    })

    it('sends Future tenancy to toCanceledIds', () => {
      const reported = new Set<string>()
      const active = [t('t1', 'u1', 'Future')]
      const { toCanceledIds, availabilityResetUnitIds } = classifyMissingTenancies(reported, active)
      expect(toCanceledIds).toContain('t1')
      expect(availabilityResetUnitIds).toContain('u1')
    })
  })

  describe('mixed scenario', () => {
    it('correctly splits a mixed set of missing tenancies', () => {
      const reported = new Set(['t1']) // t1 is present; t2, t3, t4 are missing
      const active = [
        t('t1', 'u1', 'Current'),   // present → keep
        t('t2', 'u2', 'Current'),   // missing → Past
        t('t3', 'u3', 'Notice'),    // missing → Past
        t('t4', 'u4', 'Applicant'), // missing → Canceled + reset
        t('t5', 'u5', 'Future'),    // missing → Canceled + reset
      ]

      const { missing, toPastIds, toCanceledIds, availabilityResetUnitIds } =
        classifyMissingTenancies(reported, active)

      expect(missing).toHaveLength(4)
      expect(toPastIds).toEqual(expect.arrayContaining(['t2', 't3']))
      expect(toPastIds).toHaveLength(2)
      expect(toCanceledIds).toEqual(expect.arrayContaining(['t4', 't5']))
      expect(toCanceledIds).toHaveLength(2)
      expect(availabilityResetUnitIds).toEqual(expect.arrayContaining(['u4', 'u5']))
    })
  })
})

// ─── isRenewal ────────────────────────────────────────────────────────────────
//
// Three independent criteria — any one triggers true:
//   C1: gap between leases ≥ 30 days
//   C2: term-length difference ≥ 60 days
//   C3: gap ≥ -7 days AND new term ≥ 90 days

describe('isRenewal', () => {
  // ── Null / empty guard ──────────────────────────────────────────────────────

  describe('null / missing dates', () => {
    it('returns false when newStartDate is null', () => {
      expect(isRenewal(null, '2026-12-31', '2025-01-01', '2025-12-31')).toBe(false)
    })
    it('returns false when newEndDate is null', () => {
      expect(isRenewal('2026-01-01', null, '2025-01-01', '2025-12-31')).toBe(false)
    })
    it('returns false when existingStartDate is null', () => {
      expect(isRenewal('2026-01-01', '2026-12-31', null, '2025-12-31')).toBe(false)
    })
    it('returns false when existingEndDate is null', () => {
      expect(isRenewal('2026-01-01', '2026-12-31', '2025-01-01', null)).toBe(false)
    })
    it('returns false when all dates are null', () => {
      expect(isRenewal(null, null, null, null)).toBe(false)
    })
  })

  // ── Criterion 1: start-date gap ≥ 30 days ──────────────────────────────────
  //
  // Base existing lease: 2025-01-01 → 2025-12-31 (364-day term)

  describe('C1: start-date gap ≥ 30 days', () => {
    it('returns true when gap is exactly 30 days (boundary)', () => {
      // new starts 30 days after existing ends (2026-01-30)
      expect(isRenewal('2026-01-30', '2027-01-29', '2025-01-01', '2025-12-31')).toBe(true)
    })

    it('returns true when gap is 31 days (above boundary)', () => {
      expect(isRenewal('2026-01-31', '2027-01-30', '2025-01-01', '2025-12-31')).toBe(true)
    })

    it('returns true for a typical yearly renewal with 2-month gap', () => {
      expect(isRenewal('2026-03-01', '2027-02-28', '2025-01-01', '2025-12-31')).toBe(true)
    })
  })

  // ── Criterion 2: term-length difference ≥ 60 days ──────────────────────────
  //
  // Use gap = -364 days (new starts same day as existing) to isolate C2
  // and prevent C1/C3 from firing.

  describe('C2: term-length difference ≥ 60 days', () => {
    it('returns true when term shortens by 60+ days (12-month → 6-month)', () => {
      // Existing: 364 days. New: ~180 days. Diff ≈ 184.
      expect(isRenewal('2025-01-01', '2025-06-30', '2025-01-01', '2025-12-31')).toBe(true)
    })

    it('returns true when term difference is exactly 60 days (boundary)', () => {
      // Existing: 2025-01-01 → 2025-12-31 = 364 days
      // New: 2025-01-01 → 2025-11-01 = 304 days, diff = 60
      expect(isRenewal('2025-01-01', '2025-11-01', '2025-01-01', '2025-12-31')).toBe(true)
    })

    it('returns false when term difference is 59 days (just below boundary)', () => {
      // New: 2025-01-01 → 2025-11-02 = 305 days, diff = 59 (< 60)
      // gap = -364 → C1 false, C3: gap < -7 → false
      expect(isRenewal('2025-01-01', '2025-11-02', '2025-01-01', '2025-12-31')).toBe(false)
    })
  })

  // ── Criterion 3: gap ≥ -7 AND new term ≥ 90 days ───────────────────────────
  //
  // Use same-length ~91-day terms to prevent C2 from masking the boundary.
  // Existing: 2025-10-01 → 2025-12-31 (91 days)

  describe('C3: gap ≥ -7 AND new term ≥ 90 days', () => {
    it('returns true when gap = -7 and term = 90 (both exactly at boundary)', () => {
      // new starts Dec 24 (7 days before existing ends Dec 31), 90-day term
      // Dec24→Mar24 = 90 days (verified)
      expect(isRenewal('2025-12-24', '2026-03-24', '2025-10-01', '2025-12-31')).toBe(true)
    })

    it('returns true when gap = 0 (new starts exactly when old ends)', () => {
      expect(isRenewal('2026-01-01', '2026-04-01', '2025-10-01', '2025-12-31')).toBe(true)
    })

    it('returns true when gap = -3 (slight overlap) and long new term', () => {
      // Dec28→Mar28 = 90 days, gap = -3 (verified)
      expect(isRenewal('2025-12-28', '2026-03-28', '2025-10-01', '2025-12-31')).toBe(true)
    })

    it('returns false when gap = -8 (exceeds overlap tolerance)', () => {
      // gap = -8: new starts Dec 23, term = 90 — gap fails C3
      expect(isRenewal('2025-12-23', '2026-03-22', '2025-10-01', '2025-12-31')).toBe(false)
    })

    it('returns false when gap = -7 but term = 89 (just below 90-day floor)', () => {
      expect(isRenewal('2025-12-24', '2026-03-22', '2025-10-01', '2025-12-31')).toBe(false)
    })
  })

  // ── Update scenarios (all criteria fail → false) ───────────────────────────

  describe('update scenarios — should NOT be treated as renewals', () => {
    it('returns false for a minor end-date extension (same start, +2 weeks)', () => {
      // Lease extended: same start, end pushed 14 days later. gap ≈ -364, term diff = 14.
      expect(isRenewal('2025-01-01', '2026-01-14', '2025-01-01', '2025-12-31')).toBe(false)
    })

    it('returns false for a start-date correction forward by 1 month', () => {
      // Data correction: start moved forward, same end date. gap ≈ -334, term diff = 31.
      expect(isRenewal('2025-02-01', '2025-12-31', '2025-01-01', '2025-12-31')).toBe(false)
    })

    it('returns false for a short new lease with small gap (< 90 days prevents C3)', () => {
      // Existing: 2025-06-01 → 2025-07-31 (60 days). New: 2025-08-10 → 2025-10-08 (59 days).
      // gap = 10 → C1: false. term diff = 1 → C2: false. C3: gap ≥ -7 but term = 59 < 90 → false.
      expect(isRenewal('2025-08-10', '2025-10-08', '2025-06-01', '2025-07-31')).toBe(false)
    })

    it('returns false for a large backwards overlap (data re-entry correction)', () => {
      // New starts a full month before existing ends — clearly a data fix, not renewal.
      expect(isRenewal('2025-12-01', '2026-11-30', '2025-01-01', '2025-12-31')).toBe(false)
    })
  })

  // ── Realistic end-to-end scenarios ────────────────────────────────────────

  describe('realistic lease scenarios', () => {
    it('back-to-back annual leases are detected as renewals', () => {
      // Old ends Dec 31, new starts Jan 1 (gap = 1 day). C3 fires: gap=1 ≥ -7 AND term=365 ≥ 90.
      expect(isRenewal('2026-01-01', '2026-12-31', '2025-01-01', '2025-12-31')).toBe(true)
    })

    it('12-month → 1-month transition is a renewal (large term drop triggers C2)', () => {
      expect(isRenewal('2026-01-01', '2026-01-31', '2025-01-01', '2025-12-31')).toBe(true)
    })
  })
})
