/**
 * Renewals Worksheet Composable
 *
 * Business logic for managing renewal worksheets:
 * - Rent calculations (LTL %, Max %, Manual)
 * - MTM fee application
 * - Approval workflows
 * - Manual vs Yardi-confirmed status tracking
 * - Dirty state management
 */

import { ref, computed, watch, type Ref } from 'vue'
import { useSupabaseClient, useAsyncData } from '#imports'
import type { Database } from '~/types/supabase'

type RenewalWorksheetItem = Database['public']['Tables']['renewal_worksheet_items']['Row']
type RentOfferSource = Database['public']['Enums']['rent_offer_source']

export interface RenewalItemUI {
  id: string
  worksheet_id: string
  unit_id: string
  unit_name: string | null
  resident_name: string | null
  current_rent: number
  market_rent: number | null
  renewal_type: 'standard' | 'mtm'
  status: string
  lease_to_date: string | null
  
  // Offer fields
  rent_offer_source: 'ltl_percent' | 'max_percent' | 'manual' | null
  custom_rent: number | null
  final_rent: number | null
  
  // Workflow fields
  approved: boolean
  yardi_confirmed: boolean
  yardi_confirmed_date: string | null
  manual_status: string | null
  manual_status_date: string | null
  accepted_term_length: number | null
  comment: string | null
  approver_comment: string | null
  active: boolean
  yardi_lease_id?: string | null

  // Joins
  units?: {
    unit_name: string
    floor_plan_id: string
  }

  // Computed display fields
  rent_increase?: number
  rent_increase_percent?: number
  ltl_gap?: number
  ltl_rent?: number // Calculated LTL rent for display in column
  max_rent?: number // Calculated Max % rent for display in column
  is_manual_pending?: boolean // Manually accepted/declined but not Yardi confirmed
  is_capped_by_max?: boolean // LTL increase was limited by max_percent cap
}

/**
 * Main composable for renewals worksheet management
 * Refactored to use "Separate Input/Output Refs" pattern to avoid infinite loops.
 */
