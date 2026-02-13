/**
 * Renewals Worksheet Population
 *
 * Automatically populates a worksheet with expiring leases in the date range
 */

import { useSupabaseClient } from '#imports'

export async function populateWorksheet(worksheetId: string, startDate: string, endDate: string) {
  const supabase = useSupabaseClient()

  try {
    // Ensure dates are in YYYY-MM-DD format (no timezone conversion)
    const start = startDate.split('T')[0]
    const end = endDate.split('T')[0]

    console.log('[Renewals] Populating worksheet:', {
      worksheetId,
      startDate: start,
      endDate: end,
      originalStart: startDate,
      originalEnd: endDate
    })

    // 1. Fetch worksheet to get settings
    const { data: worksheet, error: worksheetError } = await supabase
      .from('renewal_worksheets')
      .select('*')
      .eq('id', worksheetId)
      .single()

    if (worksheetError) throw worksheetError

    // 2. First check: Do we have ANY Current leases for this property?
    const { data: allCurrentLeases, error: debugError } = await supabase
      .from('leases')
      .select('id, end_date, lease_status, is_active, tenancy_id')
      .eq('lease_status', 'Current')
      .eq('is_active', true)
      .limit(5)

    console.log('[Renewals] DEBUG - Sample Current leases:', {
      count: allCurrentLeases?.length || 0,
      samples: allCurrentLeases
    })

    // 3. Fetch expiring leases in date range WITH market rent from pricing view
    console.log('[Renewals] Query params:', {
      property_code: worksheet.property_code,
      startDate: start,
      endDate: end,
      lease_status: 'Current',
      is_active: true
    })

    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select(`
        *,
        tenancies!inner(*)
      `)
      .eq('lease_status', 'Current')
      .eq('is_active', true)
      .eq('tenancies.property_code', worksheet.property_code)
      .gte('end_date', start)
      .lte('end_date', end)
      .order('end_date')

    if (leasesError) {
      console.error('[Renewals] Query error:', leasesError)
      throw leasesError
    }

    console.log('[Renewals] Found expiring leases:', leases?.length || 0)
    if (leases && leases.length > 0) {
      console.log('[Renewals] Sample lease:', leases[0])
    }

    if (!leases || leases.length === 0) {
      console.log('[Renewals] No expiring leases found in date range')
      return { success: true, count: 0 }
    }

    // 3. Fetch units for unit names (batch to avoid URL length limits)
    const unitIds = [...new Set(leases.map((l: any) => l.tenancies?.unit_id).filter(Boolean))]
    const units = []

    // Batch queries: 20 IDs at a time
    for (let i = 0; i < unitIds.length; i += 20) {
      const batch = unitIds.slice(i, i + 20)
      const { data, error } = await supabase
        .from('units')
        .select('id, name')
        .in('id', batch)

      if (error) {
        console.error('[Renewals] Units fetch error:', error)
      } else {
        units.push(...(data || []))
      }
    }

    const unitMap = new Map(units?.map(u => [u.id, u.name]) || [])

    // 4. Fetch market rent from pricing view (batch)
    const marketRentData = []
    for (let i = 0; i < unitIds.length; i += 20) {
      const batch = unitIds.slice(i, i + 20)
      const { data, error } = await supabase
        .from('view_unit_pricing_analysis')
        .select('unit_id, calculated_market_rent')
        .in('unit_id', batch)

      if (error) {
        console.error('[Renewals] Market rent fetch error:', error)
      } else {
        marketRentData.push(...(data || []))
      }
    }

    const marketRentMap = new Map(marketRentData?.map(m => [m.unit_id, m.calculated_market_rent]) || [])
    console.log('[Renewals] Fetched market rent for', marketRentData?.length, 'units')

    // 5. Fetch residents separately
    const tenancyIds = leases.map((l: any) => l.tenancy_id)
    const { data: residents } = await supabase
      .from('residents')
      .select('tenancy_id, name, role')
      .in('tenancy_id', tenancyIds)
      .eq('role', 'Primary')

    const residentMap = new Map(residents?.map(r => [r.tenancy_id, r.name]) || [])

    console.log('[Renewals] Fetched', units?.length, 'units,', residents?.length, 'residents, and', marketRentData?.length, 'market rents')

    // 6. Create renewal worksheet items
    const items = leases.map((lease: any) => {
      const tenancy = lease.tenancies
      const unitId = tenancy?.unit_id
      const unitName = unitMap.get(unitId) || 'Unknown'
      const residentName = residentMap.get(lease.tenancy_id) || 'Unknown Resident'
      const marketRent = marketRentMap.get(unitId) || null

      return {
        worksheet_id: worksheetId,
        tenancy_id: lease.tenancy_id,
        unit_id: unitId,
        property_code: worksheet.property_code,

        // Denormalized fields
        unit_name: unitName,
        resident_name: residentName,
        lease_from_date: lease.start_date,
        lease_to_date: lease.end_date,
        move_in_date: tenancy?.move_in_date,

        // Rent fields
        current_rent: lease.rent_amount || 0,
        market_rent: marketRent, // From view_unit_pricing_analysis
        rent_offer_source: 'ltl_percent',

        // Default status
        renewal_type: 'standard',
        status: 'pending',
        approved: false,
        active: true
      }
    })

    console.log('[Renewals] Created', items.length, 'worksheet items')
    if (items.length > 0) {
      console.log('[Renewals] Sample item:', items[0])
    }

    // 7. Insert items in batches (1000 at a time to avoid limits)
    const batchSize = 1000
    let insertedCount = 0

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      const { error: insertError } = await supabase
        .from('renewal_worksheet_items')
        .insert(batch)

      if (insertError) {
        console.error('[Renewals] Insert error:', insertError)
        throw insertError
      }

      insertedCount += batch.length
    }

    console.log('[Renewals] Successfully populated worksheet with', insertedCount, 'items')

    return { success: true, count: insertedCount }
  } catch (error) {
    console.error('[Renewals] Population error:', error)
    return { success: false, error, count: 0 }
  }
}

