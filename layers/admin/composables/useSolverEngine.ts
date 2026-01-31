
import { v4 as uuidv4 } from 'uuid'
import type { Database } from '~/types/supabase'
import type { ResidentsStatusRow } from '~/layers/parsing/composables/parsers/useParseResidentsStatus'
import { resolveUnitId } from '../../base/utils/lookup'

export const useSolverEngine = () => {
    const supabase = useSupabaseClient<Database>()
    const user = useSupabaseUser()
    
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
    
    const parseCurrency = (val: string | null): number | null => {
        if (!val) return null
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
                        
                        // A. Check which already exist
                        const { data: existingData, error: checkError } = await supabase
                            .from('tenancies')
                            .select('id')
                            .in('id', allTenancyIds)
                            
                        if (checkError) throw checkError
                        
                        const existingIds = new Set(existingData?.map(r => r.id) || [])
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
                        }
                        
                        // C. Update Existing
                        if (existingTenancies.length > 0) {
                             for (let i = 0; i < existingTenancies.length; i += 1000) {
                                const chunk = existingTenancies.slice(i, i + 1000)
                                const { error } = await supabase.from('tenancies').upsert(chunk) // Upsert is safe for updates if valid ID
                                if (error) throw error
                                totalUpsertedTenancies += chunk.length
                             }
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

                        const newResidents: any[] = []
                        const existingResidents: any[] = []

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
                                // Existing: Include ID for Update
                                existingResidents.push({ ...payload, id: match.id })
                            } else {
                                // New: Omit ID for Insert (Let DB generate)
                                newResidents.push(payload)
                            }
                        }
                        
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
                    const relevantTenancyIds = [...new Set(rows.map(r => r.tenancy_code).filter(Boolean))]
                    
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
                        
                        found?.forEach(f => validTenancyIds.add(f.id))
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
                        
                        const tenancyIds = [...new Set(leasesToUpsert.map(l => l.tenancy_id))]
                        
                        // Fetch existing leases for these tenancies (need full data for renewal detection)
                        const { data: existingLeases, error: fetchError } = await supabase
                            .from('leases')
                            .select('id, tenancy_id, start_date, end_date, is_active')
                            .in('tenancy_id', tenancyIds)
                            .eq('is_active', true) // Only fetch active leases
                        
                        if (fetchError) throw fetchError
                        
                        // Build map: tenancy_id -> active lease record
                        const leaseMap = new Map<string, any>()
                        existingLeases?.forEach(lease => {
                            // Only keep the active lease (should be only one per tenancy)
                            if (!leaseMap.has(lease.tenancy_id)) {
                                leaseMap.set(lease.tenancy_id, lease)
                            }
                        })
                        
                        const toUpdate: any[] = []
                        const toInsert: any[] = []
                        const toDeactivate: any[] = [] // Leases to mark as inactive (renewals)
                        
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
                                    // RENEWAL: Deactivate old lease, insert new lease
                                    toDeactivate.push({
                                        id: existingLease.id,
                                        is_active: false
                                    })
                                    toInsert.push(newLease) // New lease with same tenancy_id
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
                        if (toDeactivate.length > 0) {
                            for (let i = 0; i < toDeactivate.length; i += 1000) {
                                const chunk = toDeactivate.slice(i, i + 1000)
                                const { error } = await supabase.from('leases').upsert(chunk)
                                if (error) {
                                    console.error(`[Solver] Lease Deactivation Error ${pCode}:`, error)
                                    throw error
                                }
                            }
                            console.log(`[Solver] Deactivated ${toDeactivate.length} leases (renewals) for ${pCode}`)
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
                    const unitNames = [...new Set(rows.map(r => r.unit_name).filter(Boolean))]
                    
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
                        
                        units?.forEach(u => unitMap.set(u.unit_name, u.id))
                    }

                    // Fetch active tenancies for status derivation
                    const unitIds = Array.from(unitMap.values())
                    const tenancyMap = new Map<string, string>() // unit_id -> tenancy_status
                    
                    if (unitIds.length > 0) {
                        for (let i = 0; i < unitIds.length; i += 1000) {
                            const chunk = unitIds.slice(i, i + 1000)
                            const { data: tenancies } = await supabase
                                .from('tenancies')
                                .select('unit_id, status')
                                .in('unit_id', chunk)
                            
                            tenancies?.forEach(t => tenancyMap.set(t.unit_id, t.status))
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
                        const tenancyStatus = tenancyMap.get(unitId)
                        let availabilityStatus = 'Available' // Default
                        let isActive = true // Default
                        let shouldClearApplicantFields = false
                        
                        if (tenancyStatus) {
                            if (tenancyStatus === 'Current') {
                                availabilityStatus = 'Occupied'
                                isActive = false // End this availability cycle
                            }
                            else if (tenancyStatus === 'Future') availabilityStatus = 'Leased'
                            else if (tenancyStatus === 'Applicant') availabilityStatus = 'Applied'
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
                            is_active: isActive
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
                    }

                    if (availabilitiesToUpsert.length > 0) {
                        // Fetch existing active availabilities
                        const { data: existingAvails } = await supabase
                            .from('availabilities')
                            .select('id, unit_id')
                            .in('unit_id', availabilitiesToUpsert.map(a => a.unit_id))
                            .eq('is_active', true)
                        
                        const availMap = new Map<string, string>() // unit_id -> availability_id
                        existingAvails?.forEach(a => availMap.set(a.unit_id, a.id))
                        
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
                    }
                }
                statusMessage.value = `Availabilities Synced: ${totalUpsertedAvailabilities} records.`
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
                        }

                        const updatePayload: any = {
                            id: tenancy.id,
                            property_code: pCode,  // Required NOT NULL field
                            unit_id: unitId,  // Required NOT NULL field
                            status: finalStatus,  // Required NOT NULL field
                            move_out_date: parseDate(row.move_out_date)
                        }

                        tenancyUpdates.push(updatePayload)
                        
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
                const today = new Date()
                const cushionDays = 1  // Grace period
                
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
                    units?.forEach(u => unitMap.set(u.unit_name, u.id))
                    
                    // Step 2: Detect overdue units
                    console.log(`[Solver DEBUG] Today: ${today.toISOString()}, Cushion: ${cushionDays} days`)
                    
                    const overdueUnits = rows
                        .filter((row: any) => {
                            const makeReadyDateStr = parseDate(row.make_ready_date)
                            if (!makeReadyDateStr) {
                                console.log(`[Solver DEBUG] ${row.unit_name}: No make_ready_date`)
                                return false
                            }
                            
                            const makeReadyDate = new Date(makeReadyDateStr)
                            const cutoffDate = new Date(today)
                            cutoffDate.setDate(cutoffDate.getDate() - cushionDays)
                            
                            const isOverdue = makeReadyDate < cutoffDate
                            console.log(`[Solver DEBUG] ${row.unit_name}: ready=${makeReadyDateStr}, cutoff=${cutoffDate.toISOString()}, overdue=${isOverdue}`)
                            
                            return isOverdue
                        })
                        .map((row: any) => {
                            const unitId = unitMap.get(row.unit_name)
                            if (!unitId) {
                                console.log(`[Solver DEBUG] ${row.unit_name}: Unit not found in map`)
                                return null
                            }
                            
                            const makeReadyDateStr = parseDate(row.make_ready_date)!
                            const makeReadyDate = new Date(makeReadyDateStr)
                            const daysOverdue = Math.floor((today.getTime() - makeReadyDate.getTime()) / (1000 * 60 * 60 * 24))
                            
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
                        .filter(Boolean)
                    
                    // Step 3: Upsert flags
                    if (overdueUnits.length > 0) {
                        // Use insert with ignoreDuplicates to handle the partial unique index
                        const { data: inserted, error: flagError } = await supabase
                            .from('unit_flags')
                            .insert(overdueUnits, { ignoreDuplicates: true })
                            .select('id')
                        
                        // Suppress duplicate errors (code 23505) - expected on re-runs
                        if (flagError && flagError.code !== '23505') {
                            console.error(`[Solver] Flag Creation Error (MakeReady) ${pCode}:`, flagError)
                        } else {
                            const createdCount = inserted?.length || 0
                            totalFlagsCreated += createdCount
                            if (createdCount > 0) {
                                console.log(`[Solver] Created ${createdCount} overdue flags for ${pCode}`)
                            }
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
                            .update({ resolved_at: new Date().toISOString() })
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
                const today = new Date()
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
                    units?.forEach(u => unitMap.set(u.unit_name, u.id))

                    // Step 2: Process each application
                    let propertyApplicationsSaved = 0
                    for (const row of rows) {
                        const unitId = unitMap.get(row.unit_name)
                        if (!unitId) {
                            console.log(`[Solver] Skipping application for ${row.unit_name} - unit not found`)
                            continue
                        }

                        // Step 3: Update availability with leasing agent
                        if (row.leasing_agent) {
                            const { data: availability } = await supabase
                                .from('availabilities')
                                .select('id')
                                .eq('unit_id', unitId)
                                .in('status', ['Applied', 'Leased'])  // Fixed: Use availability_status ENUM values
                                .single()

                            if (availability) {
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

                        const { error: appError } = await supabase
                            .from('applications')
                            .upsert(applicationData)

                        if (!appError) {
                            totalApplicationsSaved++
                            propertyApplicationsSaved++
                        } else {
                            console.error(`[Solver] Application save error for ${row.applicant}:`, appError)
                        }

                        // Step 5: Check for overdue applications (no screening result after 7 days)
                        if (!row.screening_result && row.application_date) {
                            const appDateStr = parseDate(row.application_date)
                            const appDate = new Date(appDateStr)
                            const daysOld = Math.floor((today.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24))

                            if (daysOld > overdueThreshold) {
                                const severity = daysOld > 14 ? 'error' : 'warning'
                                
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
                                    .insert([flag], { ignoreDuplicates: true })

                                // Suppress duplicate errors (code 23505) - expected on re-runs
                                if (!flagError || flagError.code === '23505') {
                                    if (!flagError) {
                                        totalApplicationFlags++
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
                        
                        const transferDate = new Date().toISOString().split('T')[0]
                        
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
                    
                    // Insert flags in batches
                    if (flagsToCreate.length > 0) {
                        for (let i = 0; i < flagsToCreate.length; i += 1000) {
                            const chunk = flagsToCreate.slice(i, i + 1000)
                            const { error } = await supabase
                                .from('unit_flags')
                                .insert(chunk, { ignoreDuplicates: true })
                            
                            if (error) {
                                // Suppress duplicate errors (23505)
                                if (error.code !== '23505') {
                                    console.error(`[Solver] Transfer Flag Error ${pCode}:`, error)
                                }
                            } else {
                                totalTransferFlags += chunk.length
                            }
                        }
                    }
                    
                    // Log per-property results
                    if (flagsToCreate.length > 0) {
                        console.log(`[Solver] ${pCode}: ${flagsToCreate.length} transfer flags created`)
                    }
                }

                statusMessage.value = `Transfers Synced: ${totalTransferFlags} flags created.`
                console.log(`[Solver] Phase 2E Complete: ${totalTransferFlags} transfer flags created`)
            }

            statusMessage.value = `Completed: ${totalUpsertedTenancies} Tenancies, ${totalUpsertedResidents} Residents, ${totalUpsertedLeases} Leases, ${totalUpsertedAvailabilities || 0} Availabilities.`
        } catch (e: any) {
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
