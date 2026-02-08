import type { Database } from '~/types/supabase'

export interface PricingBreakdown {
  unitId: string
  baseRent: number
  fixedAmenities: Array<{ id: string, name: string, amount: number }>
  marketRent: number
  tempAmenities: Array<{ id: string, name: string, amount: number }>
  offeredRent: number
  targetOfferedRent?: number
  gap: number
}

/**
 * Pricing Engine Utility
 * Handles calculation of market/offered rent and matching target rent with temporary amenities.
 */
export const usePricingEngine = () => {
  const supabase = useSupabaseClient<Database>()

  /**
   * Fetches the full pricing breakdown for a unit based on active amenities.
   */
  const getUnitPricingBreakdown = async (unitId: string): Promise<PricingBreakdown | null> => {
    console.log('[PRICING ENGINE] getUnitPricingBreakdown called for unit:', unitId)

    const { data: pricingData, error } = await supabase
      .from('view_unit_pricing_analysis')
      .select('*')
      .eq('unit_id', unitId)
      .single()

    if (error || !pricingData) return null

    // Fetch active amenity details
    console.log('[PRICING ENGINE] Fetching unit_amenities for unit:', unitId)
    const { data: activeLinks, error: amenitiesError } = await supabase
      .from('unit_amenities')
      .select('amenity_id, amenities(yardi_name, amount, type)')
      .eq('unit_id', unitId)
      .eq('active', true)

    if (amenitiesError) {
        console.error('[PRICING ENGINE] ERROR:', {
            message: amenitiesError.message,
            details: amenitiesError.details,
            hint: amenitiesError.hint,
            code: amenitiesError.code,
            full: amenitiesError
        })
    }
    console.log('[PRICING ENGINE] Query result:', { activeLinks, count: activeLinks?.length })

    const fixed: any[] = []
    const temp: any[] = []

    activeLinks?.forEach((l: any) => {
      const item = {
        id: l.amenity_id,
        name: l.amenities.yardi_name,
        amount: l.amenities.amount
      }
      // Case-insensitive comparison
      if (l.amenities.type?.toLowerCase() === 'fixed') {
        fixed.push(item)
      } else {
        temp.push(item)
      }
    })

    return {
      unitId,
      baseRent: pricingData.base_rent || 0,
      fixedAmenities: fixed,
      marketRent: pricingData.calculated_market_rent || 0,
      tempAmenities: temp,
      offeredRent: pricingData.calculated_offered_rent || 0,
      gap: 0
    }
  }

  /**
   * Calculates which combination of available temporary amenities matches the targetOfferedRent.
   *
   * Algorithm Priorities (2026-02-07 Update):
   * 1. HIGH PRIORITY: Reduce the gap (get closer to target)
   * 2. SECONDARY: Minimal amenities (among similar gaps, within $5)
   * 3. ALWAYS BEST: Exact match (delta = 0)
   *
   * Rules:
   * - Always suggest at least 1 amenity (never return 0 if gap exists)
   * - Reducing gap by 50% with 1 amenity > no change with 0 amenities
   * - Among solutions with similar gaps (within $5), prefer fewer amenities
   * - Stop at 4 amenities max (too many changes!)
   * - Don't use 7 amenities when 1 gets close enough
   *
   * Following the unique usage rule (can't use the same amenity ID twice).
   */
  const solveForTargetRent = async (unitId: string, propertyCode: string, targetOfferedRent: number) => {
    // 1. Get current market rent and currently applied amenities
    const breakdown = await getUnitPricingBreakdown(unitId)
    if (!breakdown) return null

    const targetGap = targetOfferedRent - breakdown.marketRent
    
    // 2. Fetch all available temporary amenities (premium/discount) for the property
    const { data: availableTemps } = await supabase
        .from('amenities')
        .select('*')
        .eq('property_code', propertyCode)
        .eq('active', true)
        .filter('type', 'in', '(premium,discount)') // Case-insensitive: only premium and discount

    if (!availableTemps || availableTemps.length === 0) {
        return { success: false, gap: targetGap, message: 'No temporary amenities available' }
    }

    // 3. Filter out amenities already applied to this unit (Unique usage rule)
    const appliedIds = new Set(breakdown.tempAmenities.map((a: { id: string }) => a.id))
    const eligibleTemps = availableTemps.filter((a: any) => !appliedIds.has(a.id))

    if (eligibleTemps.length === 0) {
        return { success: false, gap: targetGap, message: 'All available temporary amenities are already applied' }
    }

    // 4. Optimal search: Balance between reducing gap (HIGH priority) and minimal amenities
    // Strategy:
    // 1. NEVER suggest 0 amenities (always try to reduce the gap!)
    // 2. High priority: Reduce the gap as much as possible
    // 3. Secondary: Among similar gaps (within $5-10), prefer fewer amenities
    // 4. Sort by absolute value to try impactful changes first

    // Sort amenities by absolute value descending - try impactful changes first
    const sortedTemps = [...eligibleTemps].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))

    let bestCombination: any[] = []
    let bestDelta = Math.abs(targetGap) // Start with full gap (no amenities)
    let bestLength = 0

    // Helper: Compare two solutions with correct priority
    const isBetterSolution = (newDelta: number, newLength: number): boolean => {
        // Rule 1: Always prefer having at least one amenity over none (reduce the gap!)
        if (bestLength === 0 && newLength > 0) return true
        if (bestLength > 0 && newLength === 0) return false

        // Rule 2: Exact match (delta = 0) is always best
        if (newDelta === 0 && bestDelta !== 0) return true
        if (newDelta !== 0 && bestDelta === 0) return false

        // Rule 3: If gaps are similar (within $5), prefer fewer amenities
        const gapDiff = Math.abs(newDelta - bestDelta)
        if (gapDiff <= 5) {
            return newLength < bestLength
        }

        // Rule 4: Otherwise, prioritize smaller gap (reduce it more!)
        return newDelta < bestDelta
    }

    // Step 1: Check all single amenities (most convenient!)
    for (const amenity of sortedTemps) {
        const sum = amenity.amount
        const delta = Math.abs(targetGap - sum)

        if (isBetterSolution(delta, 1)) {
            bestDelta = delta
            bestCombination = [amenity]
            bestLength = 1
        }

        // Perfect single-amenity match! Stop immediately
        if (delta === 0) {
            console.log('[SOLVER] Perfect single-amenity match found:', amenity.yardi_name, amenity.amount)
            return {
                success: true,
                solution: bestCombination,
                remainingGap: 0,
                marketRent: breakdown.marketRent,
                targetOfferedRent
            }
        }
    }

    console.log('[SOLVER] Best single amenity:', bestCombination.length, 'items, delta:', bestDelta)

    // Step 2: Try combinations to see if we can get closer
    // Only search if: (a) no exact single match, AND (b) gap is still significant (>$10)
    const shouldSearchCombinations = bestDelta > 0 && bestDelta > 10

    if (shouldSearchCombinations) {
        console.log('[SOLVER] Searching combinations to reduce gap from', bestDelta)

        const findCombination = (index: number, currentSum: number, currentCombination: any[]) => {
            const delta = Math.abs(targetGap - currentSum)
            const currentLength = currentCombination.length

            // Check if this combination is better
            if (isBetterSolution(delta, currentLength)) {
                bestDelta = delta
                bestCombination = [...currentCombination]
                bestLength = currentLength
            }

            // Early termination: Found exact match
            if (delta === 0) {
                console.log('[SOLVER] Exact match found with', currentLength, 'amenities')
                return
            }

            // Pruning: Don't go beyond 4 amenities (too many changes!)
            if (currentLength >= 4) return

            // Pruning: If we're not making good progress, stop
            // Current combination should reduce gap by at least 25% compared to no amenities
            const noAmenitiesGap = Math.abs(targetGap)
            const gapReduction = (noAmenitiesGap - delta) / noAmenitiesGap
            if (gapReduction < 0.25 && currentLength >= 2) return

            // Try adding more amenities
            for (let i = index; i < sortedTemps.length; i++) {
                findCombination(
                    i + 1,
                    currentSum + sortedTemps[i].amount,
                    [...currentCombination, sortedTemps[i]]
                )

                // Early termination if we found perfect match
                if (bestDelta === 0) return
            }
        }

        findCombination(0, 0, [])
    }

    console.log('[SOLVER] Best solution:', bestCombination.length, 'amenities, delta:', bestDelta)

    const finalSum = bestCombination.reduce((acc, a) => acc + a.amount, 0)
    const finalGap = targetGap - finalSum

    console.log('[SOLVER] Final solution:', {
        amenityCount: bestCombination.length,
        amenities: bestCombination.map(a => `${a.yardi_name} (${a.amount})`),
        targetGap,
        achievedSum: finalSum,
        remainingGap: finalGap,
        success: Math.abs(finalGap) < 0.01
    })

    return {
        success: Math.abs(finalGap) < 0.01,
        solution: bestCombination,
        remainingGap: finalGap,
        marketRent: breakdown.marketRent,
        targetOfferedRent
    }
  }

  return {
    getUnitPricingBreakdown,
    solveForTargetRent
  }
}
