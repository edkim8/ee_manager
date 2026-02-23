/**
 * Pure solver tracking state factory extracted from useSolverTracking.ts
 * for testability without Nuxt/Supabase context.
 *
 * All functions here are synchronous and have no external dependencies.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SolverEvent {
  property_code: string
  event_type: string
  details: Record<string, any>
  unit_id?: string | null
  tenancy_id?: string
}

export interface PropertySummary {
  tenanciesNew: number
  tenanciesUpdated: number
  residentsNew: number
  residentsUpdated: number
  leasesNew: number
  leasesUpdated: number
  leasesRenewed: number
  availabilitiesNew: number
  availabilitiesUpdated: number
  noticesProcessed: number
  statusAutoFixes: string[]
  makereadyFlags: number
  applicationFlags: number
  transferFlags: number
  applicationsSaved: number
  priceChanges: number
  newLeasesSigned: number
}

export interface SolverTrackingState {
  events: SolverEvent[]
  propertySummaries: Record<string, PropertySummary>
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates an isolated tracker state with all pure update functions.
 * Call this once per solver run.
 */
export function createSolverTrackingState() {
  const events: SolverEvent[] = []
  const propertySummaries: Record<string, PropertySummary> = {}

  // ── Internal helpers ──

  const initProperty = (propertyCode: string): void => {
    if (!propertySummaries[propertyCode]) {
      propertySummaries[propertyCode] = {
        tenanciesNew: 0,
        tenanciesUpdated: 0,
        residentsNew: 0,
        residentsUpdated: 0,
        leasesNew: 0,
        leasesUpdated: 0,
        leasesRenewed: 0,
        availabilitiesNew: 0,
        availabilitiesUpdated: 0,
        noticesProcessed: 0,
        statusAutoFixes: [],
        makereadyFlags: 0,
        applicationFlags: 0,
        transferFlags: 0,
        applicationsSaved: 0,
        priceChanges: 0,
        newLeasesSigned: 0,
      }
    }
  }

  // ── Public tracker functions ──

  const trackNewTenancy = (
    propertyCode: string,
    details: {
      tenancy_id: string
      resident_name: string
      unit_name: string
      unit_id: string
      move_in_date?: string
      status: string
      source: string
    },
  ): void => {
    initProperty(propertyCode)
    propertySummaries[propertyCode].tenanciesNew++
    events.push({ property_code: propertyCode, event_type: 'new_tenancy', unit_id: details.unit_id, tenancy_id: details.tenancy_id, details })
  }

  const trackTenancyUpdates = (propertyCode: string, count: number): void => {
    initProperty(propertyCode)
    propertySummaries[propertyCode].tenanciesUpdated += count
  }

  const trackNewResident = (
    propertyCode: string,
    details: {
      tenancy_id: string
      resident_name: string
      unit_name: string
      unit_id: string
      role: string
      email?: string
      phone?: string
    },
  ): void => {
    initProperty(propertyCode)
    propertySummaries[propertyCode].residentsNew++
    events.push({ property_code: propertyCode, event_type: 'new_resident', unit_id: details.unit_id, tenancy_id: details.tenancy_id, details })
  }

  const trackResidentUpdates = (propertyCode: string, count: number): void => {
    initProperty(propertyCode)
    propertySummaries[propertyCode].residentsUpdated += count
  }

  const trackLeaseRenewal = (
    propertyCode: string,
    details: {
      tenancy_id: string
      resident_name?: string
      unit_name: string
      unit_id: string | null
      old_lease: { start_date: string; end_date: string; rent_amount: number }
      new_lease: { start_date: string; end_date: string; rent_amount: number }
    },
  ): void => {
    initProperty(propertyCode)
    propertySummaries[propertyCode].leasesRenewed++
    events.push({ property_code: propertyCode, event_type: 'lease_renewal', unit_id: details.unit_id, tenancy_id: details.tenancy_id, details })
  }

  const trackLeaseChanges = (propertyCode: string, newCount: number, updateCount: number): void => {
    initProperty(propertyCode)
    propertySummaries[propertyCode].leasesNew += newCount
    propertySummaries[propertyCode].leasesUpdated += updateCount
  }

  const trackNotice = (
    propertyCode: string,
    details: {
      tenancy_id: string
      resident_name?: string
      unit_name: string
      unit_id: string
      move_in_date?: string
      move_out_date?: string
      status_change?: string
    },
  ): void => {
    initProperty(propertyCode)
    propertySummaries[propertyCode].noticesProcessed++
    events.push({ property_code: propertyCode, event_type: 'notice_given', unit_id: details.unit_id, tenancy_id: details.tenancy_id, details })
  }

  const trackStatusAutoFix = (propertyCode: string, unitName: string, statusChange: string): void => {
    initProperty(propertyCode)
    propertySummaries[propertyCode].statusAutoFixes.push(`${unitName}: ${statusChange}`)
  }

  const trackAvailabilityChanges = (propertyCode: string, newCount: number, updateCount: number): void => {
    initProperty(propertyCode)
    propertySummaries[propertyCode].availabilitiesNew += newCount
    propertySummaries[propertyCode].availabilitiesUpdated += updateCount
  }

  const trackFlag = (propertyCode: string, flagType: string, count: number = 1): void => {
    initProperty(propertyCode)
    if (flagType === 'makeready_overdue') {
      propertySummaries[propertyCode].makereadyFlags += count
    } else if (flagType === 'application_overdue') {
      propertySummaries[propertyCode].applicationFlags += count
    } else if (flagType === 'unit_transfer_active') {
      propertySummaries[propertyCode].transferFlags += count
    }
  }

  const trackApplication = (
    propertyCode: string,
    details: {
      applicant_name: string
      unit_name: string
      unit_id: string
      application_date: string
      screening_result?: string
    },
  ): void => {
    initProperty(propertyCode)
    propertySummaries[propertyCode].applicationsSaved++
    events.push({ property_code: propertyCode, event_type: 'application_saved', unit_id: details.unit_id, details })
  }

  const trackPriceChange = (
    propertyCode: string,
    details: {
      unit_name: string
      unit_id: string
      old_rent: number
      new_rent: number
      change_amount: number
      change_percent: number
    },
  ): void => {
    initProperty(propertyCode)
    propertySummaries[propertyCode].priceChanges++
    events.push({ property_code: propertyCode, event_type: 'price_change', unit_id: details.unit_id, details })
  }

  const trackNewLeaseSigned = (
    propertyCode: string,
    details: {
      tenancy_id: string
      resident_name: string
      unit_name: string
      unit_id: string
      move_in_date?: string
      rent_amount?: number
      previous_status?: string
    },
  ): void => {
    initProperty(propertyCode)
    propertySummaries[propertyCode].newLeasesSigned++
    events.push({ property_code: propertyCode, event_type: 'lease_signed', unit_id: details.unit_id, tenancy_id: details.tenancy_id, details })
  }

  const reset = (): void => {
    events.length = 0
    Object.keys(propertySummaries).forEach((key) => delete propertySummaries[key])
  }

  return {
    // State (read-only references for testing/inspection)
    events,
    propertySummaries,
    // Helpers
    initProperty,
    reset,
    // Trackers
    trackNewTenancy,
    trackTenancyUpdates,
    trackNewResident,
    trackResidentUpdates,
    trackLeaseRenewal,
    trackLeaseChanges,
    trackNotice,
    trackStatusAutoFix,
    trackAvailabilityChanges,
    trackFlag,
    trackApplication,
    trackPriceChange,
    trackNewLeaseSigned,
  }
}
