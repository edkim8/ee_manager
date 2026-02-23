/**
 * Pure solver utility functions extracted from useSolverEngine.ts
 * for testability without Nuxt/Supabase context.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type TenancyStatus =
  | 'Current'
  | 'Past'
  | 'Future'
  | 'Notice'
  | 'Eviction'
  | 'Applicant'
  | 'Denied'
  | 'Canceled'

export interface TenancyRef {
  id: string
  status: TenancyStatus
}

export interface AvailabilityDerivation {
  status: string
  isActive: boolean
  shouldClearApplicantFields: boolean
  futureTenancyId: string | null
}

export interface MissingTenancy {
  id: string
  unit_id: string
  status: string
}

export interface MissingTenancyClassification {
  missing: MissingTenancy[]
  toPastIds: string[]
  toCanceledIds: string[]
  availabilityResetUnitIds: string[]
}

// ─── mapTenancyStatus ─────────────────────────────────────────────────────────

/**
 * Maps a raw Yardi status string to a canonical TenancyStatus enum value.
 * Uses substring matching (case-insensitive) to handle slight variations.
 * Defaults to 'Current' when no match is found.
 */
export function mapTenancyStatus(rowStatus: string | null): TenancyStatus {
  const s = (rowStatus || '').toLowerCase()
  if (s.includes('current')) return 'Current'
  if (s.includes('past')) return 'Past'
  if (s.includes('future')) return 'Future'
  if (s.includes('notice')) return 'Notice'
  if (s.includes('eviction')) return 'Eviction'
  if (s.includes('applicant')) return 'Applicant'
  if (s.includes('denied')) return 'Denied'
  if (s.includes('cancel')) return 'Canceled'
  return 'Current' // Fallback
}

// ─── parseDate ────────────────────────────────────────────────────────────────

/**
 * Sanitizes a raw date value to YYYY-MM-DD string.
 *
 * - Already YYYY-MM-DD → returned as-is.
 * - ISO timestamp (e.g. "2026-01-14T00:00:00.000Z") → UTC date extracted to
 *   avoid PST off-by-one errors when running on a local machine.
 * - Other strings → returned as-is (caller responsible for validity).
 * - Falsy → null.
 */
