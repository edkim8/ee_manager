/**
 * MTM Offer History Composable
 *
 * Tracks MTM (Month-to-Month) rent increase offers for CA rent control compliance.
 * Uses HYBRID approach: checks MTM history first, falls back to leases table.
 *
 * CA Properties: CV, WO, OB
 * Rule: Maximum % increase over any rolling 12-month period
 */

interface MtmOffer {
  id: string
  unit_id: string
  tenancy_id: string
  property_code: string
  current_rent: number
  offered_rent: number
  rent_increase: number
  increase_percent: number
  offer_date: string
  acceptance_date: string | null
  effective_date: string
  status: 'offered' | 'accepted' | 'declined' | 'superseded' | 'effective' | 'void'
  renewal_worksheet_id: string | null
  renewal_worksheet_item_id: string | null
  created_at: string
  notes: string | null
}

interface CAComplianceCheck {
  baseRent: number | null
  baseRentDate: string | null
  baseRentSource: 'mtm' | 'lease' | 'none'
  currentRent: number
  maxAllowedRent: number
  availableHeadroom: number
  increasePercent12Months: number | null
  daysSinceLastIncrease: number | null
  isCompliant: boolean
  canIncrease: boolean
  warningMessage: string | null
}

export const useMtmHistory = () => {
  const supabase = useSupabaseClient()

  /**
   * Get rent from 12 months ago (HYBRID approach)
   * Checks MTM history first, then falls back to leases table
   */
  const getRent12MonthsAgo = async (
    unitId: string,
    tenancyId: string,
    asOfDate: string = new Date().toISOString().split('T')[0]
  ): Promise<{
    rent: number | null
    effectiveDate: string | null
    source: 'mtm' | 'lease' | 'none'
  }> => {
    // Calculate 12 months ago
    const targetDate = new Date(asOfDate)
    targetDate.setMonth(targetDate.getMonth() - 12)
    const twelveMonthsAgo = targetDate.toISOString().split('T')[0]

    console.log('[MTM History] Looking for rent on/before:', twelveMonthsAgo)

    // STEP 1: Check MTM history first
    const { data: mtmData, error: mtmError } = await supabase
      .from('mtm_offer_history')
      .select('offered_rent, effective_date')
      .eq('unit_id', unitId)
      .eq('tenancy_id', tenancyId)
      .eq('status', 'effective')
      .lte('effective_date', twelveMonthsAgo)
      .order('effective_date', { ascending: false })
      .limit(1)

    if (mtmError) {
      console.error('[MTM History] Error querying MTM history:', mtmError)
    }

    if (mtmData && mtmData.length > 0) {
      console.log('[MTM History] Found rent in MTM history:', mtmData[0])
      return {
        rent: mtmData[0].offered_rent,
        effectiveDate: mtmData[0].effective_date,
        source: 'mtm'
      }
    }

    console.log('[MTM History] No MTM history found, checking leases table...')

    // STEP 2: Fallback to leases table
    const { data: leaseData, error: leaseError } = await supabase
      .from('leases')
      .select('rent_amount, start_date')
      .eq('unit_id', unitId)
      .eq('tenancy_id', tenancyId)
      .lte('start_date', twelveMonthsAgo)
      .order('start_date', { ascending: false })
      .limit(1)

    if (leaseError) {
      console.error('[MTM History] Error querying leases:', leaseError)
    }

    if (leaseData && leaseData.length > 0) {
      console.log('[MTM History] Found rent in leases table:', leaseData[0])
      return {
        rent: leaseData[0].rent_amount,
        effectiveDate: leaseData[0].start_date,
        source: 'lease'
      }
    }

    console.log('[MTM History] No historical rent found')
    return {
      rent: null,
      effectiveDate: null,
      source: 'none'
    }
  }

  /**
   * Calculate CA rent control compliance
   * Returns max allowed rent and available headroom
   */
  const checkCACompliance = async (
    unitId: string,
    tenancyId: string,
    currentRent: number,
    mtmMaxPercent: number,
    asOfDate: string = new Date().toISOString().split('T')[0]
  ): Promise<CAComplianceCheck> => {
    console.log('[CA Compliance] Checking for unit:', unitId, 'Max %:', mtmMaxPercent)

    // Get base rent from 12 months ago
    const { rent: baseRent, effectiveDate: baseRentDate, source } = await getRent12MonthsAgo(
      unitId,
      tenancyId,
      asOfDate
    )

    // If no historical rent found, use current rent as baseline (new tenancy)
    const complianceBaseRent = baseRent ?? currentRent
    const maxAllowedRent = complianceBaseRent * (1 + mtmMaxPercent / 100)
    const availableHeadroom = Math.max(0, maxAllowedRent - currentRent)

    // Calculate actual increase over 12 months
    let increasePercent12Months: number | null = null
    let daysSinceLastIncrease: number | null = null

    if (baseRent !== null && baseRent > 0) {
      increasePercent12Months = ((currentRent - baseRent) / baseRent) * 100
    }

    if (baseRentDate) {
      const baseDate = new Date(baseRentDate)
      const currentDate = new Date(asOfDate)
      daysSinceLastIncrease = Math.floor((currentDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Compliance checks
    const isCompliant = currentRent <= maxAllowedRent
    const canIncrease = availableHeadroom > 0
    const exceedsLimit = increasePercent12Months !== null && increasePercent12Months >= mtmMaxPercent

    // Generate warning message
    let warningMessage: string | null = null

    if (!isCompliant) {
      warningMessage = `⚠️ VIOLATION: Current rent ($${currentRent.toFixed(0)}) exceeds max allowed ($${maxAllowedRent.toFixed(0)}) for ${mtmMaxPercent}% cap`
    } else if (exceedsLimit) {
      warningMessage = `⚠️ CA Rent Control: Already increased ${increasePercent12Months?.toFixed(1)}% over last 12 months. Max: ${mtmMaxPercent}%`
    } else if (availableHeadroom < 50 && daysSinceLastIncrease !== null && daysSinceLastIncrease < 365) {
      warningMessage = `⚠️ CA Rent Control: Only $${availableHeadroom.toFixed(0)} headroom remaining in 12-month window`
    } else if (source === 'none') {
      warningMessage = `ℹ️ No rent history found. Using current rent as baseline. Verify compliance manually.`
    }

    console.log('[CA Compliance] Result:', {
      baseRent: complianceBaseRent,
      currentRent,
      maxAllowedRent,
      availableHeadroom,
      isCompliant,
      canIncrease
    })

    return {
      baseRent: baseRent,
      baseRentDate,
      baseRentSource: source,
      currentRent,
      maxAllowedRent,
      availableHeadroom,
      increasePercent12Months,
      daysSinceLastIncrease,
      isCompliant,
      canIncrease,
      warningMessage
    }
  }

  /**
   * Record MTM offer in history
   */
  const recordMtmOffer = async (
    unitId: string,
    tenancyId: string,
    propertyCode: string,
    currentRent: number,
    offeredRent: number,
    offerDate: string,
    effectiveDate: string,
    worksheetId?: string,
    worksheetItemId?: string,
    notes?: string
  ): Promise<MtmOffer | null> => {
    console.log('[MTM History] Recording offer:', {
      unitId,
      currentRent,
      offeredRent,
      increase: offeredRent - currentRent
    })

    const { data, error } = await supabase
      .from('mtm_offer_history')
      .insert({
        unit_id: unitId,
        tenancy_id: tenancyId,
        property_code: propertyCode,
        current_rent: currentRent,
        offered_rent: offeredRent,
        offer_date: offerDate,
        effective_date: effectiveDate,
        status: 'offered',
        renewal_worksheet_id: worksheetId,
        renewal_worksheet_item_id: worksheetItemId,
        notes: notes || null
      })
      .select()
      .single()

    if (error) {
      console.error('[MTM History] Failed to record offer:', error)
      throw error
    }

    console.log('[MTM History] Offer recorded successfully:', data.id)
    return data as MtmOffer
  }

  /**
   * Update MTM offer status
   */
  const updateMtmOfferStatus = async (
    offerId: string,
    status: MtmOffer['status'],
    acceptanceDate?: string
  ): Promise<void> => {
    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (acceptanceDate && (status === 'accepted' || status === 'effective')) {
      updates.acceptance_date = acceptanceDate
    }

    const { error } = await supabase
      .from('mtm_offer_history')
      .update(updates)
      .eq('id', offerId)

    if (error) {
      console.error('[MTM History] Failed to update status:', error)
      throw error
    }

    console.log('[MTM History] Status updated:', offerId, '→', status)
  }

  /**
   * Mark offers as effective based on effective_date
   */
  const markOffersEffective = async (asOfDate: string = new Date().toISOString().split('T')[0]): Promise<number> => {
    const { data, error } = await supabase
      .from('mtm_offer_history')
      .update({ status: 'effective' })
      .eq('status', 'accepted')
      .lte('effective_date', asOfDate)
      .select('id')

    if (error) {
      console.error('[MTM History] Failed to mark offers effective:', error)
      throw error
    }

    const count = data?.length || 0
    console.log('[MTM History] Marked', count, 'offers as effective')
    return count
  }

  return {
    getRent12MonthsAgo,
    checkCACompliance,
    recordMtmOffer,
    updateMtmOfferStatus,
    markOffersEffective
  }
}
