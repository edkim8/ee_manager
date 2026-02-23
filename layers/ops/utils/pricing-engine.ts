import type { Database } from '~/types/supabase'
import { solveRentCombination } from './solveRentCombination'

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

    const { data: pricingData, error } = await supabase
      .from('view_unit_pricing_analysis')
      .select('*')
      .eq('unit_id', unitId)
      .single()

    if (error || !pricingData) return null

    // Fetch active amenity details
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

    // 4. Optimal search: delegate to pure solver
    const { combination, remainingGap: finalGap } = solveRentCombination(targetGap, eligibleTemps as any)

    return {
        success: Math.abs(finalGap) < 0.01,
        solution: combination,
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