export function parseDate(val: string | null | undefined): string | null {
  if (!val) return null
  const str = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  if (str.includes('T')) {
    const d = new Date(str)
    if (!isNaN(d.getTime())) {
      const year = d.getUTCFullYear()
      const month = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }
  return str
}

// ─── deriveAvailabilityStatus ─────────────────────────────────────────────────

/**
 * Phase 2C-1: Derives the availability status and flags from a tenancy record.
 *
 * Maps:
 *   Current    → Occupied (isActive = false)
 *   Future     → Leased   (links futureTenancyId)
 *   Applicant  → Applied  (links futureTenancyId)
 *   Notice     → Available
 *   Eviction   → Available
 *   Denied     → Available + shouldClearApplicantFields
 *   Canceled   → Available + shouldClearApplicantFields
 *   null/other → Available
 */
export function deriveAvailabilityStatus(tenancyData?: TenancyRef | null): AvailabilityDerivation {
  const defaults: AvailabilityDerivation = {
    status: 'Available',
    isActive: true,
    shouldClearApplicantFields: false,
    futureTenancyId: null,
  }

  if (!tenancyData) return defaults

  const s = tenancyData.status

  if (s === 'Current') {
    return { status: 'Occupied', isActive: false, shouldClearApplicantFields: false, futureTenancyId: null }
  }
  if (s === 'Future') {
    return { status: 'Leased', isActive: true, shouldClearApplicantFields: false, futureTenancyId: tenancyData.id }
  }
  if (s === 'Applicant') {
    return { status: 'Applied', isActive: true, shouldClearApplicantFields: false, futureTenancyId: tenancyData.id }
  }
  if (s === 'Notice' || s === 'Eviction') {
    return { ...defaults }
  }
  if (s === 'Denied' || s === 'Canceled') {
    return { ...defaults, shouldClearApplicantFields: true }
  }

  return defaults
}

// ─── classifyMissingTenancies ─────────────────────────────────────────────────

/**
 * Phase 2B: Identifies silently-dropped tenancies and classifies them.
 *
 * Tenancies in DB that are NOT in today's Yardi report need to be transitioned:
 *   Current/Notice   → Past     (resident moved out)
 *   Applicant/Future → Canceled (application/future lease dropped)
 *
 * Availability records linked to Applicant/Future tenancies also need reset.
 *
 * @param reportedTenancyIds - Set of tenancy IDs present in today's report
 * @param activeTenancies    - All active tenancies from the DB for this property
 */
export function classifyMissingTenancies(
  reportedTenancyIds: Set<string>,
  activeTenancies: MissingTenancy[],
): MissingTenancyClassification {
  const missing = activeTenancies.filter((t) => !reportedTenancyIds.has(t.id))

  const toPastIds = missing
    .filter((t) => t.status === 'Current' || t.status === 'Notice')
    .map((t) => t.id)

  const toCanceledIds = missing
    .filter((t) => t.status === 'Applicant' || t.status === 'Future')
    .map((t) => t.id)

  const availabilityResetUnitIds = missing
    .filter((t) => t.status === 'Applicant' || t.status === 'Future')
    .map((t) => t.unit_id)

  return { missing, toPastIds, toCanceledIds, availabilityResetUnitIds }
}

// ─── isRenewal ────────────────────────────────────────────────────────────────

/**
 * Determines if a new lease represents a renewal (vs an update to the existing lease).
 *
 * Three independent criteria — any one being true triggers a renewal:
 *
 *  1. **Start-date gap ≥ 30 days**: New lease clearly starts after the old one ends.
 *  2. **Term-length difference ≥ 60 days**: Lease length changed significantly
 *     (e.g. 12-month renewed as a 6-month lease).
 *  3. **Gap ≥ -7 days AND new term ≥ 90 days**: New full-term lease begins near
 *     the end of the existing one (allows for minor timing overlaps in processing).
 *
 * Returns false when any date argument is null/empty.
 *
 * @param newStartDate      - Start date of the incoming lease (YYYY-MM-DD)
 * @param newEndDate        - End date of the incoming lease (YYYY-MM-DD)
 * @param existingStartDate - Start date of the existing lease in DB (YYYY-MM-DD)
 * @param existingEndDate   - End date of the existing lease in DB (YYYY-MM-DD)
 */
export function isRenewal(
  newStartDate: string | null,
  newEndDate: string | null,
  existingStartDate: string | null,
  existingEndDate: string | null,
): boolean {
  if (!newStartDate || !newEndDate || !existingStartDate || !existingEndDate) return false

  const newStart = new Date(newStartDate)
  const newEnd = new Date(newEndDate)
  const existingStart = new Date(existingStartDate)
  const existingEnd = new Date(existingEndDate)

  const MS_PER_DAY = 1000 * 60 * 60 * 24
  const newTermDays = Math.floor((newEnd.getTime() - newStart.getTime()) / MS_PER_DAY)
  const existingTermDays = Math.floor((existingEnd.getTime() - existingStart.getTime()) / MS_PER_DAY)
  const gapDays = Math.floor((newStart.getTime() - existingEnd.getTime()) / MS_PER_DAY)

  // Criterion 1: Clear gap — new lease starts 30+ days after old one ends
  if (gapDays >= 30) return true

  // Criterion 2: Significant term change — new term differs by 60+ days
  if (Math.abs(newTermDays - existingTermDays) >= 60) return true

  // Criterion 3: Near-end start with a full-length new lease (minor overlap allowed)
  if (gapDays >= -7 && newTermDays >= 90) return true

  return false
}