/**
 * Populate MTM renewals (residents already month-to-month)
 */
export async function populateMtmRenewals(worksheetId: string, propertyCode: string, mtmFee: number) {
  const supabase = useSupabaseClient()

  try {
    console.log('[Renewals] Populating MTM renewals for property:', propertyCode)

    // Fetch current MTM leases (leases that have already expired but tenant still there)
    const { data: mtmLeases, error: mtmError } = await supabase
      .from('leases')
      .select('*, tenancies!inner(*)')
      .eq('lease_status', 'Current') // Check lease status
      .eq('tenancies.property_code', propertyCode)
      .eq('tenancies.status', 'Current')
      .eq('is_active', true)
      .lt('end_date', new Date().toISOString().split('T')[0]) // Lease already expired

    if (mtmError) throw mtmError

    console.log('[Renewals] Found MTM leases:', mtmLeases?.length || 0)

    if (!mtmLeases || mtmLeases.length === 0) {
      return { success: true, count: 0 }
    }

    // Fetch units and residents (batch to avoid URL length limits)
    const unitIds = [...new Set(mtmLeases.map((l: any) => l.tenancies?.unit_id).filter(Boolean))]
    const units = []

    // Batch queries: 20 IDs at a time
    for (let i = 0; i < unitIds.length; i += 20) {
      const batch = unitIds.slice(i, i + 20)
      const { data, error } = await supabase
        .from('units')
        .select('id, name')
        .in('id', batch)

      if (error) {
        console.error('[Renewals] MTM units fetch error:', error)
      } else {
        units.push(...(data || []))
      }
    }

    const unitMap = new Map(units?.map(u => [u.id, u.name]) || [])

    // Fetch market rent from pricing view (batch)
    const marketRentData = []
    for (let i = 0; i < unitIds.length; i += 20) {
      const batch = unitIds.slice(i, i + 20)
      const { data, error } = await supabase
        .from('view_unit_pricing_analysis')
        .select('unit_id, calculated_market_rent')
        .in('unit_id', batch)

      if (error) {
        console.error('[Renewals] MTM market rent fetch error:', error)
      } else {
        marketRentData.push(...(data || []))
      }
    }

    const marketRentMap = new Map(marketRentData?.map(m => [m.unit_id, m.calculated_market_rent]) || [])

    const tenancyIds = mtmLeases.map((l: any) => l.tenancy_id)
    const { data: residents } = await supabase
      .from('residents')
      .select('tenancy_id, name, role')
      .in('tenancy_id', tenancyIds)
      .eq('role', 'Primary')

    const residentMap = new Map(residents?.map(r => [r.tenancy_id, r.name]) || [])

    // Create MTM renewal items
    const items = mtmLeases.map((lease: any) => {
      const tenancy = lease.tenancies
      const unitId = tenancy.unit_id
      const unitName = unitMap.get(unitId) || 'Unknown'
      const residentName = residentMap.get(lease.tenancy_id) || 'Unknown Resident'
      const marketRent = marketRentMap.get(unitId) || null

      return {
        worksheet_id: worksheetId,
        tenancy_id: lease.tenancy_id,
        unit_id: unitId,
        property_code: propertyCode,

        unit_name: unitName,
        resident_name: residentName,
        lease_from_date: lease.start_date,
        lease_to_date: lease.end_date,
        move_in_date: tenancy.move_in_date,

        current_rent: lease.rent_amount || 0,
        market_rent: marketRent, // From view_unit_pricing_analysis
        mtm_rent: (marketRent || lease.rent_amount || 0) + mtmFee, // Market + MTM fee

        renewal_type: 'mtm',
        rent_offer_source: 'manual',
        status: 'pending',
        approved: false,
        active: true
      }
    })

    const { error: insertError } = await supabase
      .from('renewal_worksheet_items')
      .insert(items)

    if (insertError) throw insertError

    console.log('[Renewals] Successfully populated', items.length, 'MTM renewals')

    return { success: true, count: items.length }
  } catch (error) {
    console.error('[Renewals] MTM population error:', error)
    return { success: false, error, count: 0 }
  }
}