export function useRenewalsWorksheet(
  sourceItems: Ref<RenewalItemUI[] | null>, // INPUT (Read-Only)
  ltl_percent: Ref<number>,
  max_rent_increase_percent: Ref<number>,
  mtm_fee: Ref<number>
) {
  const isDirty = ref(false)
  const selectedFloorPlanId = ref<string | null>(null)
  
  // OUTPUT Refs (Mutable, used by UI)
  const standardRenewals = ref<RenewalItemUI[]>([])
  const mtmRenewals = ref<RenewalItemUI[]>([])

  // Track original state for dirty detection using the OUTPUT refs
  // We'll capture this right after initialization/recalculation
  const originalState = ref<string>('')

  /**
   * Calculate final rent based on rent_offer_source
   */
  function calculateFinalRent(
    item: RenewalItemUI,
    source: RentOfferSource,
    customRent?: number
  ): number {
    const currentRent = item.current_rent
    const marketRent = item.market_rent || currentRent
    const ltlPercent = ltl_percent.value
    const maxPercent = max_rent_increase_percent.value

    switch (source) {
      case 'ltl_percent': {
        // LTL: Close X% of gap between current and market
        if (marketRent > currentRent) {
          const gap = marketRent - currentRent
          const increase = gap * (ltlPercent / 100)
          const ltlRent = currentRent + increase

          // Apply max cap
          const maxRent = currentRent * (1 + maxPercent / 100)
          return Math.round(Math.min(ltlRent, maxRent))
        }
        return Math.round(currentRent)
      }

      case 'max_percent': {
        // Max % cap
        return Math.round(currentRent * (1 + maxPercent / 100))
      }

      case 'manual': {
        // Custom rent increase (not final rent)
        const increase = customRent !== undefined ? customRent : (item.custom_rent || 0)
        return Math.round(currentRent + increase)
      }

      default:
        return Math.round(currentRent)
    }
  }

  /**
   * Helper: Calculate all display fields for an item
   * Does NOT modify original item, returns NEW object.
   */
  function calculateItemFields(item: RenewalItemUI): RenewalItemUI {
    const currentRent = item.current_rent
    const marketRent = item.market_rent || currentRent
    const ltlPercent = ltl_percent.value
    const maxPercent = max_rent_increase_percent.value

    // Calculate UNCAPPED LTL% column value
    let ltl_rent: number
    if (marketRent > currentRent) {
      const gap = marketRent - currentRent
      const ltlIncrease = gap * (ltlPercent / 100)
      ltl_rent = Math.round(currentRent + ltlIncrease) 
    } else {
      ltl_rent = Math.round(currentRent)
    }

    // Calculate Max% column value
    const max_rent = Math.round(currentRent * (1 + maxPercent / 100))

    // Recalculate final rent based on selected source
    // Use existing values if set, otherwise default logic
    const final_rent = calculateFinalRent(item, item.rent_offer_source || 'ltl_percent')

    // Always check if final rent equals max %
    const is_capped_by_max = final_rent >= max_rent

    const rent_increase = final_rent - currentRent
    const rent_increase_percent = currentRent > 0 ? (rent_increase / currentRent) * 100 : 0
    const ltl_gap = marketRent - currentRent
    
    const is_manual_pending =
        (item.status === 'manually_accepted' || item.status === 'manually_declined') &&
        !item.yardi_confirmed

    // Flatten unit_name for sorting/display transparency
    const unit_name = (item as any).units?.unit_name || item.unit_name || ''

    return {
      ...item,
      unit_name, // Ensure top-level property is populated for sorting
      ltl_rent,
      max_rent,
      final_rent,
      rent_increase,
      rent_increase_percent,
      is_capped_by_max,
      ltl_gap,
      is_manual_pending
    }
  }

  // --- MAIN RECALCULATION LOGIC ---
  
  function reprocessAndSplitData() {
    if (!sourceItems.value || sourceItems.value.length === 0) {
      standardRenewals.value = []
      mtmRenewals.value = []
      return
    }

    // Map source items through calculation logic
    // This creates NEW objects for the output refs
    const calculatedItems = sourceItems.value.map(item => calculateItemFields(item))

    // Split into Standard vs MTM
    standardRenewals.value = calculatedItems.filter(i => i.renewal_type === 'standard')
    mtmRenewals.value = calculatedItems.filter(i => i.renewal_type === 'mtm')
    
    // Capture state logic could go here, but usually we just want to execute.
  }

  // Watch INPUT + Config -> Update OUTPUT
  watch(
    [sourceItems, ltl_percent, max_rent_increase_percent, mtm_fee],
    () => {
      reprocessAndSplitData()
    },
    { deep: true, immediate: true }
  )


  // --- MUTATION HELPERS (Modify OUTPUT refs) ---

  const updateItemInList = (list: Ref<RenewalItemUI[]>, itemId: string, updates: Partial<RenewalItemUI>) => {
    // We use map to create a new array for Vue reactivity
    const index = list.value.findIndex(i => i.id === itemId)
    if (index === -1) return false

    // Setup the updated item base
    const currentItem = list.value[index]
    const mergedItem = { ...currentItem, ...updates }
    
    // Recalculate fields based on the updates
    const recalculatedItem = calculateItemFields(mergedItem)

    // Update the list
    const newList = [...list.value]
    newList[index] = recalculatedItem
    list.value = newList
    
    isDirty.value = true
    return true
  }

  function updateItem(itemId: string, updates: Partial<RenewalItemUI>) {
    // Try standard list first
    if (!updateItemInList(standardRenewals, itemId, updates)) {
      // Try mtm list
      updateItemInList(mtmRenewals, itemId, updates)
    }
  }

  /**
   * Update rent offer source
   */
  function updateRentSource(itemId: string, source: RentOfferSource, customRent?: number) {
    updateItem(itemId, { 
        rent_offer_source: source,
        custom_rent: source === 'manual' && customRent !== undefined ? customRent : undefined // Keep existing if undefined
    })
  }

  /**
   * Update custom rent for manual mode
   */
  function updateCustomRent(itemId: string, customIncrease: number) {
     updateItem(itemId, {
         custom_rent: customIncrease,
         rent_offer_source: 'manual'
     })
  }

  /**
   * Update market rent
   */
  function updateMarketRent(itemId: string, marketRent: number) {
    updateItem(itemId, { market_rent: marketRent })
  }

  /**
   * Toggle approval
   */
  function toggleApproval(itemId: string) {
    // Find item to get current state
    const item = [...standardRenewals.value, ...mtmRenewals.value].find(i => i.id === itemId)
    if (item) {
        updateItem(itemId, { approved: !item.approved })
    }
  }

  /**
   * Set all approvals
   */
  function setAllApprovals(approved: boolean) {
    const updateList = (list: Ref<RenewalItemUI[]>) => {
        list.value = list.value.map(item => ({...item, approved}))
    }
    updateList(standardRenewals)
    updateList(mtmRenewals)
    isDirty.value = true
  }

  /**
   * Update manual status
   */
  function updateManualStatus(itemId: string, status: 'accepted' | 'declined' | null) {
    const updates: Partial<RenewalItemUI> = {
        manual_status: status,
        manual_status_date: status ? new Date().toISOString().split('T')[0] : null
    }
    
    if (status === 'accepted') {
        updates.status = 'manually_accepted'
    } else if (status === 'declined') {
        updates.status = 'manually_declined'
    }

    updateItem(itemId, updates)
  }

  /**
   * Confirm Yardi status
   */
  function confirmYardiStatus(itemId: string, leaseId: string) {
     const item = [...standardRenewals.value, ...mtmRenewals.value].find(i => i.id === itemId)
     if (!item) return

      const updates: Partial<RenewalItemUI> = {
        yardi_confirmed: true,
        yardi_confirmed_date: new Date().toISOString().split('T')[0],
        yardi_lease_id: leaseId
      }

      if (item.status === 'manually_accepted') {
         updates.status = 'accepted'
      } else if (item.status === 'manually_declined') {
         updates.status = 'declined'
      }
      
      updateItem(itemId, updates)
  }

  /**
   * Update comments
   */
  function updateComment(itemId: string, comment: string, approverComment?: string) {
      updateItem(itemId, {
          comment,
          approver_comment: approverComment
      })
  }
  
  // --- COMPUTED HELPERS ---

  /**
   * Combined summary statistics
   */
  const summary = computed(() => {
    const all = [...standardRenewals.value, ...mtmRenewals.value]
    const active = all.filter(i => i.active)

    return {
      total: active.length,
      standard: standardRenewals.value.filter(i => i.active).length,
      mtm: mtmRenewals.value.filter(i => i.active).length,
      // Status counts
      pending: active.filter(i => i.status === 'pending').length,
      offered: active.filter(i => i.status === 'offered').length,
      manually_accepted: active.filter(i => i.status === 'manually_accepted').length,
      manually_declined: active.filter(i => i.status === 'manually_declined').length,
      accepted: active.filter(i => i.status === 'accepted').length,
      declined: active.filter(i => i.status === 'declined').length,
      expired: active.filter(i => i.status === 'expired').length,
      // Yardi confirmation
      yardi_confirmed: active.filter(i => i.yardi_confirmed).length,
      manual_pending: active.filter(i => i.is_manual_pending).length,
      // Approval
      approved: active.filter(i => i.approved).length,
      // Financial
      total_current_rent: active.reduce((sum, i) => sum + (i.current_rent || 0), 0),
      total_offered_rent: active.reduce((sum, i) => sum + (i.final_rent || 0), 0),
      total_increase: active.reduce((sum, i) => sum + ((i.final_rent || 0) - (i.current_rent || 0)), 0),
    }
  })

  const allApproved = computed(() => {
    const all = [...standardRenewals.value, ...mtmRenewals.value]
    const active = all.filter(i => i.active)
    return active.length > 0 && active.every(i => i.approved)
  })

  function resetDirty() {
    isDirty.value = false
  }

  function initialize() {
    reprocessAndSplitData()
  }

  // Calculate MTM Rent helper (UI might use it)
  function calculateMtmRent(item: RenewalItemUI): number {
      const marketRent = item.market_rent || item.current_rent
      return Math.round(marketRent + mtm_fee.value)
  }

  // Helper for filtered view support
  const filteredItems = computed(() => {
    // Basic implementation that respects the filter state (if we move filter state here)
    // For now, since selectedFloorPlanId is local ref here but used by page... 
    // Wait, the page has `const selectedFloorPlanId = ref<string | null>(null)`.
    // And this composable has `const selectedFloorPlanId = ref<string | null>(null)`.
    // They are disconnected! 
    // The page uses `displayedItems` computed which filters based on `selectedFloorPlanId` defined IN THE PAGE.
    // The previous composable had `filteredItems` computed but it wasn't really used by the page's main table, 
    // or if it was, it was via `standardRenewals` which was computed from `filteredItems`.
    // In my new implementation, `standardRenewals` contains ALL standard items.
    // The page will handle filtering.
    // So I can just return empty filteredItems or mock it if needed for compatibility.
    // Actually, `[id].vue` uses `standardRenewals` (from composable) and filters it in `displayedItems`.
    // So we don't need `filteredItems` in the composable necessarily, unless the page logic relies on it.
    // Looking at `[id].vue`: `const displayedItems = computed(() => { const source = activeTab.value ... })`
    // It filters `standardRenewals.value`.
    // So we just need to provide `standardRenewals` containing ALL items.
    return []
  })

  return {
    isDirty,
    selectedFloorPlanId,
    standardRenewals, 
    mtmRenewals,      
    filteredItems,
    summary,
    allApproved,
    
    updateRentSource,
    updateCustomRent,
    updateMarketRent,
    toggleApproval,
    setAllApprovals,
    updateManualStatus,
    confirmYardiStatus,
    updateComment,
    
    resetDirty,
    initialize,
    calculateFinalRent,
    calculateMtmRent
  }
}

