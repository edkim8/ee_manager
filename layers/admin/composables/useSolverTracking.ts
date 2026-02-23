import type { Database } from '~/types/supabase'
import { createSolverTrackingState } from '../utils/solverTrackingState'

export const useSolverTracking = () => {
    const supabase = useSupabaseClient<Database>()
    const user = useSupabaseUser()

    let currentRunId: string | null = null
    const state = createSolverTrackingState()
    const { events, propertySummaries } = state
    const {
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
    } = state

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
        state.reset()

        return currentRunId
    }

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
