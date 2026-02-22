import type { Database } from '~/types/supabase'

interface SolverEvent {
    property_code: string
    event_type: string
    details: Record<string, any>
    unit_id?: string
    tenancy_id?: string
}

interface PropertySummary {
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
    // ========== TRACKING ENHANCEMENTS - Price Changes ==========
    priceChanges: number
    // ========== END TRACKING ENHANCEMENTS ==========
    // ========== TRACKING ENHANCEMENTS - New Leases Signed ==========
    newLeasesSigned: number
    // ========== END TRACKING ENHANCEMENTS ==========
}

export const useSolverTracking = () => {
    const supabase = useSupabaseClient<Database>()
    const user = useSupabaseUser()

    let currentRunId: string | null = null
    const events: SolverEvent[] = []
    const propertySummaries: Record<string, PropertySummary> = {}

    /**
     * Initialize a new Solver run
     */
    const startRun = async (batchId: string) => {
        const { data, error } = await supabase
            .from('solver_runs')
            .insert({
                batch_id: batchId,
                status: 'running',
                created_by: user.value?.id
            })
            .select('id')
            .single()

        if (error) {
            console.error('[SolverTracking] Failed to create solver_run:', error)
            return null
        }

        currentRunId = data.id
        events.length = 0 // Clear events array
        Object.keys(propertySummaries).forEach(key => delete propertySummaries[key])

        return currentRunId
    }

    /**
     * Initialize property summary
     */
    const initProperty = (propertyCode: string) => {
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
                // ========== TRACKING ENHANCEMENTS - Price Changes ==========
                priceChanges: 0,
                // ========== END TRACKING ENHANCEMENTS ==========
                // ========== TRACKING ENHANCEMENTS - New Leases Signed ==========
                newLeasesSigned: 0
                // ========== END TRACKING ENHANCEMENTS ==========
            }
        }
    }

    /**
     * Track a new tenancy created
     */
    const trackNewTenancy = (propertyCode: string, details: {
        tenancy_id: string
        resident_name: string
        unit_name: string
        unit_id: string
        move_in_date?: string
        status: string
        source: string
    }) => {
        initProperty(propertyCode)
        propertySummaries[propertyCode].tenanciesNew++

        events.push({
            property_code: propertyCode,
            event_type: 'new_tenancy',
            unit_id: details.unit_id,
            tenancy_id: details.tenancy_id,
            details
        })
    }

    /**
     * Track tenancy updates
     */
    const trackTenancyUpdates = (propertyCode: string, count: number) => {
        initProperty(propertyCode)
        propertySummaries[propertyCode].tenanciesUpdated += count
    }

    /**
     * Track a new resident created
     */
    const trackNewResident = (propertyCode: string, details: {
        tenancy_id: string
        resident_name: string
        unit_name: string
        unit_id: string
        role: string
        email?: string
        phone?: string
    }) => {
        initProperty(propertyCode)
        propertySummaries[propertyCode].residentsNew++

        events.push({
            property_code: propertyCode,
            event_type: 'new_resident',
            unit_id: details.unit_id,
            tenancy_id: details.tenancy_id,
            details
        })
    }

    /**
     * Track resident updates
     */
    const trackResidentUpdates = (propertyCode: string, count: number) => {
        initProperty(propertyCode)
        propertySummaries[propertyCode].residentsUpdated += count
    }

    /**
     * Track lease renewal
     */
    const trackLeaseRenewal = (propertyCode: string, details: {
        tenancy_id: string
        resident_name?: string
        unit_name: string
        unit_id: string | null
        old_lease: {
            start_date: string
            end_date: string
            rent_amount: number
        }
        new_lease: {
            start_date: string
            end_date: string
            rent_amount: number
        }
    }) => {
        initProperty(propertyCode)
        propertySummaries[propertyCode].leasesRenewed++

        events.push({
            property_code: propertyCode,
            event_type: 'lease_renewal',
            unit_id: details.unit_id,
            tenancy_id: details.tenancy_id,
            details
        })
    }

    /**
     * Track lease inserts/updates
     */
    const trackLeaseChanges = (propertyCode: string, newCount: number, updateCount: number) => {
        initProperty(propertyCode)
        propertySummaries[propertyCode].leasesNew += newCount
        propertySummaries[propertyCode].leasesUpdated += updateCount
    }

    /**
     * Track notice given
     */
    const trackNotice = (propertyCode: string, details: {
        tenancy_id: string
        resident_name?: string
        unit_name: string
        unit_id: string
        move_in_date?: string
        move_out_date?: string
        status_change?: string
    }) => {
        initProperty(propertyCode)
        propertySummaries[propertyCode].noticesProcessed++

        events.push({
            property_code: propertyCode,
            event_type: 'notice_given',
            unit_id: details.unit_id,
            tenancy_id: details.tenancy_id,
            details
        })
    }

    /**
     * Track status auto-fix
     */
    const trackStatusAutoFix = (propertyCode: string, unitName: string, statusChange: string) => {
        initProperty(propertyCode)
        propertySummaries[propertyCode].statusAutoFixes.push(`${unitName}: ${statusChange}`)
    }

    /**
     * Track availability changes
     */
    const trackAvailabilityChanges = (propertyCode: string, newCount: number, updateCount: number) => {
        initProperty(propertyCode)
        propertySummaries[propertyCode].availabilitiesNew += newCount
        propertySummaries[propertyCode].availabilitiesUpdated += updateCount
    }

    /**
     * Track flag creation
     */
    const trackFlag = (propertyCode: string, flagType: string, count: number = 1) => {
        initProperty(propertyCode)

        if (flagType === 'makeready_overdue') {
            propertySummaries[propertyCode].makereadyFlags += count
        } else if (flagType === 'application_overdue') {
            propertySummaries[propertyCode].applicationFlags += count
        } else if (flagType === 'unit_transfer_active') {
            propertySummaries[propertyCode].transferFlags += count
        }
    }

    /**
     * Track application saved
     */
    const trackApplication = (propertyCode: string, details: {
        applicant_name: string
        unit_name: string
        unit_id: string
        application_date: string
        screening_result?: string
    }) => {
        initProperty(propertyCode)
        propertySummaries[propertyCode].applicationsSaved++

        events.push({
            property_code: propertyCode,
            event_type: 'application_saved',
            unit_id: details.unit_id,
            details
        })
    }

    // ==========================================
    // TRACKING ENHANCEMENTS - Price Changes
    // ==========================================
    /**
     * Track availability price change
     */
    const trackPriceChange = (propertyCode: string, details: {
        unit_name: string
        unit_id: string
        old_rent: number
        new_rent: number
        change_amount: number
        change_percent: number
    }) => {
        initProperty(propertyCode)
        propertySummaries[propertyCode].priceChanges++

        events.push({
            property_code: propertyCode,
            event_type: 'price_change',
            unit_id: details.unit_id,
            details
        })
    }
    // ==========================================
    // END TRACKING ENHANCEMENTS
    // ==========================================

    // ==========================================
    // TRACKING ENHANCEMENTS - New Leases Signed
    // ==========================================
    /**
     * Track new lease signed (transitions to Future status)
     */
    const trackNewLeaseSigned = (propertyCode: string, details: {
        tenancy_id: string
        resident_name: string
        unit_name: string
        unit_id: string
        move_in_date?: string
        rent_amount?: number
        previous_status?: string
    }) => {
        initProperty(propertyCode)
        propertySummaries[propertyCode].newLeasesSigned++

        events.push({
            property_code: propertyCode,
            event_type: 'lease_signed',
            tenancy_id: details.tenancy_id,
            unit_id: details.unit_id,
            details
        })
    }
    // ==========================================
    // END TRACKING ENHANCEMENTS
    // ==========================================

    /**
     * Complete the run and save all data
     */
    const completeRun = async (batchId: string, propertiesProcessed: string[]) => {
        if (!currentRunId) {
            console.error('[SolverTracking] No active run to complete')
            return null
        }

        try {
            // Save all events in batches
            if (events.length > 0) {
                for (let i = 0; i < events.length; i += 1000) {
                    const chunk = events.slice(i, i + 1000)
                    const eventsWithRunId = chunk.map(e => ({
                        solver_run_id: currentRunId,
                        ...e
                    }))

                    const { error } = await supabase
                        .from('solver_events')
                        .insert(eventsWithRunId)

                    if (error) {
                        console.error('[SolverTracking] Failed to save events chunk:', error)
                    }
                }
            }

            // Update solver_run with completion
            const { error: updateError } = await supabase
                .from('solver_runs')
                .update({
                    completed_at: new Date().toISOString(),
                    status: 'completed',
                    properties_processed: propertiesProcessed,
                    summary: propertySummaries
                })
                .eq('id', currentRunId)

            if (updateError) {
                console.error('[SolverTracking] Failed to update solver_run:', updateError)
                return null
            }

            return { runId: currentRunId, summary: propertySummaries, events }
        } catch (error) {
            console.error('[SolverTracking] Error completing run:', error)
            return null
        }
    }

    /**
     * Mark run as failed
     */
    const failRun = async (errorMessage: string) => {
        if (!currentRunId) return

        await supabase
            .from('solver_runs')
            .update({
                status: 'failed',
                error_message: errorMessage,
                completed_at: new Date().toISOString()
            })
            .eq('id', currentRunId)
    }

    return {
        startRun,
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
        // ========== TRACKING ENHANCEMENTS ==========
        trackPriceChange,
        trackNewLeaseSigned,
        // ========== END TRACKING ENHANCEMENTS ==========
        completeRun,
        failRun,
        // Expose for report generation
        getCurrentSummary: () => ({ summary: propertySummaries, events })
    }
}