/**
 * Composable for floor plan analytics
 * Used in the detail page sidebar
 */
export function useFloorPlanAnalytics(propertyCode: Ref<string | null>) {
  const supabase = useSupabaseClient()

  const { data: analytics, pending, error, refresh } = useAsyncData(
    `floor-plan-analytics-${propertyCode.value}`,
    async () => {
      if (!propertyCode.value) return []

      // Parallel fetch: Analytics + Floor Plan Details (for SF sort)
      const [analyticsResult, floorPlansResult] = await Promise.all([
        supabase
          .from('view_renewal_pipeline_summary')
          .select('*')
          .eq('property_code', propertyCode.value),
        
        supabase
          .from('floor_plans')
          .select('id, area_sqft, code')
          .eq('property_code', propertyCode.value)
      ])

      if (analyticsResult.error) {
        console.error('[Renewals] Floor plan analytics error:', analyticsResult.error)
        throw analyticsResult.error
      }
      
      if (floorPlansResult.error) {
         console.warn('[Renewals] Could not fetch floor plan details:', floorPlansResult.error)
         // Fallback: return analytics sorted by name if fetch fails
         return (analyticsResult.data || []).sort((a: any, b: any) => 
           (a.floor_plan_name || '').localeCompare(b.floor_plan_name || '')
         )
      }

      const analyticsData = analyticsResult.data || []
      const floorPlansData = floorPlansResult.data || []

      // Create Map for Code and SF
      const fpDetailsMap = new Map<string, { sf: number, code: string }>()
      floorPlansData.forEach((fp: any) => {
        if (fp.id) fpDetailsMap.set(fp.id, { sf: fp.area_sqft || 0, code: fp.code || '' })
      })

      // Attach SF, Code and Sort
      const sortedAnalytics = analyticsData.map((item: any) => {
        const details = item.floor_plan_id ? fpDetailsMap.get(item.floor_plan_id) : null
        return {
            ...item,
            area_sqft: details?.sf || 0,
            floor_plan_code: details?.code || item.floor_plan_name // Fallback to name if code missing
        }
      }).sort((a: any, b: any) => {
        const sfA = a.area_sqft || 0
        const sfB = b.area_sqft || 0
        
        // Sort by SF Ascending (Smallest to Largest)
        if (sfA !== sfB) return sfA - sfB
        
        // Fallback to name
        return (a.floor_plan_name || '').localeCompare(b.floor_plan_name || '')
      })

      console.log('[Renewals] Floor Plan Analytics Sorted by SF:', sortedAnalytics.map((a: any) => ({ name: a.floor_plan_name, sf: a.area_sqft })))

      return sortedAnalytics
    },
    {
      watch: [propertyCode],
      server: false,
    }
  )

  return {
    analytics,
    pending,
    error,
    refresh,
  }
}
