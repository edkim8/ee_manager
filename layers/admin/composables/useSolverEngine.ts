
import { v4 as uuidv4 } from 'uuid'
import type { Database } from '~/types/supabase'
import type { ResidentsStatusRow } from '~/layers/parsing/composables/parsers/useParseResidentsStatus'
import { resolveUnitId } from '../../base/utils/lookup'
import { getTodayPST, getNowPST, daysBetween, addDays } from '../../base/utils/date-helpers'
import { useSolverTracking } from './useSolverTracking'
import { useSolverReportGenerator } from './useSolverReportGenerator'
import { useAlertsSync } from '../../parsing/composables/useAlertsSync'
import { useWorkOrdersSync } from '../../parsing/composables/useWorkOrdersSync'
import { useDelinquenciesSync } from '../../parsing/composables/useDelinquenciesSync'

export const useSolverEngine = () => {
    const supabase = useSupabaseClient<Database>()
    const user = useSupabaseUser()
    const tracker = useSolverTracking()
    const reportGen = useSolverReportGenerator()
    
    // --- Helper Functions ---

    const mapTenancyStatus = (rowStatus: string | null): Database['public']['Enums']['tenancy_status'] => {
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
    
    const parseCurrency = (val: string | number | null | undefined): number | null => {
        if (!val && val !== 0) return null
        // If already a number, return it
        if (typeof val === 'number') return val
        // If string, parse it
        const num = parseFloat(val.replace(/[$,]/g, ''))
        return isNaN(num) ? null : num
    }

    const parseDate = (val: string | null): string | null => {
        if (!val) return null
        // Assuming parser returns ISO-like or 'YYYY-MM-DD'
        return val 
    }

    /**
     * Determines if a new lease represents a renewal (vs. an update to existing lease).
     * 
     * A renewal is detected using multiple criteria to handle edge cases:
     * 1. Start Date Gap: New lease starts at least 30 days after existing lease ends
     * 2. OR Significant Term Change: New lease term is substantially different (60+ days)
     * 
     * This prevents false positives from:
     * - Minor date adjustments (e.g., lease extended by a few days)
     * - Data entry timing overlaps
     * - System processing delays
     * 
     * @param newStartDate - Start date of the incoming lease (from ExpiringLeases)
     * @param newEndDate - End date of the incoming lease
     * @param existingStartDate - Start date of the existing lease in DB
     * @param existingEndDate - End date of the existing lease in DB
     * @returns true if this is a renewal (preserve old lease, create new), false if it's an update
     */
    // --- Amenity Sync Logic ---

    /**
     * Synchronizes unit amenities from a raw Yardi string (separated by <br>).
     * 1. Parses fragments from the raw string.
     * 2. Reconciles the global 'amenities' library for the property.
     * 3. Updates 'unit_amenities' (adding new, deactivating missing).
     */
    const syncUnitAmenities = async (unitId: string, amenitiesInput: any, propertyCode: string) => {
        if (!amenitiesInput) return

        let amenitiesStr = ''
        if (typeof amenitiesInput === 'string') {
            amenitiesStr = amenitiesInput
        } else if (typeof amenitiesInput === 'object' && amenitiesInput.raw) {
            amenitiesStr = amenitiesInput.raw
        }

        if (!amenitiesStr) return

        // 1. Parse fragments (Split by <br>, trim and filter empty)
        const fragments = amenitiesStr.split(/<br\s*\/?>/i)
            .map(f => f.trim())
            .filter(Boolean)

        if (fragments.length === 0) return

        // 2. Reconcile Global Library
        // Fetch existing amenities for this property to avoid duplicate inserts
        const { data: globalAmenities } = await supabase
            .from('amenities')
            .select('id, yardi_amenity')
            .eq('property_code', propertyCode)

        const globalAmenityMap = new Map<string, string>(globalAmenities?.map((a: { id: string, yardi_amenity: string }) => [a.yardi_amenity.toLowerCase(), a.id]) || [])
        
        // Ensure all fragments exist in the global library
        for (const fragment of fragments) {
            if (!globalAmenityMap.has(fragment.toLowerCase())) {
                const { data: newAmenity, error: insertError } = await supabase
                    .from('amenities')
                    .insert({
                        property_code: propertyCode,
                        yardi_code: fragment.toUpperCase().replace(/\s+/g, '_').substring(0, 50),
                        yardi_name: fragment,
                        yardi_amenity: fragment, // Primary label for lookup
                        amount: 0,
                        type: 'fixed' // Lowercase standard for case-insensitive handling
                    })
                    .select('id')
                    .single()

                if (!insertError && newAmenity) {
                    globalAmenityMap.set(fragment.toLowerCase(), newAmenity.id)
                }
            }
        }

        // 3. Sync Unit Amenities (Snapshot Reconciliation)
        // Fetch ALL links (active and inactive) for this unit to handle reactivation
        const { data: allLinks, error: linksError } = await supabase
            .from('unit_amenities')
            .select('id, amenity_id, active, amenities(yardi_amenity)')
            .eq('unit_id', unitId)

        if (linksError) {
            console.error('[Solver] Error fetching unit amenities:', linksError)
            return // Skip amenities sync for this unit if fetch fails
        }

        const existingLinksMap = new Map<string, { id: string, active: boolean, yardi_amenity: string }>(
            allLinks?.map((l: any) => [l.amenities.yardi_amenity.toLowerCase(), { id: l.id, active: l.active, yardi_amenity: l.amenities.yardi_amenity }]) || []
        )
        const fragmentsLower = new Set(fragments.map(f => f.toLowerCase()))
        const currentUserId = user.value?.id

        // A. Add/Activate amenities found in report
        for (const fragment of fragments) {
            const fragLower = fragment.toLowerCase()
            const existing = existingLinksMap.get(fragLower)

            if (!existing) {
                // New link needed
                const amenityId = globalAmenityMap.get(fragLower)
                if (amenityId) {
                    await supabase
                        .from('unit_amenities')
                        .insert({
                            unit_id: unitId,
                            amenity_id: amenityId,
                            active: true,
                            user_id: currentUserId,
                            comment: 'Synced from Yardi'
                        })
                }
            } else if (!existing.active) {
                // Reactivate existing link
                await supabase
                    .from('unit_amenities')
                    .update({ active: true, comment: 'Re-activated in Yardi Sync', user_id: currentUserId })
                    .eq('id', existing.id)
            }
        }

        // B. Deactivate amenities in DB that are missing from report
        const linksToDeactivate = allLinks?.filter((l: any) => l.active && !fragmentsLower.has(l.amenities.yardi_amenity.toLowerCase())) || []
        if (linksToDeactivate.length > 0) {
            await supabase
                .from('unit_amenities')
                .update({ active: false, comment: 'Removed in Yardi Sync' })
                .in('id', linksToDeactivate.map(l => l.id))
        }
    }

    const isRenewal = (
        newStartDate: string | null, 
        newEndDate: string | null,
        existingStartDate: string | null,
        existingEndDate: string | null
    ): boolean => {
        if (!newStartDate || !newEndDate || !existingStartDate || !existingEndDate) return false
        
        const newStart = new Date(newStartDate)
        const newEnd = new Date(newEndDate)
        const existingStart = new Date(existingStartDate)
        const existingEnd = new Date(existingEndDate)
        
        // Calculate lease term lengths in days
        const newTermDays = Math.floor((newEnd.getTime() - newStart.getTime()) / (1000 * 60 * 60 * 24))
        const existingTermDays = Math.floor((existingEnd.getTime() - existingStart.getTime()) / (1000 * 60 * 60 * 24))
        
        // Calculate gap between existing end and new start (in days)
        const gapDays = Math.floor((newStart.getTime() - existingEnd.getTime()) / (1000 * 60 * 60 * 24))
        
        // CRITERIA 1: Clear gap between leases (30+ days)
        // This indicates a new lease term starting after the old one ends
        if (gapDays >= 30) {
            return true
        }
        
        // CRITERIA 2: Significant term length change (60+ days difference)
        // This catches renewals where dates might overlap slightly but term is clearly different
        // Example: 12-month lease renewed as 6-month lease
        const termDifference = Math.abs(newTermDays - existingTermDays)
        if (termDifference >= 60) {
            return true
        }
        
        // CRITERIA 3: New lease starts on/after existing end with minimal overlap (< 7 days)
        // Allows for small timing overlaps but still indicates a renewal
        if (gapDays >= -7 && newTermDays >= 90) { // 90 days = ~3 months minimum
            return true
        }
        
        // Otherwise, treat as an UPDATE to the existing lease
        return false
    }

    // --- Main Process ---

    const statusMessage = useState('solver-status-message', () => '')
    const skippedRows = useState<{ property: string; unit: string; reason: string }[]>('solver-skipped-rows', () => [])

    const processBatch = async (batchId: string) => {
        // Initialize tracking
        await tracker.startRun(batchId)

        statusMessage.value = `Starting Batch: ${batchId}`
        skippedRows.value = [] // Reset
        console.log(`[Solver] Processing Batch: ${batchId}`)
        
        try {
            // 1. Fetch Residents Data
            statusMessage.value = 'Fetching Residents Data...'
            const { data: reports, error: fetchError } = await supabase
                .from('import_staging')
                .select('id, raw_data, property_code')
                .eq('batch_id', batchId)
                .eq('report_type', 'residents_status')
                
            if (fetchError) throw fetchError
            if (!reports || reports.length === 0) {
                console.warn('[Solver] No Residents Status report found in batch.')
                statusMessage.value = 'No Residents Status report found. Skipping.'
                return
            }

            // 2. Static Unit Lookup (No DB Query needed)
            statusMessage.value = 'Using Static Unit Lookup...'

            // 3. Process Rows Per Property
            let totalRows = 0
            let totalUpsertedLeases = 0
            let totalUpsertedAvailabilities = 0
            for (const report of reports) {
                totalRows += (report.raw_data as any[]).length
            }
            
            statusMessage.value = `Processing ${reports.length} properties (${totalRows} rows)...`

            let processedCount = 0
            let totalUpsertedTenancies = 0
            let totalUpsertedResidents = 0
            
            for (const report of reports) {
                const pCode = report.property_code
                const rows = report.raw_data as unknown as ResidentsStatusRow[] // JSONB cast
                
                statusMessage.value = `Processing ${pCode} (${rows.length} rows)...`
                console.log(`[Solver] Processing ${pCode} (${rows.length} rows)`)
                
                // Per-Property Buffers
                const tenanciesMap = new Map<string, any>()
                const residentsToUpsert: any[] = []
                const leasesFromResidentsMap = new Map<string, any>() // NEW: Leases from Residents Status

                try {
                    for (const row of rows) {
                        if (!row.tenancy_id) continue

                        // 1. Determine Role FIRST
                        const residentName = row.resident || 'Unknown'
                        let role: Database['public']['Enums']['household_role'] = 'Primary'
                        
                        const typeLower = (row.type || '').toLowerCase()
                        const statusLower = (row.status || '').toLowerCase()

                        if (typeLower.includes('roommate') || statusLower.includes('roommate')) role = 'Roommate'
                        else if (typeLower.includes('occupant') || statusLower.includes('occupant')) role = 'Occupant'
                        else if (typeLower.includes('guarantor') || statusLower.includes('guarantor')) role = 'Guarantor'

                        // STATIC RESOLUTION
                        const unitId = resolveUnitId(pCode!, row.unit_name!)
                        
                        if (!unitId) {
                            skippedRows.value.push({
                                property: pCode!,
                                unit: row.unit_name || 'Unknown',
                                reason: 'Unit ID not found in Static Lookup'
                            })
                            continue
                        }

                        // DEBUG TRACE
                        if (['1025', '1026', '1027'].includes(row.unit_name || '')) {
                            console.log(`[Solver TRACE] Found Unit ${row.unit_name} -> ID: ${unitId} (Role: ${role})`)
                        }

                        // A. Tenancy Logic (STRICT: Only Primary Updates Tenancy)
                        if (role === 'Primary') {
                            const tenancyStatus = mapTenancyStatus(row.status)

                            // MERGE LOGIC: Still good to have, but now strictly scoped to Primary rows
                            const currentInMap = tenanciesMap.get(row.tenancy_id)
                            const finalMoveIn = row.move_in_date || currentInMap?.move_in_date
                            const finalMoveOut = row.move_out_date || currentInMap?.move_out_date

                            // Data Integrity Check
                            if (tenancyStatus === 'Current' && !finalMoveIn) {
                                skippedRows.value.push({
                                    property: pCode!,
                                    unit: row.unit_name || 'Unknown',
                                    reason: `Current Status (Primary) but Missing Move-In Date`
                                })
                            }

                            tenanciesMap.set(row.tenancy_id, {
                                id: row.tenancy_id,
                                property_code: pCode!,
                                unit_id: unitId,
                                status: tenancyStatus,
                                move_in_date: finalMoveIn,
                                move_out_date: finalMoveOut,
                            })

                            // NEW: If Future/Applicant, create lease record from Residents Status data
                            if (tenancyStatus === 'Future' || tenancyStatus === 'Applicant') {
                                const leaseStartDate = parseDate(row.lease_start_date)
                                const leaseEndDate = parseDate(row.lease_end_date)
                                const rentAmount = parseCurrency(row.rent)

                                console.log(`[Solver Debug] ${tenancyStatus} tenancy ${row.tenancy_id}:`, {
                                    unit: row.unit_name,
                                    resident: residentName,
                                    lease_start_date: row.lease_start_date,
                                    lease_end_date: row.lease_end_date,
                                    rent: row.rent,
                                    parsed_start: leaseStartDate,
                                    parsed_end: leaseEndDate,
                                    parsed_rent: rentAmount
                                })

                                // Only create lease if we have valid dates
                                if (leaseStartDate && leaseEndDate) {
                                    leasesFromResidentsMap.set(row.tenancy_id, {
                                        tenancy_id: row.tenancy_id,
                                        property_code: pCode!,
                                        start_date: leaseStartDate,
                                        end_date: leaseEndDate,
                                        rent_amount: rentAmount || 0,
                                        deposit_amount: parseCurrency(row.deposit) || 0,
                                        lease_status: tenancyStatus === 'Applicant' ? 'Applicant' : 'Future',
                                        is_active: true
                                    })

                                    console.log(`[Solver] ✓ Creating lease for ${tenancyStatus} tenancy: ${row.tenancy_id} (${residentName} - Unit ${row.unit_name}) - Rent: $${rentAmount}`)
                                } else {
                                    console.log(`[Solver] ✗ Skipping lease for ${row.tenancy_id} - missing dates (start: ${!!leaseStartDate}, end: ${!!leaseEndDate})`)
                                }
                            }
                        }

                        // B. Resident (Always Add)
                        residentsToUpsert.push({
                            tenancy_id: row.tenancy_id,
                            pCode,
                            name: residentName,
                            email: row.email,
                            phone: row.phone,
                            role
                        })
                    }

                    // EXECUTE UPSERTS FOR THIS PROPERTY
                    // 1. Tenancies (Safe Sync: Check -> Insert/Update)
                    const tenanciesToUpsert = Array.from(tenanciesMap.values())

                    if (tenanciesToUpsert.length > 0) {
                        const allTenancyIds = tenanciesToUpsert.map(t => t.id)

                        // A. Check which already exist AND fetch status for Past transition detection
                        const { data: existingData, error: checkError } = await supabase
                            .from('tenancies')
                            .select('id, status, move_out_date, unit_id')
                            .in('id', allTenancyIds)

                        if (checkError) throw checkError

                        // ==========================================
                        // PAST STATUS TRANSITION HANDLER
                        // ==========================================
                        // Detect status changes to 'Past' and handle move-out logic
                        const existingStatusMap = new Map<string, any>()
                        existingData?.forEach((t: any) => existingStatusMap.set(t.id, t))

                        const unitsToRemoveOverdueFlag: string[] = []
                        const today = getTodayPST()

                        for (const newTenancy of tenanciesToUpsert) {
                            const oldTenancy = existingStatusMap.get(newTenancy.id)

                            // Detect transition to 'Past' status
                            if (oldTenancy && newTenancy.status === 'Past' && oldTenancy.status !== 'Past') {
                                console.log(`[Solver] Status Change Detected: ${oldTenancy.status} → Past for tenancy ${newTenancy.id}`)

                                // Remove "Move Out Overdue" flag if exists
                                unitsToRemoveOverdueFlag.push(newTenancy.unit_id)

                                // Check for early move-out (log only, no flag)
                                if (newTenancy.move_out_date && newTenancy.move_out_date > today) {
                                    const plannedDate = newTenancy.move_out_date
                                    const actualDate = today
                                    console.log(`[Solver] 🏃 Early Move Out Detected: Unit ${newTenancy.unit_id} - Planned: ${plannedDate}, Actual: ${actualDate}`)

                                    // Track as status auto-fix (for reporting)
                                    tracker.trackStatusAutoFix(
                                        pCode,
                                        `Tenancy ${newTenancy.id}`,
                                        `Early Move Out: Planned ${plannedDate}, Actual ${actualDate}`
                                    )
                                }
                            }
                        }

                        // Remove overdue flags for units that transitioned to Past
                        if (unitsToRemoveOverdueFlag.length > 0) {
                            const { error: flagRemoveError } = await supabase
                                .from('unit_flags')
                                .update({
                                    resolved_at: getNowPST(),
                                    resolved_by: user.value?.id || null
                                })
                                .in('unit_id', unitsToRemoveOverdueFlag)
                                .eq('flag_type', 'moveout_overdue')
                                .is('resolved_at', null)

                            if (flagRemoveError) {
                                console.error('[Solver] Flag Removal Error:', flagRemoveError)
                            } else {
                                console.log(`[Solver] ✓ Removed move-out overdue flags for ${unitsToRemoveOverdueFlag.length} units`)
                            }
                        }
                        // ==========================================
                        
                        const existingIds = new Set(existingData?.map((r: any) => r.id) || [])
                        const newTenancies = tenanciesToUpsert.filter(t => !existingIds.has(t.id))
                        const existingTenancies = tenanciesToUpsert.filter(t => existingIds.has(t.id))
                        
                        // B. Insert New
                        if (newTenancies.length > 0) {
                             for (let i = 0; i < newTenancies.length; i += 1000) {
                                const chunk = newTenancies.slice(i, i + 1000)
                                const { error } = await supabase.from('tenancies').insert(chunk)
                                if (error) throw error
                                totalUpsertedTenancies += chunk.length // Treating both as "processed"
                             }
                             // Track new tenancies (will add detailed tracking in residents section)
                             tracker.trackTenancyUpdates(pCode, newTenancies.length)

                             // ==========================================
                             // TRACKING CODE START - New Leases Signed
                             // ==========================================
                             // Track new leases signed (Future/Applicant status)
                             for (const tenancy of newTenancies) {
                                if (tenancy.status === 'Future' || tenancy.status === 'Applicant') {
                                    // Find corresponding resident and lease data
                                    const resident = residentsToUpsert.find(r => r.tenancy_id === tenancy.id && r.role === 'Primary')
                                    const lease = leasesFromResidentsMap.get(tenancy.id)

                                    tracker.trackNewLeaseSigned(pCode, {
                                        tenancy_id: tenancy.id,
                                        resident_name: resident?.name || 'Unknown',
                                        unit_name: rows.find(r => r.tenancy_id === tenancy.id)?.unit_name || 'Unknown',
                                        unit_id: tenancy.unit_id,
                                        move_in_date: tenancy.move_in_date,
                                        rent_amount: lease?.rent_amount,
                                        previous_status: 'New'
                                    })
                                }
                             }
                             // TRACKING CODE END
                             // ==========================================
                        }

                        // C. Update Existing
                        if (existingTenancies.length > 0) {
                             for (let i = 0; i < existingTenancies.length; i += 1000) {
                                const chunk = existingTenancies.slice(i, i + 1000)
                                const { error } = await supabase.from('tenancies').upsert(chunk) // Upsert is safe for updates if valid ID
                                if (error) throw error
                                totalUpsertedTenancies += chunk.length
                             }
                             // Track tenancy updates
                             tracker.trackTenancyUpdates(pCode, existingTenancies.length)
                        }
                        
                        console.log(`[Solver] Safe Sync ${pCode}: ${newTenancies.length} New, ${existingTenancies.length} Updates`)
                    }

                    // 2. Residents
                    if (residentsToUpsert.length > 0) {
                        const allTenancyIds = [...new Set(residentsToUpsert.map(r => r.tenancy_id))]
                        
                        // Fetch existing
                        const existingResidentsMap: Record<string, any[]> = {} 
                        
                        for (let i = 0; i < allTenancyIds.length; i += 1000) {
                            const tIds = allTenancyIds.slice(i, i + 1000)
                            const { data: exist } = await supabase
                                .from('residents')
                                .select('id, tenancy_id, name')
                                .in('tenancy_id', tIds)
                            
                            exist?.forEach((r: any) => {
                                if (!existingResidentsMap[r.tenancy_id]) existingResidentsMap[r.tenancy_id] = []
                                existingResidentsMap[r.tenancy_id].push(r)
                            })
                        }

                        const newResidentsMap = new Map<string, any>() // Dedup key: tenancy_id:name_lower
                        const existingResidentsMap2 = new Map<string, any>() // Dedup by resident ID

                        for (const res of residentsToUpsert) {
                            const candidates = existingResidentsMap[res.tenancy_id] || []
                            const match = candidates.find(c => c.name.toLowerCase() === res.name.toLowerCase())

                            const payload = {
                                property_code: res.pCode,
                                tenancy_id: res.tenancy_id,
                                name: res.name,
                                email: res.email,
                                phone: res.phone,
                                role: res.role,
                                is_active: true
                            }

                            if (match) {
                                // Existing: Deduplicate by resident ID (last occurrence wins)
                                existingResidentsMap2.set(match.id, { ...payload, id: match.id })
                            } else {
                                // New: Deduplicate by tenancy_id + name (last occurrence wins)
                                const dedupKey = `${res.tenancy_id}:${res.name.toLowerCase()}`
                                newResidentsMap.set(dedupKey, payload)
                            }
                        }

                        // Convert deduped maps to arrays
                        const newResidents = Array.from(newResidentsMap.values())
                        const existingResidents = Array.from(existingResidentsMap2.values())
                        
                        // A. Insert New (No IDs)
                        if (newResidents.length > 0) {
                             for (let i = 0; i < newResidents.length; i += 1000) {
                                const chunk = newResidents.slice(i, i + 1000)
                                const { error } = await supabase.from('residents').insert(chunk)
                                if (error) {
                                    console.error(`[Solver] Resident Insert Error for ${pCode}:`, error)
                                    throw error
                                }
                                totalUpsertedResidents += chunk.length
                            }
                             // Track new residents
                             tracker.trackResidentUpdates(pCode, newResidents.length)
                        }

                        // B. Update Existing (With IDs)
                        if (existingResidents.length > 0) {
                             for (let i = 0; i < existingResidents.length; i += 1000) {
                                const chunk = existingResidents.slice(i, i + 1000)
                                const { error } = await supabase.from('residents').upsert(chunk)
                                if (error) {
                                    console.error(`[Solver] Resident Upsert Error for ${pCode}:`, error)
                                    throw error
                                }
                                totalUpsertedResidents += chunk.length
                            }
                             // Track resident updates
                             tracker.trackResidentUpdates(pCode, existingResidents.length)
                        }
                    }

                    // 3. Leases from Residents Status (Future/Applicant only)
                    const leasesFromResidents = Array.from(leasesFromResidentsMap.values())

                    if (leasesFromResidents.length > 0) {
                        // Check which tenancies already have leases
                        const tenancyIds = leasesFromResidents.map((l: any) => l.tenancy_id)

                        const { data: existingLeases } = await supabase
                            .from('leases')
                            .select('id, tenancy_id')
                            .in('tenancy_id', tenancyIds)

                        const existingLeaseMap = new Map((existingLeases || []).map((l: any) => [l.tenancy_id, l.id]))

                        const leasesToInsert: any[] = []
                        const leasesToUpdate: any[] = []

                        for (const lease of leasesFromResidents) {
                            const existingLeaseId = existingLeaseMap.get(lease.tenancy_id)
                            if (existingLeaseId) {
                                // Update existing
                                leasesToUpdate.push({ ...lease, id: existingLeaseId })
                            } else {
                                // Insert new
                                leasesToInsert.push(lease)
                            }
                        }

                        // Insert new leases
                        if (leasesToInsert.length > 0) {
                            const { error } = await supabase.from('leases').insert(leasesToInsert)
                            if (error) {
                                console.error(`[Solver] Lease Insert Error (from Residents) for ${pCode}:`, error)
                            } else {
                                console.log(`[Solver] Inserted ${leasesToInsert.length} leases from Residents Status for ${pCode}`)
                                tracker.trackLeaseChanges(pCode, leasesToInsert.length, 0)
                            }
                        }

                        // Update existing leases
                        if (leasesToUpdate.length > 0) {
                            const { error } = await supabase.from('leases').upsert(leasesToUpdate)
                            if (error) {
                                console.error(`[Solver] Lease Update Error (from Residents) for ${pCode}:`, error)
                            } else {
                                console.log(`[Solver] Updated ${leasesToUpdate.length} leases from Residents Status for ${pCode}`)
                                tracker.trackLeaseChanges(pCode, 0, leasesToUpdate.length)
                            }
                        }
                    }

                    processedCount += rows.length
                    
                } catch (err: any) {
                    console.error(`[Solver] Failed processing property ${pCode}:`, err)
                    statusMessage.value = `Error processing ${pCode}: ${err.message}`
                    skippedRows.value.push({ property: pCode!, unit: 'ALL', reason: `Property Batch Failed: ${err.message}` })
                }
            }

            statusMessage.value = `Completed: ${totalUpsertedTenancies} Tenancies, ${totalUpsertedResidents} Residents. Skipped: ${skippedRows.value.length}`

            // --- STEP 2: FINANCIALS (Expiring Leases) ---
            statusMessage.value = 'Fetching Leases Data...'
            const { data: leaseReports, error: leaseFetchError } = await supabase
                .from('import_staging')
                .select('id, raw_data, property_code')
                .eq('batch_id', batchId)
                .eq('report_type', 'expiring_leases')
            
            if (leaseFetchError) throw leaseFetchError

            if (leaseReports && leaseReports.length > 0) {
                 statusMessage.value = `Processing Leases for ${leaseReports.length} properties...`
                 let totalUpsertedLeases = 0

                 for (const report of leaseReports) {
                    const pCode = report.property_code
                    const rows = report.raw_data as unknown as any[] // ExpiringleasesRow[]
                    const leasesToUpsert: any[] = []

                    // Verify Tenancies exist (we need to know valid tenancy_ids to prevent FK errors)
                    // Optimization: We could fetch all valid IDs for this property first.
                    // Or trust "Safe Sync" - but here we want to warn on Orphans.
                    // Let's first collect all tenancy_codes from the rows.
                    const relevantTenancyIds = [...new Set(rows.map((r: any) => r.tenancy_code).filter(Boolean))]
                    
                    if (relevantTenancyIds.length === 0) continue

                    // Check which ones exist in DB
                    // Supabase 'in' has a limit (usually 65k parameters, but chunking is safer)
                    const validTenancyIds = new Set<string>()
                    
                    for (let i = 0; i < relevantTenancyIds.length; i += 1000) {
                        const chunk = relevantTenancyIds.slice(i, i + 1000)
                        const { data: found } = await supabase
                            .from('tenancies')
                            .select('id')
                            .in('id', chunk)
                        
                        found?.forEach((f: any) => validTenancyIds.add(f.id))
                    }

                    for (const row of rows) {
                        // Link Check
                        if (!row.tenancy_code || !validTenancyIds.has(row.tenancy_code)) {
                             // Orphan Lease - User Warning?
                             // skippedRows.value.push({ property: pCode!, unit: row.unit_name || '?', reason: `Orphan Lease (Tenancy ${row.tenancy_code} not found)`})
                             continue
                        }
                        
                         // Status Cleaning
                         let leaseStatus: Database['public']['Enums']['lease_status'] = 'Current'
                         if (row.status === 'Notice') leaseStatus = 'Notice'
                         else if (row.status === 'Future') leaseStatus = 'Future'
                         else if (row.status === 'Past') leaseStatus = 'Past'
                         else if (row.status === 'Eviction') leaseStatus = 'Eviction'

                        leasesToUpsert.push({
                            tenancy_id: row.tenancy_code,
                            property_code: pCode!,
                            start_date: parseDate(row.lease_start_date),
                            end_date: parseDate(row.lease_end_date),
                            rent_amount: row.lease_rent || 0, // already number or null? Interface says number | null
                            deposit_amount: row.deposit || 0, // interface says string, parser says number (after fix). Let's trust parser output is number now.
                            lease_status: leaseStatus,
                            is_active: leaseStatus === 'Current' || leaseStatus === 'Notice' // Logic for simple 'active' flag
                        })
                    }

                    if (leasesToUpsert.length > 0) {
                        // SAFE SYNC PATTERN (Same as Residents/Tenancies)
                        // Strategy: Check which tenancies already have leases, then UPDATE existing or INSERT new
                        // This handles duplicate rows in ExpiringLeases gracefully (multiple UPDATEs = idempotent)
                        
                        const tenancyIds = [...new Set(leasesToUpsert.map((l: any) => l.tenancy_id))]
                        
                        // Fetch existing leases for these tenancies (need full data for renewal/inheritance)
                        const { data: existingLeases, error: fetchError } = await supabase
                            .from('leases')
                            .select('id, tenancy_id, property_code, start_date, end_date, rent_amount, deposit_amount, lease_status, is_active')
                            .in('tenancy_id', tenancyIds)
                            .eq('is_active', true) // Only fetch active leases

                        if (fetchError) throw fetchError

                        // Fetch tenancy and resident data for renewal tracking
                        const { data: tenanciesData, error: tenancyError } = await supabase
                            .from('tenancies')
                            .select('id, unit_id, units(name)')
                            .in('id', tenancyIds)

                        if (tenancyError) console.error('[Solver] Tenancy fetch error for renewals:', tenancyError)

                        const { data: residentsData, error: residentsError } = await supabase
                            .from('residents')
                            .select('tenancy_id, name, role')
                            .in('tenancy_id', tenancyIds)
                            .eq('role', 'Primary') // Only fetch primary resident for tracking

                        if (residentsError) console.error('[Solver] Residents fetch error for renewals:', residentsError)

                        // Build maps for quick lookup
                        const leaseMap = new Map<string, any>()
                        existingLeases?.forEach((lease: any) => {
                            // Only keep the active lease (should be only one per tenancy)
                            if (!leaseMap.has(lease.tenancy_id)) {
                                leaseMap.set(lease.tenancy_id, lease)
                            }
                        })

                        const tenancyMap = new Map<string, any>()
                        tenanciesData?.forEach((t: any) => {
                            tenancyMap.set(t.id, t)
                        })

                        const residentMap = new Map<string, string>()
                        residentsData?.forEach((r: any) => {
                            residentMap.set(r.tenancy_id, r.name)
                        })
                        
                        const toUpdate: any[] = []
                        const toInsert: any[] = []
                        const toDeactivate: any[] = [] // Leases to mark as inactive (renewals)
                        const renewalTenancyIds: Set<string> = new Set() // Track renewals for worksheet confirmation
                        
                        // Deduplicate leasesToUpsert by tenancy_id (last one wins for duplicates in source data)
                        const deduped = new Map<string, any>()
                        leasesToUpsert.forEach(lease => {
                            deduped.set(lease.tenancy_id, lease)
                        })
                        
                        deduped.forEach((newLease, tenancyId) => {
                            const existingLease = leaseMap.get(tenancyId)
                            
                            if (existingLease) {
                                // Check if this is a RENEWAL
                                if (isRenewal(
                                    newLease.start_date,
                                    newLease.end_date,
                                    existingLease.start_date,
                                    existingLease.end_date
                                )) {
                                    // RENEWAL: Mark old lease as Past, create new Current lease
                                    toDeactivate.push({
                                        id: existingLease.id,
                                        is_active: false,
                                        lease_status: 'Past' // Historical record
                                    })

                                    // New lease inherits from old, overrides dates/rent
                                    const renewedLease = {
                                        // Inherit from old lease
                                        tenancy_id: existingLease.tenancy_id,
                                        property_code: existingLease.property_code,
                                        deposit_amount: existingLease.deposit_amount,
                                        // Override with new data from report
                                        start_date: newLease.start_date,
                                        end_date: newLease.end_date,
                                        rent_amount: newLease.rent_amount,
                                        // Set as current active lease
                                        lease_status: 'Current',
                                        is_active: true
                                    }
                                    toInsert.push(renewedLease)
                                    renewalTenancyIds.add(existingLease.tenancy_id) // Track for worksheet confirmation

                                    // Track renewal with resident and unit details
                                    const tenancyInfo = tenancyMap.get(existingLease.tenancy_id)
                                    const residentName = residentMap.get(existingLease.tenancy_id)
                                    const unitName = tenancyInfo?.units?.name || 'Unit'
                                    const unitId = tenancyInfo?.unit_id || null

                                    tracker.trackLeaseRenewal(pCode, {
                                        tenancy_id: existingLease.tenancy_id,
                                        resident_name: residentName,
                                        unit_name: unitName,
                                        unit_id: unitId,
                                        old_lease: {
                                            start_date: existingLease.start_date,
                                            end_date: existingLease.end_date,
                                            rent_amount: existingLease.rent_amount || 0
                                        },
                                        new_lease: {
                                            start_date: newLease.start_date,
                                            end_date: newLease.end_date,
                                            rent_amount: newLease.rent_amount || 0
                                        }
                                    })
                                } else {
                                    // UPDATE: Same lease term, just updating details
                                    toUpdate.push({ ...newLease, id: existingLease.id })
                                }
                            } else {
                                // No existing active lease - INSERT new
                                toInsert.push(newLease)
                            }
                        })
                        
                        // Execute Deactivations (for renewals)
                        // Mark old leases as Past + inactive to preserve history
                        if (toDeactivate.length > 0) {
                            for (let i = 0; i < toDeactivate.length; i += 1000) {
                                const chunk = toDeactivate.slice(i, i + 1000)
                                const chunkIds = chunk.map(l => l.id)
                                const { error } = await supabase
                                    .from('leases')
                                    .update({ is_active: false, lease_status: 'Past' })
                                    .in('id', chunkIds)
                                if (error) {
                                    console.error(`[Solver] Lease Deactivation Error ${pCode}:`, error)
                                    throw error
                                }
                            }
                            console.log(`[Solver] Archived ${toDeactivate.length} leases as Past (renewals) for ${pCode}`)
                        }
                        
                        // Execute Updates
                        if (toUpdate.length > 0) {
                            for (let i = 0; i < toUpdate.length; i += 1000) {
                                const chunk = toUpdate.slice(i, i + 1000)
                                const { error } = await supabase.from('leases').upsert(chunk)
                                if (error) {
                                    console.error(`[Solver] Lease Update Error ${pCode}:`, error)
                                    throw error
                                }
                                totalUpsertedLeases += chunk.length
                            }
                        }
                        
                        // Execute Inserts
                        if (toInsert.length > 0) {
                            for (let i = 0; i < toInsert.length; i += 1000) {
                                const chunk = toInsert.slice(i, i + 1000)
                                const { error } = await supabase.from('leases').insert(chunk)
                                if (error) {
                                    console.error(`[Solver] Lease Insert Error ${pCode}:`, error)
                                    throw error
                                }
                                totalUpsertedLeases += chunk.length
                            }
                        }

                        // ==========================================
                        // RENEWALS YARDI CONFIRMATION HOOK
                        // ==========================================
                        // Auto-confirm renewal worksheet items when Solver detects renewals
                        if (renewalTenancyIds.size > 0) {
                            const tenancyIdsArray = Array.from(renewalTenancyIds)

                            // Query worksheet items for these tenancies
                            const { data: worksheetItems, error: worksheetQueryError } = await supabase
                                .from('renewal_worksheet_items')
                                .select('id, tenancy_id, status, yardi_confirmed')
                                .in('tenancy_id', tenancyIdsArray)
                                .eq('active', true)
                                .is('yardi_confirmed', false) // Only update items not yet confirmed

                            if (worksheetQueryError) {
                                console.error(`[Solver] Renewals worksheet query error ${pCode}:`, worksheetQueryError)
                            } else if (worksheetItems && worksheetItems.length > 0) {
                                const today = new Date().toISOString().split('T')[0]
                                const itemsToUpdate = worksheetItems.map(item => {
                                    // Transition status based on current state
                                    let newStatus = item.status
                                    if (item.status === 'manually_accepted') {
                                        newStatus = 'accepted'
                                    } else if (item.status === 'manually_declined') {
                                        newStatus = 'declined'
                                    } else if (item.status === 'pending') {
                                        // Don't auto-accept pending items, just mark as Yardi confirmed
                                        newStatus = 'pending'
                                    }

                                    return {
                                        id: item.id,
                                        yardi_confirmed: true,
                                        yardi_confirmed_date: today,
                                        status: newStatus
                                    }
                                })

                                // Batch update worksheet items
                                for (let i = 0; i < itemsToUpdate.length; i += 1000) {
                                    const chunk = itemsToUpdate.slice(i, i + 1000)
                                    const { error: updateError } = await supabase
                                        .from('renewal_worksheet_items')
                                        .upsert(chunk)

                                    if (updateError) {
                                        console.error(`[Solver] Renewals worksheet update error ${pCode}:`, updateError)
                                    }
                                }

                                console.log(`[Solver] Updated ${itemsToUpdate.length} renewal worksheet items for ${pCode} (Yardi confirmed)`)
                            }
                        }
                        // END RENEWALS CONFIRMATION HOOK
                        // ==========================================

                        // Track lease changes
                        tracker.trackLeaseChanges(pCode, toInsert.length, toUpdate.length)
                    }
                 }
                 statusMessage.value = `Leases Synced: ${totalUpsertedLeases} records.`
            }

            // --- STEP 3: AVAILABILITY (Availables) ---
            statusMessage.value = 'Fetching Availables Data...'
            const { data: availReports, error: availFetchError } = await supabase
                .from('import_staging')
                .select('id, raw_data, property_code')
                .eq('batch_id', batchId)
                .eq('report_type', 'availables')
            
            if (availFetchError) throw availFetchError

            if (availReports && availReports.length > 0) {
                statusMessage.value = `Processing Availabilities for ${availReports.length} properties...`
                let totalUpsertedAvailabilities = 0

                for (const report of availReports) {
                    const pCode = report.property_code
                    const rows = report.raw_data as unknown as any[] // AvailablesRow[]
                    const availabilitiesToUpsert: any[] = []

                    // Resolve unit_ids for all rows
                    const unitNames = [...new Set(rows.map((r: any) => r.unit_name).filter(Boolean))]
                    
                    if (unitNames.length === 0) continue

                    // Fetch unit_ids
                    const unitMap = new Map<string, string>() // unit_name -> unit_id
                    for (let i = 0; i < unitNames.length; i += 1000) {
                        const chunk = unitNames.slice(i, i + 1000)
                        const { data: units } = await supabase
                            .from('units')
                            .select('id, unit_name')
                            .eq('property_code', pCode)
                            .in('unit_name', chunk)
                        
                        units?.forEach((u: any) => unitMap.set(u.unit_name, u.id))
                    }

                    // Fetch active tenancies for status derivation and linking
                    const unitIds = Array.from(unitMap.values())
                    const tenancyMap = new Map<string, { status: string; id: string }>() // unit_id -> { status, id }

                    if (unitIds.length > 0) {
                        for (let i = 0; i < unitIds.length; i += 1000) {
                            const chunk = unitIds.slice(i, i + 1000)
                            const { data: tenancies } = await supabase
                                .from('tenancies')
                                .select('id, unit_id, status')
                                .in('unit_id', chunk)

                            tenancies?.forEach((t: any) => {
                                // Keep only Future or Applicant tenancies for linking
                                if (t.status === 'Future' || t.status === 'Applicant') {
                                    tenancyMap.set(t.unit_id, { status: t.status, id: t.id })
                                } else if (!tenancyMap.has(t.unit_id)) {
                                    // Store other statuses only if no Future/Applicant already exists
                                    tenancyMap.set(t.unit_id, { status: t.status, id: t.id })
                                }
                            })
                        }
                    }

                    // Build availability records
                    for (const row of rows) {
                        const unitId = unitMap.get(row.unit_name)
                        
                        // Skip orphan units
                        if (!unitId) {
                            console.warn(`[Solver] Orphan unit in Availables: ${row.unit_name} (${pCode})`)
                            continue
                        }

                        // Derive status from tenancy
                        const tenancyData = tenancyMap.get(unitId)
                        const tenancyStatus = tenancyData?.status
                        let availabilityStatus = 'Available' // Default
                        let isActive = true // Default
                        let shouldClearApplicantFields = false
                        let futureTenancyId: string | null = null

                        if (tenancyStatus) {
                            if (tenancyStatus === 'Current') {
                                availabilityStatus = 'Occupied'
                                isActive = false // End this availability cycle
                            }
                            else if (tenancyStatus === 'Future') {
                                availabilityStatus = 'Leased'
                                futureTenancyId = tenancyData.id // Link to Future tenancy
                            }
                            else if (tenancyStatus === 'Applicant') {
                                availabilityStatus = 'Applied'
                                futureTenancyId = tenancyData.id // Link to Applicant tenancy
                            }
                            else if (tenancyStatus === 'Notice' || tenancyStatus === 'Eviction') {
                                availabilityStatus = 'Available'
                            }
                            else if (tenancyStatus === 'Denied' || tenancyStatus === 'Canceled') {
                                availabilityStatus = 'Available'
                                shouldClearApplicantFields = true // Clear applicant data
                            }
                            else {
                                availabilityStatus = 'Available' // Past, etc.
                            }
                        }

                        const availabilityRecord: any = {
                            unit_id: unitId,
                            property_code: pCode!,
                            unit_name: row.unit_name,
                            status: availabilityStatus,
                            available_date: parseDate(row.available_date),
                            rent_offered: row.offered_rent || 0,
                            amenities: row.amenities ? { raw: row.amenities } : {},
                            is_active: isActive,
                            future_tenancy_id: futureTenancyId // Populate with resolved Tenancy ID
                        }

                        // Clear applicant-related fields when Denied/Canceled
                        if (shouldClearApplicantFields) {
                            availabilityRecord.leasing_agent = null
                            availabilityRecord.move_in_date = null
                            availabilityRecord.future_tenancy_id = null
                            availabilityRecord.is_mi_inspection = null
                            availabilityRecord.screening_result = null
                        }

                        availabilitiesToUpsert.push(availabilityRecord)

                        // --- SYNC AMENITIES ---
                        if (row.amenities) {
                            await syncUnitAmenities(unitId, row.amenities, pCode!)
                        }
                    }

                    if (availabilitiesToUpsert.length > 0) {
                        // ==========================================
                        // TRACKING CODE START - Fetch existing availabilities with rent for price change detection
                        // ==========================================
                        const { data: existingAvails } = await supabase
                            .from('availabilities')
                            .select('id, unit_id, unit_name, rent_offered')
                            .in('unit_id', availabilitiesToUpsert.map(a => a.unit_id))
                            .eq('is_active', true)

                        const availMap = new Map<string, string>() // unit_id -> availability_id
                        const rentMap = new Map<string, number>() // unit_id -> old rent_offered
                        const unitNameMap = new Map<string, string>() // unit_id -> unit_name
                        existingAvails?.forEach((a: any) => {
                            availMap.set(a.unit_id, a.id)
                            rentMap.set(a.unit_id, a.rent_offered || 0)
                            unitNameMap.set(a.unit_id, a.unit_name)
                        })
                        // TRACKING CODE END
                        // ==========================================
                        
                        const toUpdate: any[] = []
                        const toInsert: any[] = []
                        
                        availabilitiesToUpsert.forEach(avail => {
                            const existingId = availMap.get(avail.unit_id)
                            if (existingId) {
                                toUpdate.push({ ...avail, id: existingId })
                            } else {
                                toInsert.push(avail)
                            }
                        })

                        // ==========================================
                        // TRACKING CODE START - Detect and track price changes
                        // ==========================================
                        toUpdate.forEach(avail => {
                            const oldRent = rentMap.get(avail.unit_id) || 0
                            const newRent = avail.rent_offered || 0

                            // Only track if there's an actual change (threshold: $1)
                            if (Math.abs(newRent - oldRent) >= 1) {
                                const changeAmount = newRent - oldRent
                                const changePercent = oldRent > 0 ? ((changeAmount / oldRent) * 100) : 0

                                tracker.trackPriceChange(pCode, {
                                    unit_name: avail.unit_name,
                                    unit_id: avail.unit_id,
                                    old_rent: oldRent,
                                    new_rent: newRent,
                                    change_amount: changeAmount,
                                    change_percent: changePercent
                                })
                            }
                        })
                        // TRACKING CODE END
                        // ==========================================

                        // Execute Updates
                        if (toUpdate.length > 0) {
                            for (let i = 0; i < toUpdate.length; i += 1000) {
                                const chunk = toUpdate.slice(i, i + 1000)
                                const { error } = await supabase.from('availabilities').upsert(chunk)
                                if (error) {
                                    console.error(`[Solver] Availability Update Error ${pCode}:`, error)
                                    throw error
                                }
                                totalUpsertedAvailabilities += chunk.length
                            }
                        }
                        
                        // Execute Inserts
                        if (toInsert.length > 0) {
                            for (let i = 0; i < toInsert.length; i += 1000) {
                                const chunk = toInsert.slice(i, i + 1000)
                                const { error } = await supabase.from('availabilities').insert(chunk)
                                if (error) {
                                    console.error(`[Solver] Availability Insert Error ${pCode}:`, error)
                                    throw error
                                }
                                totalUpsertedAvailabilities += chunk.length
                            }
                        }

                        // Track availability changes
                        tracker.trackAvailabilityChanges(pCode, toInsert.length, toUpdate.length)
                    }
                }
                statusMessage.value = `Availabilities Synced: ${totalUpsertedAvailabilities} records.`
            }

            // --- PHASE 2C-2: Update Stale Availability Records ---
            statusMessage.value = 'Updating stale availability records...'

            // Find availability records that are stale (status still 'Available' but unit has Future/Applicant tenancy)
            const { data: staleAvailabilities } = await supabase
                .from('availabilities')
                .select('id, unit_id, property_code')
                .eq('is_active', true)
                .in('status', ['Available', 'Notice'])

            if (staleAvailabilities && staleAvailabilities.length > 0) {
                const staleUnitIds = staleAvailabilities.map((a: any) => a.unit_id)

                // Find which of these units have Future/Applicant tenancies
                const { data: activeTenancies } = await supabase
                    .from('tenancies')
                    .select('id, unit_id, status')
                    .in('unit_id', staleUnitIds)
                    .in('status', ['Future', 'Applicant'])

                if (activeTenancies && activeTenancies.length > 0) {
                    const tenancyMap = new Map(activeTenancies.map((t: any) => [t.unit_id, t]))
                    const availsToUpdate: any[] = []

                    for (const avail of staleAvailabilities) {
                        const tenancy: any = tenancyMap.get(avail.unit_id)
                        if (tenancy) {
                            availsToUpdate.push({
                                id: avail.id,
                                unit_id: avail.unit_id,
                                property_code: avail.property_code,
                                status: tenancy.status === 'Future' ? 'Leased' : 'Applied',
                                future_tenancy_id: tenancy.id
                            })
                        }
                    }

                    if (availsToUpdate.length > 0) {
                        for (let i = 0; i < availsToUpdate.length; i += 1000) {
                            const chunk = availsToUpdate.slice(i, i + 1000)
                            const { error } = await supabase.from('availabilities').upsert(chunk)
                            if (error) {
                                console.error(`[Solver] Stale Availability Update Error:`, error)
                            }
                        }
                        console.log(`[Solver] Updated ${availsToUpdate.length} stale availability records`)
                        tracker.trackAvailabilityChanges('STALE_UPDATE', 0, availsToUpdate.length)
                    }
                }
            }

            // --- STEP 2A: NOTICES (Move-Out Intent) ---
            statusMessage.value = 'Fetching Notices Data...'
            const { data: noticesReports, error: noticesFetchError } = await supabase
                .from('import_staging')
                .select('id, raw_data, property_code')
                .eq('batch_id', batchId)
                .eq('report_type', 'notices')
            
            if (noticesFetchError) throw noticesFetchError

            if (noticesReports && noticesReports.length > 0) {
                statusMessage.value = `Processing Notices for ${noticesReports.length} properties...`
                let totalUpdatedTenancies = 0
                let totalUpdatedAvailabilities = 0

                for (const report of noticesReports) {
                    const pCode = report.property_code
                    const rows = report.raw_data as unknown as any[] // NoticesRow[]
                    
                    if (rows.length === 0) continue

                    // Step 1: Resolve unit_ids from property_code + unit_name
                    const unitNames = [...new Set(rows.map((r: any) => r.unit_name).filter(Boolean))]
                    const unitMap = new Map<string, string>() // "property_unit" -> unit_id
                    
                    for (let i = 0; i < unitNames.length; i += 1000) {
                        const chunk = unitNames.slice(i, i + 1000)
                        const { data: units } = await supabase
                            .from('units')
                            .select('id, unit_name')
                            .eq('property_code', pCode)
                            .in('unit_name', chunk)
                        
                        units?.forEach((u: any) => unitMap.set(`${pCode}_${u.unit_name}`, u.id))
                    }

                    // Step 2: Fetch active tenancies for resolved units
                    const resolvedUnitIds = Array.from(new Set(
                        rows.map((r: any) => unitMap.get(`${pCode}_${r.unit_name}`)).filter(Boolean)
                    ))
                    
                    if (resolvedUnitIds.length === 0) {
                        console.warn(`[Solver] No valid units found in Notices for ${pCode}`)
                        continue
                    }

                    const tenancyMap = new Map<string, any>() // unit_id -> tenancy
                    for (let i = 0; i < resolvedUnitIds.length; i += 1000) {
                        const chunk = resolvedUnitIds.slice(i, i + 1000)
                        console.log(`[Solver DEBUG] Fetching tenancies for ${chunk.length} units in ${pCode}`)
                        
                        const { data: tenancies, error: tenancyError } = await supabase
                            .from('tenancies')
                            .select('id, unit_id, status')
                            .in('unit_id', chunk)
                        
                        if (tenancyError) {
                            console.error(`[Solver] Tenancy Query Error for ${pCode}:`, tenancyError)
                            console.error(`[Solver] Query details: ${chunk.length} unit_ids`)
                            // Continue processing other properties instead of throwing
                            continue
                        }
                        
                        console.log(`[Solver DEBUG] Found ${tenancies?.length || 0} tenancies for ${pCode}`)
                        
                        // Filter by status in code to avoid 400 Bad Request
                        const validStatuses = ['Current', 'Notice', 'Future', 'Applicant', 'Eviction']
                        tenancies?.filter((t: any) => validStatuses.includes(t.status))
                            .forEach((t: any) => tenancyMap.set(t.unit_id, t))
                    }

                    // Step 3: Process notices and build updates
                    const tenancyUpdates: any[] = []
                    const availabilityUpdates: any[] = []
                    const warnings: string[] = []

                    for (const row of rows) {
                        const unitKey = `${pCode}_${row.unit_name}`
                        const unitId = unitMap.get(unitKey)
                        
                        // Skip orphan units
                        if (!unitId) {
                            warnings.push(`Orphan unit: ${row.unit_name}`)
                            continue
                        }

                        // Find active tenancy
                        const tenancy = tenancyMap.get(unitId)
                        
                        if (!tenancy) {
                            warnings.push(`No active tenancy for unit: ${row.unit_name}`)
                            continue
                        }

                        // Validate status and auto-fix if needed
                        let finalStatus = tenancy.status
                        if (tenancy.status !== 'Notice') {
                            // Auto-fix: Update status to 'Notice'
                            finalStatus = 'Notice'
                            warnings.push(`Auto-fixed status for ${row.unit_name}: ${tenancy.status} → Notice`)
                            // Track status auto-fix
                            tracker.trackStatusAutoFix(pCode, row.unit_name, `${tenancy.status} → Notice`)
                        }

                        const updatePayload: any = {
                            id: tenancy.id,
                            property_code: pCode,  // Required NOT NULL field
                            unit_id: unitId,  // Required NOT NULL field
                            status: finalStatus,  // Required NOT NULL field
                            move_out_date: parseDate(row.move_out_date)
                        }

                        tenancyUpdates.push(updatePayload)

                        // Track notice given
                        tracker.trackNotice(pCode, {
                            tenancy_id: tenancy.id,
                            resident_name: row.resident || 'Unknown',
                            unit_name: row.unit_name,
                            unit_id: unitId,
                            move_in_date: tenancy.move_in_date,
                            move_out_date: parseDate(row.move_out_date) || undefined,
                            status_change: finalStatus !== tenancy.status ? `${tenancy.status} → ${finalStatus}` : undefined
                        })
                        
                        // Track for availability update
                        availabilityUpdates.push({
                            unit_id: unitId,
                            move_out_date: parseDate(row.move_out_date)
                        })
                    }

                    // Step 4: Execute tenancy updates
                    if (tenancyUpdates.length > 0) {
                        for (let i = 0; i < tenancyUpdates.length; i += 1000) {
                            const chunk = tenancyUpdates.slice(i, i + 1000)
                            const { error } = await supabase.from('tenancies').upsert(chunk)
                            if (error) {
                                console.error(`[Solver] Tenancy Update Error (Notices) ${pCode}:`, error)
                                throw error
                            }
                            totalUpdatedTenancies += chunk.length
                        }
                    }

                    // Step 5: Execute availability updates
                    if (availabilityUpdates.length > 0) {
                        // Fetch existing active availabilities
                        const unitIds = availabilityUpdates.map((a: any) => a.unit_id)
                        const { data: existingAvails } = await supabase
                            .from('availabilities')
                            .select('id, unit_id')
                            .in('unit_id', unitIds)
                            .eq('is_active', true)
                        
                        const availMap = new Map<string, string>() // unit_id -> availability_id
                        existingAvails?.forEach((a: any) => availMap.set(a.unit_id, a.id))
                        
                        const toUpdate = availabilityUpdates
                            .filter((a: any) => availMap.has(a.unit_id))
                            .map((a: any) => ({
                                id: availMap.get(a.unit_id),
                                unit_id: a.unit_id,  // Required NOT NULL field
                                property_code: pCode,  // Required NOT NULL field
                                move_out_date: a.move_out_date
                            }))
                        
                        if (toUpdate.length > 0) {
                            for (let i = 0; i < toUpdate.length; i += 1000) {
                                const chunk = toUpdate.slice(i, i + 1000)
                                const { error } = await supabase.from('availabilities').upsert(chunk)
                                if (error) {
                                    console.error(`[Solver] Availability Update Error (Notices) ${pCode}:`, error)
                                    throw error
                                }
                                totalUpdatedAvailabilities += chunk.length
                            }
                        }
                    }

                    // Log warnings
                    if (warnings.length > 0) {
                        console.warn(`[Solver] Notices Warnings for ${pCode}:`, warnings)
                    }
                }
                
                statusMessage.value = `Notices Synced: ${totalUpdatedTenancies} tenancies, ${totalUpdatedAvailabilities} availabilities.`
            }

            // ==========================================
            // Step 2D.5: Move Out Overdue Check
            // ==========================================
            // Check all Notice tenancies where move_out_date has passed
            // Create "Move Out Overdue" flags with severity based on days overdue
            statusMessage.value = 'Checking for overdue move-outs...'

            const today = getTodayPST()

            const { data: noticeWithDates, error: noticeQueryError } = await supabase
                .from('tenancies')
                .select('id, unit_id, property_code, move_out_date, units(unit_name)')
                .eq('status', 'Notice')
                .not('move_out_date', 'is', null)

            if (noticeQueryError) {
                console.error('[Solver] Move Out Overdue Query Error:', noticeQueryError)
            } else if (noticeWithDates && noticeWithDates.length > 0) {
                // Filter for overdue tenancies using string comparison
                const overdueTenancies = noticeWithDates.filter((t: any) => {
                    return t.move_out_date < today
                })

                console.log(`[Solver] Found ${overdueTenancies.length} overdue move-outs to flag`)

                if (overdueTenancies.length > 0) {
                    // Fetch existing overdue flags to avoid duplicates
                    const unitIds = overdueTenancies.map((t: any) => t.unit_id)
                    const { data: existingFlags } = await supabase
                        .from('unit_flags')
                        .select('id, unit_id, metadata')
                        .in('unit_id', unitIds)
                        .eq('flag_type', 'moveout_overdue')
                        .is('resolved_at', null)

                    const existingFlagMap = new Map<string, any>()
                    existingFlags?.forEach((f: any) => existingFlagMap.set(f.unit_id, f))

                    const flagsToCreate: any[] = []
                    const flagsToUpdate: any[] = []

                    for (const tenancy of overdueTenancies) {
                        // Calculate days overdue using timezone-agnostic function
                        const daysOverdue = daysBetween(tenancy.move_out_date, today)

                        // Determine severity: 1-3 days = warning, 4+ days = error
                        const severity = daysOverdue <= 3 ? 'warning' : 'error'

                        const flagData = {
                            unit_id: tenancy.unit_id,
                            property_code: tenancy.property_code,
                            flag_type: 'moveout_overdue',
                            severity: severity,
                            title: 'Move Out Overdue',
                            message: `Planned move-out: ${tenancy.move_out_date}. ${daysOverdue} days overdue.`,
                            metadata: {
                                tenancy_id: tenancy.id,
                                planned_move_out_date: tenancy.move_out_date,
                                days_overdue: daysOverdue
                            }
                        }

                        const existingFlag = existingFlagMap.get(tenancy.unit_id)

                        if (existingFlag) {
                            // Update existing flag (severity might have escalated)
                            flagsToUpdate.push({
                                id: existingFlag.id,
                                ...flagData
                            })
                        } else {
                            // Create new flag
                            flagsToCreate.push(flagData)
                        }
                    }

                    // Create new flags
                    if (flagsToCreate.length > 0) {
                        const { error: createError } = await supabase
                            .from('unit_flags')
                            .insert(flagsToCreate)

                        if (createError) {
                            console.error('[Solver] Move Out Overdue Flag Creation Error:', createError)
                        } else {
                            console.log(`[Solver] Created ${flagsToCreate.length} move-out overdue flags`)
                        }
                    }

                    // Update existing flags (severity escalation)
                    if (flagsToUpdate.length > 0) {
                        for (const flag of flagsToUpdate) {
                            const { error: updateError } = await supabase
                                .from('unit_flags')
                                .update({
                                    severity: flag.severity,
                                    message: flag.message,
                                    metadata: flag.metadata
                                })
                                .eq('id', flag.id)

                            if (updateError) {
                                console.error('[Solver] Move Out Overdue Flag Update Error:', updateError)
                            }
                        }
                        console.log(`[Solver] Updated ${flagsToUpdate.length} move-out overdue flags (severity escalation)`)
                    }
                }
            }

            console.log('[Solver] Phase 2D.5 Complete: Move-out overdue check finished')

            // ==========================================
            // Step 2C: MakeReady (Flag Overdue Units)
            // ==========================================
            statusMessage.value = 'Processing MakeReady...'
            const { data: makeReadyReports } = await supabase
                .from('import_staging')
                .select('id, raw_data, property_code')
                .eq('batch_id', batchId)
                .eq('report_type', 'make_ready')
            
            let totalFlagsCreated = 0
            let totalFlagsResolved = 0
            
            if (makeReadyReports && makeReadyReports.length > 0) {
                const today = getTodayPST()
                const cushionDays = 1  // Grace period
                const cutoffDate = addDays(today, -cushionDays)  // Subtract grace period

                for (const report of makeReadyReports) {
                    const pCode = report.property_code
                    const rows = report.raw_data as any[]

                    if (!rows || rows.length === 0) continue

                    console.log(`[Solver] Processing MakeReady ${pCode} (${rows.length} rows)`)

                    // Step 1: Resolve units
                    const unitNames = [...new Set(rows.map((r: any) => r.unit_name).filter(Boolean))]
                    const { data: units } = await supabase
                        .from('units')
                        .select('id, unit_name')
                        .eq('property_code', pCode)
                        .in('unit_name', unitNames)

                    const unitMap = new Map<string, string>()
                    units?.forEach((u: any) => unitMap.set(u.unit_name, u.id))

                    // Step 2: Detect overdue units
                    console.log(`[Solver DEBUG] Today: ${today}, Cutoff: ${cutoffDate} (${cushionDays} day cushion)`)

                    const overdueUnits = rows
                        .filter((row: any) => {
                            const makeReadyDateStr = parseDate(row.make_ready_date)
                            if (!makeReadyDateStr) {
                                console.log(`[Solver DEBUG] ${row.unit_name}: No make_ready_date`)
                                return false
                            }

                            // Simple string comparison (both are YYYY-MM-DD)
                            const isOverdue = makeReadyDateStr < cutoffDate
                            console.log(`[Solver DEBUG] ${row.unit_name}: ready=${makeReadyDateStr}, cutoff=${cutoffDate}, overdue=${isOverdue}`)

                            return isOverdue
                        })
                        .map((row: any) => {
                            const unitId = unitMap.get(row.unit_name)
                            if (!unitId) {
                                console.log(`[Solver DEBUG] ${row.unit_name}: Unit not found in map`)
                                return null
                            }

                            const makeReadyDateStr = parseDate(row.make_ready_date)!
                            const daysOverdue = daysBetween(makeReadyDateStr, today)
                            
                            console.log(`[Solver DEBUG] Creating flag for ${row.unit_name}: ${daysOverdue} days overdue`)
                            
                            return {
                                unit_id: unitId,
                                property_code: pCode,
                                flag_type: 'makeready_overdue',
                                severity: daysOverdue > 7 ? 'error' : 'warning',
                                title: 'MakeReady Overdue',
                                message: `Unit ${row.unit_name} makeready was due on ${row.make_ready_date}`,
                                metadata: {
                                    expected_date: row.make_ready_date,
                                    days_overdue: daysOverdue,
                                    unit_name: row.unit_name
                                }
                            }
                        })
                        .filter((f): f is NonNullable<typeof f> => f !== null && f !== undefined)

                    // Step 3: Insert flags (check for existing unresolved flags first)
                    if (overdueUnits.length > 0) {
                        // Query for existing unresolved flags to avoid 409 conflicts
                        const unitIdsToCheck = overdueUnits.map((f: any) => f.unit_id)
                        const { data: existingFlags } = await supabase
                            .from('unit_flags')
                            .select('unit_id, flag_type')
                            .eq('flag_type', 'makeready_overdue')
                            .in('unit_id', unitIdsToCheck)
                            .is('resolved_at', null)

                        // Create a Set of existing (unit_id, flag_type) combinations
                        const existingSet = new Set(
                            (existingFlags || []).map((f: any) => `${f.unit_id}:${f.flag_type}`)
                        )

                        // Filter out flags that already exist
                        const newFlags = overdueUnits.filter((f: any) =>
                            !existingSet.has(`${f.unit_id}:${f.flag_type}`)
                        )

                        if (newFlags.length > 0) {
                            const { data: inserted, error: flagError } = await supabase
                                .from('unit_flags')
                                .insert(newFlags)
                                .select('id')

                            if (flagError) {
                                console.error(`[Solver] Flag Creation Error (MakeReady) ${pCode}:`, flagError)
                            } else {
                                const createdCount = inserted?.length || 0
                                totalFlagsCreated += createdCount
                                if (createdCount > 0) {
                                    console.log(`[Solver] Created ${createdCount} new overdue flags for ${pCode}`)
                                    tracker.trackFlag(pCode, 'makeready_overdue', createdCount)
                                }
                            }
                        } else {
                            console.log(`[Solver] No new MakeReady flags to create for ${pCode} (all already exist)`)
                        }
                    }
                    
                    
                    // Step 4: Resolve flags for units no longer in MakeReady report
                    // TODO: Fix this - .not('unit_id', 'in', largeArray) causes 400 errors
                    // Need to implement a different approach for flag resolution
                    /*
                    const currentMakeReadyUnitIds = rows
                        .map((r: any) => unitMap.get(r.unit_name))
                        .filter(Boolean)
                    
                    if (currentMakeReadyUnitIds.length > 0) {
                        const { data: resolvedFlags } = await supabase
                            .from('unit_flags')
                            .update({ resolved_at: getNowPST() })
                            .eq('flag_type', 'makeready_overdue')
                            .eq('property_code', pCode)
                            .not('unit_id', 'in', currentMakeReadyUnitIds)
                            .is('resolved_at', null)
                            .select('id')
                        
                        if (resolvedFlags) {
                            totalFlagsResolved += resolvedFlags.length
                            console.log(`[Solver] Resolved ${resolvedFlags.length} flags for ${pCode}`)
                        }
                    }
                    */
                }
                
                statusMessage.value = `MakeReady Synced: ${totalFlagsCreated} flags created, ${totalFlagsResolved} resolved.`
            }

            // Step 2D: Applications (Leasing Pipeline)
            statusMessage.value = 'Processing Applications...'
            const { data: applicationsReports } = await supabase
                .from('import_staging')
                .select('id, raw_data, property_code')
                .eq('batch_id', batchId)
                .eq('report_type', 'applications')

            let totalApplicationsSaved = 0
            let totalAvailabilitiesUpdated = 0
            let totalApplicationFlags = 0

            if (applicationsReports && applicationsReports.length > 0) {
                const today = getTodayPST()
                const overdueThreshold = 7  // Days before application is considered overdue

                for (const report of applicationsReports) {
                    const pCode = report.property_code
                    const rows = report.raw_data as any[]

                    if (!rows || rows.length === 0) continue

                    console.log(`[Solver] Processing Applications ${pCode} (${rows.length} rows)`)

                    // Step 1: Resolve units
                    const unitNames = [...new Set(rows.map((r: any) => r.unit_name).filter(Boolean))]
                    const { data: units } = await supabase
                        .from('units')
                        .select('id, unit_name')
                        .eq('property_code', pCode)
                        .in('unit_name', unitNames)

                    const unitMap = new Map<string, string>()
                    units?.forEach((u: any) => unitMap.set(u.unit_name, u.id))

                    // Step 2: Process each application
                    let propertyApplicationsSaved = 0
                    for (const row of rows) {
                        const unitId = unitMap.get(row.unit_name)
                        if (!unitId) {
                            console.log(`[Solver] Skipping application for ${row.unit_name} - unit not found`)
                            continue
                        }

                        // Step 3: Update availability with leasing agent (non-critical, best-effort)
                        if (row.leasing_agent) {
                            // Query for active availability without status filter to avoid 406 errors
                            const { data: availability } = await supabase
                                .from('availabilities')
                                .select('id, status')
                                .eq('unit_id', unitId)
                                .eq('is_active', true)
                                .maybeSingle()

                            // Only update if availability exists and is in applicable status
                            if (availability && ['Applied', 'Leased'].includes(availability.status || '')) {
                                const { error: availError } = await supabase
                                    .from('availabilities')
                                    .update({ leasing_agent: row.leasing_agent })
                                    .eq('id', availability.id)

                                if (!availError) {
                                    totalAvailabilitiesUpdated++
                                }
                            }
                        }

                        // Step 4: Save application
                        const applicationData = {
                            property_code: pCode,
                            unit_id: unitId,
                            applicant_name: row.applicant,  // Parser uses 'applicant'
                            agent: row.leasing_agent,       // Parser uses 'leasing_agent'
                            application_date: parseDate(row.application_date),
                            screening_result: row.screening_result || null
                        }

                        // Upsert with explicit conflict resolution on unique constraint
                        const { error: appError } = await supabase
                            .from('applications')
                            .upsert(applicationData, {
                                onConflict: 'property_code,unit_id,applicant_name,application_date',
                                ignoreDuplicates: false  // Update on conflict
                            })

                        if (!appError) {
                            totalApplicationsSaved++
                            propertyApplicationsSaved++

                            // Track application saved
                            tracker.trackApplication(pCode, {
                                applicant_name: row.applicant,
                                unit_name: row.unit_name,
                                unit_id: unitId,
                                application_date: parseDate(row.application_date) || today,
                                screening_result: row.screening_result
                            })
                        } else {
                            console.error(`[Solver] Application save error for ${row.applicant}:`, appError)
                        }

                        // Step 5: Check for overdue applications (no screening result after 7 days)
                        if (!row.screening_result && row.application_date) {
                            const appDateStr = parseDate(row.application_date)
                            if (appDateStr) {
                                const daysOld = daysBetween(appDateStr, today)

                                if (daysOld > overdueThreshold) {
                                const severity = daysOld > 14 ? 'error' : 'warning'
                                
                                // Check if flag already exists before inserting
                                const { data: existingFlag } = await supabase
                                    .from('unit_flags')
                                    .select('id')
                                    .eq('unit_id', unitId)
                                    .eq('flag_type', 'application_overdue')
                                    .is('resolved_at', null)
                                    .maybeSingle()

                                if (!existingFlag) {
                                    const flag = {
                                        unit_id: unitId,
                                        property_code: pCode,
                                        flag_type: 'application_overdue',
                                        severity: severity,
                                        title: 'Application Screening Overdue',
                                        message: `Application for ${row.applicant} submitted ${daysOld} days ago without screening result`,
                                        metadata: {
                                            application_date: appDateStr,
                                            days_overdue: daysOld,
                                            applicant_name: row.applicant,
                                            unit_name: row.unit_name,
                                            agent: row.leasing_agent
                                        }
                                    }

                                    const { error: flagError } = await supabase
                                        .from('unit_flags')
                                        .insert([flag])

                                    if (!flagError) {
                                        totalApplicationFlags++
                                        tracker.trackFlag(pCode, 'application_overdue', 1)
                                    } else {
                                        console.error(`[Solver] Application flag creation error:`, flagError)
                                    }
                                }
                            }
                            }
                        }
                    }

                    console.log(`[Solver] ${pCode}: ${propertyApplicationsSaved} applications saved, ${totalApplicationFlags} overdue flags created`)
                }

                statusMessage.value = `Applications Synced: ${totalApplicationsSaved} saved, ${totalAvailabilitiesUpdated} availabilities updated, ${totalApplicationFlags} overdue flags.`
            }

            // --- STEP 2E: TRANSFERS (Unit-to-Unit Moves) ---
            statusMessage.value = 'Fetching Transfers Data...'
            const { data: transferReports, error: transferFetchError } = await supabase
                .from('import_staging')
                .select('id, raw_data, property_code')
                .eq('batch_id', batchId)
                .eq('report_type', 'transfers')
            
            if (transferFetchError) throw transferFetchError

            if (transferReports && transferReports.length > 0) {
                statusMessage.value = `Processing Transfers for ${transferReports.length} properties...`
                let totalTransferFlags = 0

                for (const report of transferReports) {
                    const pCode = report.property_code
                    const rows = report.raw_data as unknown as any[] // TransfersRow[]
                    
                    if (rows.length === 0) continue
                    
                    const flagsToCreate: any[] = []
                    
                    for (const row of rows) {
                        // Skip if missing critical data
                        if (!row.resident || !row.from_unit_name || !row.to_unit_name) {
                            console.warn(`[Solver] Transfer missing data: ${JSON.stringify(row)}`)
                            continue
                        }
                        
                        // Skip same-unit transfers (invalid data)
                        if (row.from_property_code === row.to_property_code && 
                            row.from_unit_name === row.to_unit_name) {
                            console.warn(`[Solver] Same-unit transfer skipped: ${row.from_unit_name}`)
                            continue
                        }
                        
                        // Resolve unit IDs
                        const fromUnitId = resolveUnitId(row.from_property_code, row.from_unit_name)
                        const toUnitId = resolveUnitId(row.to_property_code, row.to_unit_name)
                        
                        // Skip if units not found
                        if (!fromUnitId) {
                            console.warn(`[Solver] Transfer FROM unit not found: ${row.from_unit_name} (${row.from_property_code})`)
                            continue
                        }
                        if (!toUnitId) {
                            console.warn(`[Solver] Transfer TO unit not found: ${row.to_unit_name} (${row.to_property_code})`)
                            continue
                        }

                        const transferDate = getTodayPST()

                        // Create flag for FROM unit
                        flagsToCreate.push({
                            unit_id: fromUnitId,
                            property_code: row.from_property_code,
                            flag_type: 'unit_transfer_active',
                            severity: 'info',
                            title: 'Resident Transferring Out',
                            message: `${row.resident} is transferring to ${row.to_unit_name} (${row.to_property_code})`,
                            metadata: {
                                resident_name: row.resident,
                                from_property: row.from_property_code,
                                from_unit: row.from_unit_name,
                                from_status: row.from_status,
                                to_property: row.to_property_code,
                                to_unit: row.to_unit_name,
                                to_status: row.to_status,
                                transfer_date: transferDate
                            }
                        })
                        
                        // Create flag for TO unit
                        flagsToCreate.push({
                            unit_id: toUnitId,
                            property_code: row.to_property_code,
                            flag_type: 'unit_transfer_active',
                            severity: 'info',
                            title: 'Resident Transferring In',
                            message: `${row.resident} is transferring from ${row.from_unit_name} (${row.from_property_code})`,
                            metadata: {
                                resident_name: row.resident,
                                from_property: row.from_property_code,
                                from_unit: row.from_unit_name,
                                from_status: row.from_status,
                                to_property: row.to_property_code,
                                to_unit: row.to_unit_name,
                                to_status: row.to_status,
                                transfer_date: transferDate
                            }
                        })
                    }
                    
                    // Insert flags in batches (check for existing flags first)
                    if (flagsToCreate.length > 0) {
                        // Query for existing unresolved transfer flags
                        const unitIdsToCheck = flagsToCreate.map((f: any) => f.unit_id)
                        const { data: existingFlags } = await supabase
                            .from('unit_flags')
                            .select('unit_id, flag_type')
                            .eq('flag_type', 'unit_transfer_active')
                            .in('unit_id', unitIdsToCheck)
                            .is('resolved_at', null)

                        // Create Set of existing (unit_id, flag_type) combinations
                        const existingSet = new Set(
                            (existingFlags || []).map((f: any) => `${f.unit_id}:${f.flag_type}`)
                        )

                        // Filter out flags that already exist
                        const newFlags = flagsToCreate.filter((f: any) =>
                            !existingSet.has(`${f.unit_id}:${f.flag_type}`)
                        )

                        if (newFlags.length > 0) {
                            for (let i = 0; i < newFlags.length; i += 1000) {
                                const chunk = newFlags.slice(i, i + 1000)
                                const { error } = await supabase
                                    .from('unit_flags')
                                    .insert(chunk)

                                if (error) {
                                    console.error(`[Solver] Transfer Flag Error ${pCode}:`, error)
                                } else {
                                    totalTransferFlags += chunk.length
                                    tracker.trackFlag(pCode, 'unit_transfer_active', chunk.length)
                                }
                            }
                        } else {
                            console.log(`[Solver] No new transfer flags to create for ${pCode} (all already exist)`)
                        }
                    }
                }

                statusMessage.value = `Transfers Synced: ${totalTransferFlags} flags created.`
                console.log(`[Solver] Phase 2E Complete: ${totalTransferFlags} transfer flags created`)
            }

            // ==========================================
            // PHASE 3: OPS LOGIC (Alerts, Work Orders, Delinquencies)
            // ==========================================

            // --- STEP 3A: ALERTS ---
            statusMessage.value = 'Processing Alerts...'
            const { data: alertsReports } = await supabase
                .from('import_staging')
                .select('id, raw_data, property_code')
                .eq('batch_id', batchId)
                .eq('report_type', 'alerts')

            if (alertsReports && alertsReports.length > 0) {
                console.log(`[Solver] Phase 3A: Processing Alerts for ${alertsReports.length} properties`)

                const alertsSync = useAlertsSync()

                for (const report of alertsReports) {
                    const pCode = report.property_code
                    const rows = report.raw_data as any[]

                    if (!rows || rows.length === 0) continue

                    console.log(`[Solver] Processing Alerts for ${pCode} (${rows.length} rows)`)

                    // Sync alerts using existing sync logic
                    const success = await alertsSync.syncAlerts(rows)

                    if (success) {
                        console.log(`[Solver] ✓ Alerts synced for ${pCode}: ${alertsSync.syncStats.value}`)
                    } else {
                        console.error(`[Solver] ✗ Alerts sync failed for ${pCode}: ${alertsSync.syncError.value}`)
                    }
                }

                statusMessage.value = 'Alerts Synced'
                console.log(`[Solver] Phase 3A Complete: Alerts processed`)
            }

            // --- STEP 3B: WORK ORDERS ---
            statusMessage.value = 'Processing Work Orders...'
            const { data: workOrdersReports } = await supabase
                .from('import_staging')
                .select('id, raw_data, property_code')
                .eq('batch_id', batchId)
                .eq('report_type', 'work_orders')

            if (workOrdersReports && workOrdersReports.length > 0) {
                console.log(`[Solver] Phase 3B: Processing Work Orders for ${workOrdersReports.length} properties`)

                const workOrdersSync = useWorkOrdersSync()

                for (const report of workOrdersReports) {
                    const pCode = report.property_code
                    const rows = report.raw_data as any[]

                    if (!rows || rows.length === 0) continue

                    console.log(`[Solver] Processing Work Orders for ${pCode} (${rows.length} rows)`)

                    // Sync work orders using existing sync logic
                    const success = await workOrdersSync.syncWorkOrders(rows)

                    if (success) {
                        console.log(`[Solver] ✓ Work Orders synced for ${pCode}: ${workOrdersSync.syncStats.value}`)
                    } else {
                        console.error(`[Solver] ✗ Work Orders sync failed for ${pCode}: ${workOrdersSync.syncError.value}`)
                    }
                }

                statusMessage.value = 'Work Orders Synced'
                console.log(`[Solver] Phase 3B Complete: Work Orders processed`)
            }

            // --- STEP 3C: DELINQUENCIES ---
            statusMessage.value = 'Processing Delinquencies...'
            const { data: delinquenciesReports } = await supabase
                .from('import_staging')
                .select('id, raw_data, property_code')
                .eq('batch_id', batchId)
                .eq('report_type', 'delinquencies')

            if (delinquenciesReports && delinquenciesReports.length > 0) {
                console.log(`[Solver] Phase 3C: Processing Delinquencies for ${delinquenciesReports.length} properties`)

                const delinquenciesSync = useDelinquenciesSync()

                for (const report of delinquenciesReports) {
                    const pCode = report.property_code
                    const rows = report.raw_data as any[]

                    if (!rows || rows.length === 0) continue

                    console.log(`[Solver] Processing Delinquencies for ${pCode} (${rows.length} rows)`)

                    // Sync delinquencies using existing sync logic
                    const success = await delinquenciesSync.syncDelinquencies(rows)

                    if (success) {
                        console.log(`[Solver] ✓ Delinquencies synced for ${pCode}: ${delinquenciesSync.syncStats.value}`)
                    } else {
                        console.error(`[Solver] ✗ Delinquencies sync failed for ${pCode}: ${delinquenciesSync.syncError.value}`)
                    }
                }

                statusMessage.value = 'Delinquencies Synced'
                console.log(`[Solver] Phase 3C Complete: Delinquencies processed`)
            }

            // Complete tracking and generate report
            const propertiesProcessed = reports.map((r: any) => r.property_code)
            const result = await tracker.completeRun(batchId, propertiesProcessed)

            if (result) {
                // Generate markdown report
                const reportTimestamp = getNowPST()
                const markdown = reportGen.generateMarkdown(
                    batchId,
                    reportTimestamp,
                    result.summary,
                    result.events
                )

                // Generate filename
                const filename = reportGen.generateFilename(reportTimestamp, batchId)
                console.log(`[Solver] Report generated: ${filename}`)
                console.log('\n' + markdown + '\n')

                // Trigger automated email notifications
                console.log('[Solver] Triggering email notifications...')
                $fetch('/api/admin/notifications/send-summary', {
                    method: 'POST',
                    body: { runId: result.runId }
                }).then(resp => {
                    console.log('[Solver] Email trigger response:', resp)
                }).catch(err => {
                    console.error('[Solver] Email trigger failed:', err)
                })
            }

            statusMessage.value = `Completed: ${totalUpsertedTenancies} Tenancies, ${totalUpsertedResidents} Residents, ${totalUpsertedLeases} Leases, ${totalUpsertedAvailabilities || 0} Availabilities.`
        } catch (e: any) {
            // Mark run as failed
            await tracker.failRun(e.message)
            statusMessage.value = `Error: ${e.message}`
            throw e
        }
    }

    return {
        processBatch,
        statusMessage,
        skippedRows
    }
}
