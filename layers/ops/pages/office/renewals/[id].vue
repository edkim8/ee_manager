<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { usePropertyState, useSupabaseClient, useAsyncData, definePageMeta, navigateTo } from '#imports'
import { useRenewalsWorksheet, useFloorPlanAnalytics } from '../../../composables/useRenewalsWorksheet'
import { useRenewalsMailMerger } from '../../../composables/useRenewalsMailMerger'
import { useTableSelection } from '../../../../table/composables/useTableSelection'
import SimpleTabs from '../../../../base/components/SimpleTabs.vue'
import SimpleModal from '../../../../base/components/SimpleModal.vue'
import GenericDataTable from '../../../../table/components/GenericDataTable.vue'
import BadgeCell from '../../../../table/components/cells/BadgeCell.vue'
import UpdateStatusModal from '../../../components/renewals/UpdateStatusModal.vue'
// ===== EXCEL-BASED TABLE CONFIGURATION =====
import { allColumns as standardColumnsGenerated } from '../../../../../configs/table-configs/renewal_items_standard-complete.generated'
import { allColumns as mtmColumnsGenerated } from '../../../../../configs/table-configs/renewal_items_mtm-complete.generated'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const { activeProperty } = usePropertyState()

const worksheetId = route.params.id as string
const isNewWorksheet = computed(() => worksheetId === 'new')

// CA Property Check: CV, WO, OB use MTM Max % instead of MTM Fee ($)
const CA_PROPERTIES = ['CV', 'WO', 'OB'] as const
const isCAProperty = computed(() => {
  return CA_PROPERTIES.includes(activeProperty.value?.toUpperCase() as any)
})

// State
const selectedFloorPlanId = ref<string | null>(null)
const activeTab = ref<'standard' | 'mtm'>('standard')
const showSaveAsModal = ref(false)
const saveAsName = ref('')
const isSaving = ref(false)

// Comment modal state
const showCommentModal = ref(false)
const commentItem = ref<any>(null)
const commentText = ref('')

// Finalize modal state
const showFinalizeModal = ref(false)
const isFinalizing = ref(false)

// Term configuration modal state
const showTermConfigModal = ref(false)
const termConfig = ref({
  primary_term: 12,
  first_term: null as number | null,
  first_term_offset: null as number | null,
  second_term: null as number | null,
  second_term_offset: null as number | null,
  third_term: null as number | null,
  third_term_offset: null as number | null,
  early_discount: null as number | null,
  early_discount_date: null as string | null,
  term_goals: {} as Record<string, number>
})

// Back navigation warning modal state
const showBackWarningModal = ref(false)

// Manual accept term selection modal state
const showManualAcceptModal = ref(false)
const manualAcceptItem = ref<any>(null)
const selectedAcceptTerm = ref<number | null>(null)

// Update Status modal state
const showUpdateStatusModal = ref(false)

// Fetch worksheet data
const { data: worksheet, pending: worksheetPending, refresh: refreshWorksheet } = await useAsyncData(
  () => `worksheet-${worksheetId}`,
  async () => {
    if (isNewWorksheet.value) return null

    const { data, error } = await supabase
      .from('renewal_worksheets')
      .select('*')
      .eq('id', worksheetId)
      .single()

    if (error) {
      console.error('[Renewals] Worksheet fetch error:', error)
      throw error
    }

    return data
  },
  {
    server: false
  }
)

// Fetch worksheet items with unit/floor plan info
const { data: items, pending: itemsPending, refresh: refreshItems } = await useAsyncData(
  () => `worksheet-items-${worksheetId}`,
  async () => {
    if (isNewWorksheet.value) return []

    const { data, error } = await supabase
      .from('renewal_worksheet_items')
      .select(`
        *,
        units:unit_id (
          id,
          unit_name,
          floor_plan_id,
          floor_plans:floor_plan_id (
            id,
            marketing_name
          )
        )
      `)
      .eq('worksheet_id', worksheetId)
      .eq('active', true)
      .order('lease_to_date')

    if (error) {
      console.error('[Renewals] Items fetch error:', error)
      throw error
    }

    return data || []
  },
  {
    server: false
  }
)

// Config state - stored in component memory (NOT in worksheet database)
// These will be loaded from DB when worksheet loads, but live in memory until saved
const ltl_percent = ref(25)
const max_rent_increase_percent = ref(5)
const mtm_fee = ref(300)

// Track original values for dirty detection
const originalConfig = ref<{ltl_percent: number; max_rent_increase_percent: number; mtm_fee: number} | null>(null)
const configChanged = ref(false)
const configInitialized = ref(false)  // Flag to track if we've loaded from DB

// --- Draft Config Persistence (localStorage) ---
const draftStorageKey = `renewal-draft-${worksheetId}`

function saveDraftToLocalStorage() {
  if (process.client && configInitialized.value) {
    localStorage.setItem(draftStorageKey, JSON.stringify({
      ltl_percent: ltl_percent.value,
      max_rent_increase_percent: max_rent_increase_percent.value,
      mtm_fee: mtm_fee.value
    }))
  }
}

function loadDraftFromLocalStorage() {
  try {
    if (process.client) {
      const saved = localStorage.getItem(draftStorageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        return parsed
      }
    }
  } catch (e) {
    console.warn('[Renewals] Failed to load draft config:', e)
  }
  return null
}

function clearDraftFromLocalStorage() {
  if (process.client) {
    localStorage.removeItem(draftStorageKey)
  }
}

// Load config from worksheet ONLY ONCE on initial mount
// After that, values live in memory until saved or page reload
watch(worksheet, (newWorksheet) => {
  if (newWorksheet && !configInitialized.value) {
    // 1. Check for draft in localStorage first
    const draft = loadDraftFromLocalStorage()
    
    // 2. Load values (Draft takes precedence over DB)
    if (draft && draft.ltl_percent !== undefined) {
      ltl_percent.value = draft.ltl_percent
      console.log('[Renewals] Loaded ltl_percent from DRAFT', ltl_percent.value)
    } else if (newWorksheet.ltl_percent !== null && newWorksheet.ltl_percent !== undefined) {
      ltl_percent.value = newWorksheet.ltl_percent
    } else {
      ltl_percent.value = 25
    }

    if (draft && draft.max_rent_increase_percent !== undefined) {
      max_rent_increase_percent.value = draft.max_rent_increase_percent
      console.log('[Renewals] Loaded max_rent_percent from DRAFT', max_rent_increase_percent.value)
    } else if (newWorksheet.max_rent_increase_percent !== null && newWorksheet.max_rent_increase_percent !== undefined) {
      max_rent_increase_percent.value = newWorksheet.max_rent_increase_percent
    } else {
      max_rent_increase_percent.value = 5
    }

    if (draft && draft.mtm_fee !== undefined) {
      mtm_fee.value = draft.mtm_fee
      console.log('[Renewals] Loaded mtm_fee from DRAFT', mtm_fee.value)
    } else if (newWorksheet.mtm_fee !== null && newWorksheet.mtm_fee !== undefined) {
      mtm_fee.value = newWorksheet.mtm_fee
    } else {
      mtm_fee.value = 300
    }

    // Save original values for dirty detection
    originalConfig.value = {
      ltl_percent: ltl_percent.value,
      max_rent_increase_percent: max_rent_increase_percent.value,
      mtm_fee: mtm_fee.value
    }

    configInitialized.value = true  // Mark as initialized
  }
}, { immediate: true })

// Auto-save draft to localStorage when changed
watch([ltl_percent, max_rent_increase_percent, mtm_fee], () => {
  if (configInitialized.value) {
    saveDraftToLocalStorage()
  }
}, { deep: true })

// Initialize composable with separate config refs
const renewalsComposable = useRenewalsWorksheet(
  items as any,
  ltl_percent,
  max_rent_increase_percent,
  mtm_fee
)

const {
  isDirty,
  standardRenewals,
  mtmRenewals,
  summary,
  allApproved,
  updateRentSource,
  updateCustomRent,
  updateMarketRent,
  toggleApproval,
  setAllApprovals,
  updateManualStatus,
  updateComment,
  resetDirty,
  initialize
} = renewalsComposable

// Initialize display fields when items are loaded from server
// This prevents infinite loop - we don't watch items inside the composable
// Initialize display fields - HANDLED BY COMPOSABLE WATCHER NOW
// We do NOT watch items here to avoid infinite loops
// The composable watches sourceItems and updates standardRenewals/mtmRenewals automatically

// DISABLED: Auto-save watcher was causing infinite loops
// Config will be saved when worksheet is saved manually
// watch(
//   [ltl_percent, max_rent_increase_percent, mtm_fee],
//   async () => {
//     ...
//   }
// )

// Mail Merger export
const { exportMailMerger, loading: exportingMailMerger } = useRenewalsMailMerger()

// Floor plan analytics
const { analytics: floorPlanAnalytics } = useFloorPlanAnalytics(activeProperty as any)

// Calculate floor plan counts from current worksheet items (standard/MTM)
const floorPlanCounts = computed(() => {
  const counts: Record<string, { standard: number; mtm: number }> = {}

  items.value?.forEach((item: any) => {
    const fpId = item.units?.floor_plan_id
    if (fpId) {
      if (!counts[fpId]) {
        counts[fpId] = { standard: 0, mtm: 0 }
      }

      if (item.renewal_type === 'mtm') {
        counts[fpId].mtm++
      } else {
        counts[fpId].standard++
      }
    }
  })

  return counts
})

// Filter items by selected floor plan
const displayedItems = computed(() => {
  const source = activeTab.value === 'standard' ? standardRenewals.value : mtmRenewals.value

  let filtered = source
  if (selectedFloorPlanId.value) {
    filtered = source.filter((item: any) => {
      const floorPlanId = item.units?.floor_plan_id
      return floorPlanId === selectedFloorPlanId.value
    })
  }

  // Sort by lease_to_date (primary), then unit_name (secondary)
  return [...filtered].sort((a: any, b: any) => {
    // Primary sort: lease_to_date
    const dateA = new Date(a.lease_to_date).getTime()
    const dateB = new Date(b.lease_to_date).getTime()
    if (dateA !== dateB) {
      return dateA - dateB
    }

    // Secondary sort: unit_name
    const unitA = a.units?.unit_name || ''
    const unitB = b.units?.unit_name || ''
    return unitA.localeCompare(unitB)
  })
})

// Table selection for batch operations
const { selectedRows, selectedCount, isSelected, toggleRow, selectAll, clearSelection, allSelected, someSelected, toggleSelectAll } = useTableSelection(
  displayedItems,
  'id'
)

// Table columns from Excel configurations
const standardColumns = computed(() => standardColumnsGenerated)
const mtmColumns = computed(() => mtmColumnsGenerated)

// Format helpers (timezone-safe)
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return ''
  // Append T00:00:00 to prevent timezone shift
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

// Calculate LTL rent (Lease-to-List: closes X% of gap to market)
const calculateLtlRent = (item: any) => {
  if (!worksheet.value || !item.market_rent) return item.current_rent

  const currentRent = item.current_rent || 0
  const marketRent = item.market_rent || 0
  const ltlPercent = worksheet.value.ltl_percent || 25
  const maxPercent = worksheet.value.max_rent_increase_percent || 5

  if (marketRent <= currentRent) return currentRent

  // LTL formula: current + (gap * ltl_percent / 100)
  const gap = marketRent - currentRent
  const ltlRent = currentRent + (gap * (ltlPercent / 100))

  // Apply max cap
  const maxRent = currentRent * (1 + maxPercent / 100)
  return Math.round(Math.min(ltlRent, maxRent))
}

// Calculate Max rent (simple percentage increase)
const calculateMaxRent = (item: any) => {
  if (!worksheet.value) return item.current_rent

  const currentRent = item.current_rent || 0
  const maxPercent = worksheet.value.max_rent_increase_percent || 5

  return Math.round(currentRent * (1 + maxPercent / 100))
}

// Handle clicking a rent option cell
const handleRentOptionClick = async (item: any, source: 'ltl_percent' | 'max_percent' | 'manual') => {
  console.log('[Renewals] Rent option clicked:', { itemId: item.id, source, currentSource: item.rent_offer_source })

  if (source === 'manual') {
    // Initialize custom_rent to current increase amount if not set
    if (item.custom_rent === undefined || item.custom_rent === null) {
      // Default to current increase (final_rent - current_rent) or 0
      item.custom_rent = (item.final_rent || item.current_rent) - item.current_rent
    }
  }

  // Update rent source via composable (modifies standardRenewals/mtmRenewals)
  updateRentSource(item.id, source)

  // Get the updated item from the COMPOSABLE OUTPUT refs (NOT source items)
  // We need to look in both lists to find where it lives
  const allItems = [...standardRenewals.value, ...mtmRenewals.value]
  const updatedItem = allItems.find(i => i.id === item.id)
  
  if (!updatedItem) return

  console.log('[Renewals] After update:', { itemId: item.id, newSource: updatedItem.rent_offer_source })

  // Auto-save the change to database using updated values
  try {
    const { error } = await supabase
      .from('renewal_worksheet_items')
      .update({
        rent_offer_source: updatedItem.rent_offer_source,
        custom_rent: updatedItem.custom_rent,
        final_rent: updatedItem.final_rent,
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id)

    if (error) {
      console.error('[Renewals] Auto-save rent source error:', error)
    } else {
      console.log('[Renewals] Rent source auto-saved successfully')
    }
  } catch (e) {
    console.error('[Renewals] Auto-save exception:', e)
  }
}

// Check if a rent option is selected
const isRentOptionSelected = (item: any, source: 'ltl_percent' | 'max_percent' | 'manual') => {
  return item.rent_offer_source === source
}

// Save worksheet
async function handleSave(newName?: string) {
  if (!worksheet.value) {
    console.error('[Renewals] Cannot save: worksheet is null')
    return
  }

  isSaving.value = true

  try {
    // Update worksheet settings (save config from memory refs)
    const { error: worksheetError } = await supabase
      .from('renewal_worksheets')
      .update({
        name: newName || worksheet.value.name,
        ltl_percent: ltl_percent.value,
        max_rent_increase_percent: max_rent_increase_percent.value,
        mtm_fee: mtm_fee.value,
        updated_at: new Date().toISOString()
      })
      .eq('id', worksheetId)

    if (worksheetError) throw worksheetError

    // Update all items - GATHER FROM COMPOSABLE OUTPUT REFS
    // We must act on standardRenewals/mtmRenewals because that's where user changes live
    const allItems = [...standardRenewals.value, ...mtmRenewals.value]
    
    const itemsToUpdate = allItems.map((item: any) => ({
      id: item.id,
      rent_offer_source: item.rent_offer_source,
      custom_rent: item.custom_rent,
      market_rent: item.market_rent,
      final_rent: item.final_rent,
      approved: item.approved,
      manual_status: item.manual_status,
      status: item.status,
      comment: item.comment,
      approver_comment: item.approver_comment
    }))

    for (const item of itemsToUpdate) {
      const { error } = await supabase
        .from('renewal_worksheet_items')
        .update(item)
        .eq('id', item.id)

      if (error) {
        console.error('[Renewals] Item update error:', error)
      }
    }

    resetDirty()
    clearDraftFromLocalStorage() // Clear draft after successful save
    await refreshWorksheet()
    
    // We do NOT refresh items here if we want to preserve local state quirks, 
    // but typically after a full save we SHOULD sync with server.
    // However, refreshing source items will trigger composable watcher and reset output refs.
    // Since we just saved everything to DB, the new source items from DB should match our output refs.
    // So it is safe to refresh here.
    await refreshItems()

    // Reset config changed tracking after successful save
    originalConfig.value = {
      ltl_percent: ltl_percent.value,
      max_rent_increase_percent: max_rent_increase_percent.value,
      mtm_fee: mtm_fee.value
    }
    configChanged.value = false
  } catch (error) {
    console.error('[Renewals] Save error:', error)
  } finally {
    isSaving.value = false
  }
}

// Save As
function openSaveAsModal() {
  if (!worksheet.value) return
  saveAsName.value = `${worksheet.value.name} - Copy`
  showSaveAsModal.value = true
}

async function handleSaveAs() {
  await handleSave(saveAsName.value)
  showSaveAsModal.value = false
}

// Back navigation with dirty state check
function handleBackNavigation() {
  if (isDirty.value || configChanged.value) {
    showBackWarningModal.value = true
  } else {
    navigateTo('/office/renewals')
  }
}

function confirmBackNavigation() {
  showBackWarningModal.value = false
  navigateTo('/office/renewals')
}

// Manual accept with term selection
function openManualAcceptModal(item: any) {
  manualAcceptItem.value = item
  selectedAcceptTerm.value = worksheet.value?.primary_term || 12
  showManualAcceptModal.value = true
}

async function handleManualAccept() {
  if (!manualAcceptItem.value || !selectedAcceptTerm.value) return

  try {
    // Update status to manually accepted with term
    const { error } = await supabase
      .from('renewal_worksheet_items')
      .update({
        manual_status: 'accepted',
        status: 'manually_accepted',
        manual_status_date: new Date().toISOString().split('T')[0],
        accepted_term_length: selectedAcceptTerm.value,
        updated_at: new Date().toISOString()
      })
      .eq('id', manualAcceptItem.value.id)

    if (error) {
      console.error('[Renewals] Manual accept error:', error)
      return
    }

    // Update LOCAL state via composable - DO NOT REFRESH FROM SERVER (avoids resetting other changes)
    updateManualStatus(manualAcceptItem.value.id, 'accepted')

    // Close modal
    showManualAcceptModal.value = false
    manualAcceptItem.value = null
    selectedAcceptTerm.value = null
  } catch (error) {
    console.error('[Renewals] Manual accept exception:', error)
  }
}

// Manual Decline - Wrapper to persist changes to database
async function handleManualDecline(itemId: string) {
  try {
    const { error } = await supabase
      .from('renewal_worksheet_items')
      .update({
        manual_status: 'declined',
        status: 'manually_declined',
        manual_status_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)

    if (error) {
      console.error('[Renewals] Manual decline error:', error)
      return
    }

    // Update LOCAL state via composable - DO NOT REFRESH FROM SERVER
    updateManualStatus(itemId, 'declined')
  } catch (error) {
    console.error('[Renewals] Manual decline exception:', error)
  }
}

// Get available terms from worksheet configuration
const availableTerms = computed(() => {
  if (!worksheet.value) return []

  const terms: number[] = []
  if (worksheet.value.primary_term) terms.push(worksheet.value.primary_term)
  if (worksheet.value.first_term) terms.push(worksheet.value.first_term)
  if (worksheet.value.second_term) terms.push(worksheet.value.second_term)
  if (worksheet.value.third_term) terms.push(worksheet.value.third_term)

  return terms.sort((a, b) => a - b)
})

// Comment functions
function openCommentModal(item: any) {
  commentItem.value = item
  commentText.value = item.comment || ''
  showCommentModal.value = true
}

async function saveComment() {
  if (!commentItem.value) return

  const { error } = await supabase
    .from('renewal_worksheet_items')
    .update({ comment: commentText.value || null })
    .eq('id', commentItem.value.id)

  if (error) {
    console.error('[Renewals] Comment save error:', error)
    return
  }

  // Update LOCAL state via composable - DO NOT MODIFY ITEMS SOURCE
  updateComment(commentItem.value.id, commentText.value)

  // Close modal
  showCommentModal.value = false
  commentItem.value = null
  commentText.value = ''
}

// Finalize workflow
async function handleFinalize() {
  if (!worksheet.value || !items.value) return

  isFinalizing.value = true

  try {
    // 1. Update worksheet status to 'final'
    const { error: worksheetError } = await supabase
      .from('renewal_worksheets')
      .update({
        status: 'final',
        updated_at: new Date().toISOString()
      })
      .eq('id', worksheetId)

    if (worksheetError) {
      console.error('[Renewals] Finalize error:', worksheetError)
      throw worksheetError
    }

    // 2. Generate and download Mail Merger Excel file
    const success = await exportMailMerger(
      worksheetId,
      worksheet.value.name,
      items.value,
      worksheet.value
    )

    if (!success) {
      console.error('[Renewals] Mail Merger export failed')
      // Don't throw - worksheet is still finalized
    }

    // 3. Update local state
    worksheet.value.status = 'final'

    // 4. Close modal
    showFinalizeModal.value = false

    console.log('[Renewals] Worksheet finalized:', worksheetId)
  } catch (error) {
    console.error('[Renewals] Finalize error:', error)
  } finally {
    isFinalizing.value = false
  }
}

// Status color mapping
const statusColors: Record<string, string> = {
  pending: 'neutral',
  offered: 'blue',
  manually_accepted: 'yellow',
  manually_declined: 'orange',
  accepted: 'success',
  declined: 'error',
  expired: 'neutral'
}

// Tabs configuration
const tabs = [
  { value: 'standard', label: 'Standard Renewals' },
  { value: 'mtm', label: 'Month-to-Month' }
]

// Computed: Is worksheet finalized?
const isFinalized = computed(() => worksheet.value?.status === 'final' || worksheet.value?.status === 'archived')

// Load term configuration from worksheet
watch(worksheet, (newWorksheet) => {
  if (newWorksheet) {
    termConfig.value = {
      primary_term: newWorksheet.primary_term || 12,
      first_term: newWorksheet.first_term || null,
      first_term_offset: newWorksheet.first_term_offset || null,
      second_term: newWorksheet.second_term || null,
      second_term_offset: newWorksheet.second_term_offset || null,
      third_term: newWorksheet.third_term || null,
      third_term_offset: newWorksheet.third_term_offset || null,
      early_discount: newWorksheet.early_discount || null,
      early_discount_date: newWorksheet.early_discount_date || null,
      term_goals: newWorksheet.term_goals || {}
    }
  }
}, { immediate: true })

// Get list of configured terms with early discount
function getConfiguredTermsList(worksheet: any): string {
  if (!worksheet) return ''

  const terms: number[] = []

  // Add primary term
  if (worksheet.primary_term) {
    terms.push(worksheet.primary_term)
  }

  // Add alternative terms
  if (worksheet.first_term) {
    terms.push(worksheet.first_term)
  }
  if (worksheet.second_term) {
    terms.push(worksheet.second_term)
  }
  if (worksheet.third_term) {
    terms.push(worksheet.third_term)
  }

  // Sort and format
  if (terms.length === 0) return 'Not configured'

  const sortedTerms = terms.sort((a, b) => a - b)
  let result = sortedTerms.map(t => `${t} months`).join(', ')

  // Add early discount if configured
  if (worksheet.early_discount && worksheet.early_discount_date) {
    const discountAmount = formatCurrency(worksheet.early_discount)
    const discountDate = formatDate(worksheet.early_discount_date)
    result += ` | Early Discount: ${discountAmount} (by ${discountDate})`
  }

  return result
}

// Open term configuration modal
function openTermConfigModal() {
  showTermConfigModal.value = true
}

// Save term configuration
async function saveTermConfig() {
  if (!worksheet.value) return

  try {
    const { error } = await supabase
      .from('renewal_worksheets')
      .update({
        primary_term: termConfig.value.primary_term,
        first_term: termConfig.value.first_term,
        first_term_offset: termConfig.value.first_term_offset,
        second_term: termConfig.value.second_term,
        second_term_offset: termConfig.value.second_term_offset,
        third_term: termConfig.value.third_term,
        third_term_offset: termConfig.value.third_term_offset,
        early_discount: termConfig.value.early_discount,
        early_discount_date: termConfig.value.early_discount_date,
        term_goals: termConfig.value.term_goals,
        updated_at: new Date().toISOString()
      })
      .eq('id', worksheetId)

    if (error) throw error

    // Update local worksheet
    worksheet.value.primary_term = termConfig.value.primary_term
    worksheet.value.first_term = termConfig.value.first_term
    worksheet.value.first_term_offset = termConfig.value.first_term_offset
    worksheet.value.second_term = termConfig.value.second_term
    worksheet.value.second_term_offset = termConfig.value.second_term_offset
    worksheet.value.third_term = termConfig.value.third_term
    worksheet.value.third_term_offset = termConfig.value.third_term_offset
    worksheet.value.early_discount = termConfig.value.early_discount
    worksheet.value.early_discount_date = termConfig.value.early_discount_date
    worksheet.value.term_goals = termConfig.value.term_goals

    showTermConfigModal.value = false
    console.log('[Renewals] Term configuration saved')
  } catch (error) {
    console.error('[Renewals] Term config save error:', error)
  }
}

// Update term goal for a specific term length
function updateTermGoal(termLength: number, goal: number | null) {
  if (goal === null || goal === 0) {
    delete termConfig.value.term_goals[termLength.toString()]
  } else {
    termConfig.value.term_goals[termLength.toString()] = goal
  }
}

// Update Status modal handlers
function openUpdateStatusModal() {
  if (selectedCount.value === 0) {
    alert('Please select at least one renewal item')
    return
  }
  showUpdateStatusModal.value = true
}

async function handleUpdateStatusModalClose(saved: boolean) {
  showUpdateStatusModal.value = false
  if (saved) {
    console.log('[Renewals] Status updated, refreshing items...')
    await refreshItems()
    clearSelection()
  }
}

// Watch for unsaved changes before navigation
onBeforeRouteLeave((to, from, next) => {
  if (isDirty.value || configChanged.value) {
    let message = 'You have unsaved changes. Are you sure you want to leave?'
    if (configChanged.value && !isDirty.value) {
      message = 'You have unsaved configuration changes (LTL%, Max%, or MTM Fee). Are you sure you want to leave?'
    } else if (isDirty.value && configChanged.value) {
      message = 'You have unsaved item AND configuration changes. Are you sure you want to leave?'
    }
    const confirmed = confirm(message)
    next(confirmed)
  } else {
    next()
  }
})
</script>

<template>
  <ClientOnly>
    <div class="space-y-4">
    <!-- Header -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div class="flex justify-between items-start">
        <div>
          <h1 class="text-2xl font-semibold">
            {{ worksheet?.name || 'Loading...' }}
          </h1>
          <div class="text-sm text-gray-500 mt-1">
            {{ formatDate(worksheet?.start_date) }} - {{ formatDate(worksheet?.end_date) }}
          </div>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            variant="ghost"
            icon="i-heroicons-arrow-left"
            label="Return to Worksheet List"
            @click="handleBackNavigation"
          />

          <UButton
            v-if="!isFinalized"
            variant="ghost"
            icon="i-heroicons-document-duplicate"
            label="Save As"
            @click="openSaveAsModal"
          />

          <UButton
            v-if="!isFinalized"
            icon="i-heroicons-check-circle"
            label="Save"
            :disabled="!isDirty"
            :loading="isSaving"
            @click="handleSave()"
          />

          <UButton
            v-if="worksheet?.status === 'draft'"
            icon="i-heroicons-lock-closed"
            label="Finalize"
            color="primary"
            @click="showFinalizeModal = true"
          />

          <UButton
            v-if="worksheet?.status === 'final'"
            icon="i-heroicons-arrow-down-tray"
            label="Download Mail Merger"
            variant="outline"
            :loading="exportingMailMerger"
            @click="exportMailMerger(worksheetId, worksheet.name, items, worksheet)"
          />
        </div>
      </div>

      <!-- Configuration Panel (User requested: visible on main page, not hidden in modal) -->
      <div v-if="worksheet" class="grid grid-cols-3 gap-4 mt-4 p-4 rounded-lg"
           :class="isFinalized ? 'bg-gray-100 dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'">
        <div>
          <label class="block text-sm font-medium mb-1">LTL % (Gap to Close)</label>
          <input
            v-model.number="ltl_percent"
            type="number"
            step="0.01"
            class="w-full px-3 py-2 border rounded-md"
            :disabled="isFinalized"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Max Increase %</label>
          <input
            v-model.number="max_rent_increase_percent"
            type="number"
            step="0.01"
            class="w-full px-3 py-2 border rounded-md"
            :disabled="isFinalized"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">
            {{ isCAProperty ? 'MTM Max %' : 'MTM Fee ($)' }}
          </label>
          <input
            v-model.number="mtm_fee"
            type="number"
            :step="isCAProperty ? '0.1' : '1'"
            class="w-full px-3 py-2 border rounded-md"
            :disabled="isFinalized"
            :placeholder="isCAProperty ? 'e.g., 10 (for 10%)' : 'e.g., 300'"
          />
          <p v-if="isCAProperty" class="text-xs text-blue-600 dark:text-blue-400 mt-1">
            ⚖️ CA Rent Control: Max % increase over any 12-month period
          </p>
        </div>

        <!-- Term Configuration Button -->
        <div class="col-span-3 flex items-center gap-4 pt-2 border-t">
          <UButton
            variant="outline"
            icon="i-heroicons-calendar"
            label="Configure Terms"
            size="sm"
            :disabled="isFinalized"
            @click="openTermConfigModal"
          />
          <div v-if="worksheet.primary_term" class="text-sm text-gray-600">
            <span>Terms: </span>
            <span class="font-medium">
              {{ getConfiguredTermsList(worksheet) }}
            </span>
          </div>
        </div>

        <div v-if="isFinalized" class="col-span-3 text-sm text-gray-500 italic">
          ℹ️ This worksheet is finalized and cannot be edited
        </div>

        <!-- CA Compliance Info Banner -->
        <div v-if="isCAProperty && !isFinalized" class="col-span-3 mt-2">
          <div class="p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div class="flex items-start gap-2 text-sm">
              <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div class="text-blue-900 dark:text-blue-100">
                <div class="font-semibold">CA Rent Control Active ({{ activeProperty }})</div>
                <div class="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  MTM increases are limited to <strong>{{ mtm_fee }}%</strong> over any rolling 12-month period.
                  The system will check against both MTM history and lease renewals to ensure compliance.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floor Plan Filter Buttons -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div class="mb-2 text-sm font-medium">Filter by Floor Plan:</div>
      
      <div class="flex flex-wrap gap-2 mb-2 p-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
        <!-- All Button -->
        <UButton
          size="sm"
          :variant="selectedFloorPlanId === null ? 'solid' : 'ghost'"
          :color="selectedFloorPlanId === null ? 'primary' : 'neutral'"
          @click="selectedFloorPlanId = null"
        >
          <div class="flex flex-col items-start px-2 py-1">
            <span class="text-[10px] font-bold uppercase tracking-widest opacity-70">ALL</span>
            <span class="font-bold">All Floor Plans</span>
            <span class="text-[10px] opacity-60">
                {{ standardRenewals.length }} / {{ mtmRenewals.length }}
            </span>
          </div>
        </UButton>

        <!-- Floor Plan Buttons -->
        <UButton
          v-for="fp in floorPlanAnalytics"
          :key="fp.floor_plan_id"
          size="sm"
          :variant="selectedFloorPlanId === fp.floor_plan_id ? 'solid' : 'ghost'"
          :color="selectedFloorPlanId === fp.floor_plan_id ? 'primary' : 'neutral'"
          @click="selectedFloorPlanId = fp.floor_plan_id"
        >
          <div class="flex flex-col items-start px-2 py-1">
            <span class="text-[10px] font-bold uppercase tracking-widest opacity-70">{{ fp.floor_plan_code }}</span>
            <span class="font-bold">{{ fp.floor_plan_name }}</span>
            <span class="text-[10px] opacity-60">
              {{ floorPlanCounts[fp.floor_plan_id]?.standard || 0 }} / {{ floorPlanCounts[fp.floor_plan_id]?.mtm || 0 }}
            </span>
          </div>
        </UButton>
      </div>

      <!-- Analytics for Selected Floor Plan -->
      <div v-if="selectedFloorPlanId" class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div class="grid grid-cols-4 gap-4 text-sm">
          <div>
            <div class="font-medium">Current Rent Range</div>
            <div class="text-gray-600">
              {{ formatCurrency(floorPlanAnalytics.find(fp => fp.floor_plan_id === selectedFloorPlanId)?.current_rent_min) }}
              -
              {{ formatCurrency(floorPlanAnalytics.find(fp => fp.floor_plan_id === selectedFloorPlanId)?.current_rent_max) }}
            </div>
            <div class="text-xs text-gray-500">
              Avg: {{ formatCurrency(floorPlanAnalytics.find(fp => fp.floor_plan_id === selectedFloorPlanId)?.current_rent_avg) }}
            </div>
          </div>

          <div>
            <div class="font-medium">Expiring Soon</div>
            <div class="text-gray-600">
              30 days: {{ floorPlanAnalytics.find(fp => fp.floor_plan_id === selectedFloorPlanId)?.expiring_30_days || 0 }}
            </div>
            <div class="text-xs text-gray-500">
              90 days: {{ floorPlanAnalytics.find(fp => fp.floor_plan_id === selectedFloorPlanId)?.expiring_90_days || 0 }}
            </div>
          </div>

          <div>
            <div class="font-medium">Manual Status</div>
            <div class="text-yellow-600">
              Accepted: {{ floorPlanAnalytics.find(fp => fp.floor_plan_id === selectedFloorPlanId)?.manually_accepted_count || 0 }}
            </div>
            <div class="text-orange-600">
              Declined: {{ floorPlanAnalytics.find(fp => fp.floor_plan_id === selectedFloorPlanId)?.manually_declined_count || 0 }}
            </div>
          </div>

          <div>
            <div class="font-medium">Yardi Confirmed</div>
            <div class="text-green-600">
              Total: {{ floorPlanAnalytics.find(fp => fp.floor_plan_id === selectedFloorPlanId)?.yardi_confirmed_count || 0 }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div class="grid grid-cols-5 gap-4 text-center">
        <div>
          <div class="text-2xl font-bold">{{ summary.total }}</div>
          <div class="text-sm text-gray-600">Total Renewals</div>
        </div>

        <div>
          <div class="text-2xl font-bold text-yellow-600">{{ summary.manually_accepted }}</div>
          <div class="text-sm text-gray-600">Manual Accepted</div>
        </div>

        <div>
          <div class="text-2xl font-bold text-green-600">{{ summary.accepted }}</div>
          <div class="text-sm text-gray-600">Yardi Confirmed</div>
        </div>

        <div>
          <div class="text-2xl font-bold text-blue-600">{{ formatCurrency(summary.total_increase) }}</div>
          <div class="text-sm text-gray-600">Total Increase</div>
        </div>

        <div>
          <div class="text-2xl font-bold">{{ summary.approved }} / {{ summary.total }}</div>
          <div class="text-sm text-gray-600">Approved</div>
        </div>
      </div>
    </div>

    <!-- Tabs: Standard vs MTM -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
      <SimpleTabs v-model="activeTab" :items="tabs">
        <template #standard>
          <div class="p-4">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold">Standard Renewals</h3>

              <div class="flex items-center gap-2">
                <UButton
                  v-if="!isFinalized"
                  icon="i-heroicons-pencil-square"
                  label="Update Status"
                  size="sm"
                  color="primary"
                  variant="outline"
                  :disabled="selectedCount === 0"
                  @click="openUpdateStatusModal"
                >
                  <template v-if="selectedCount > 0" #trailing>
                    <UBadge :label="String(selectedCount)" color="primary" size="xs" />
                  </template>
                </UButton>

                <UButton
                  size="sm"
                  :label="allApproved ? 'Disapprove All' : 'Approve All'"
                  :color="allApproved ? 'neutral' : 'primary'"
                  @click="setAllApprovals(!allApproved)"
                />
              </div>
            </div>

            <GenericDataTable
              :data="displayedItems"
              :columns="standardColumns"
              :loading="itemsPending || worksheetPending"
              row-key="id"
              empty-message="No standard renewals found in this date range."
              enable-export
              export-filename="standard-renewals"
            >
              <!-- Selection Checkbox Header -->
              <template #header-selection>
                <input
                  v-if="!isFinalized"
                  type="checkbox"
                  :checked="allSelected"
                  :indeterminate.prop="someSelected && !allSelected"
                  class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  @click.stop
                  @change="toggleSelectAll"
                />
              </template>

              <!-- Selection Checkbox Cell -->
              <template #cell-selection="{ row }">
                <input
                  v-if="!isFinalized"
                  type="checkbox"
                  :checked="isSelected(row)"
                  class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  @click.stop
                  @change="(e) => { console.log('Toggle row:', row.id, 'checked:', e.target.checked); toggleRow(row); }"
                />
              </template>

              <template #cell-unit_name="{ row }">
                {{ row.units?.unit_name || row.unit_name || 'N/A' }}
              </template>

              <template #cell-lease_to_date="{ value }">
                {{ formatDate(value) }}
              </template>

              <template #cell-current_rent="{ value }">
                {{ formatCurrency(value) }}
              </template>

              <template #cell-market_rent="{ value }">
                {{ formatCurrency(value) }}
              </template>

              <!-- LTL % Rent Option (Clickable) -->
              <template #cell-ltl_rent="{ row }">
                <div
                  class="px-2 py-1 cursor-pointer text-right transition-all"
                  :class="isRentOptionSelected(row, 'ltl_percent')
                    ? 'border-2 border-green-500 bg-green-50 dark:bg-green-900/20 rounded font-semibold'
                    : 'border-2 border-gray-200 dark:border-gray-600 rounded hover:border-gray-400'"
                  @click="handleRentOptionClick(row, 'ltl_percent')"
                >
                  {{ formatCurrency(row.ltl_rent) }}
                </div>
              </template>

              <!-- Max % Rent Option (Clickable) -->
              <template #cell-max_rent="{ row }">
                <div
                  class="px-2 py-1 cursor-pointer text-right transition-all"
                  :class="isRentOptionSelected(row, 'max_percent')
                    ? 'border-2 border-green-500 bg-green-50 dark:bg-green-900/20 rounded font-semibold'
                    : 'border-2 border-gray-200 dark:border-gray-600 rounded hover:border-gray-400'"
                  @click="handleRentOptionClick(row, 'max_percent')"
                >
                  {{ formatCurrency(row.max_rent) }}
                </div>
              </template>

              <!-- Manual Rent Option (Always shows input) -->
              <template #cell-manual_rent="{ row }">
                <div
                  class="px-2 py-1 text-right transition-all"
                  :class="isRentOptionSelected(row, 'manual')
                    ? 'border-2 border-green-500 bg-green-50 dark:bg-green-900/20 rounded'
                    : 'border-2 border-gray-200 dark:border-gray-600 rounded hover:border-gray-400'"
                >
                  <input
                    v-model.number="row.custom_rent"
                    type="number"
                    class="w-full px-1 text-right bg-transparent border-0 outline-none"
                    :class="isRentOptionSelected(row, 'manual') ? 'font-semibold' : ''"
                    placeholder="+/- $"
                    @focus="handleRentOptionClick(row, 'manual')"
                    @blur="updateCustomRent(row.id, row.custom_rent)"
                  />
                </div>
              </template>

              <!-- Final Rent (Read-only, computed from selection) -->
              <template #cell-final_rent="{ row }">
                <span class="font-bold text-blue-600">{{ formatCurrency(row.final_rent) }}</span>
              </template>

              <template #cell-increase="{ row }">
                <div class="text-right">
                  <div :class="row.is_capped_by_max
                    ? 'text-yellow-600 font-semibold'
                    : ((row.rent_increase || 0) >= 0 ? 'text-green-600' : 'text-red-600')">
                    {{ formatCurrency(row.rent_increase) }}
                  </div>
                  <div class="text-xs text-gray-500">
                    ({{ (row.rent_increase_percent || 0).toFixed(1) }}%)
                    <span v-if="row.is_capped_by_max" class="text-yellow-600">⚠ Max Cap</span>
                  </div>
                </div>
              </template>

              <template #cell-status="{ row }">
                <div class="space-y-1">
                  <BadgeCell
                    :text="row.status"
                    :color="statusColors[row.status]"
                    variant="subtle"
                  />

                  <div v-if="row.is_manual_pending" class="text-xs text-yellow-600">
                    (Awaiting Yardi confirmation)
                  </div>
                </div>
              </template>

              <template #cell-approved="{ row }">
                <input
                  v-model="row.approved"
                  type="checkbox"
                  class="w-4 h-4 rounded"
                  :disabled="isFinalized"
                  @change="toggleApproval(row.id)"
                />
              </template>

              <template #cell-actions="{ row }">
                <div class="flex items-center gap-1">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="green"
                    icon="i-heroicons-check"
                    :disabled="isFinalized"
                    title="Mark as Manually Accepted (Select Term)"
                    @click="openManualAcceptModal(row)"
                  />

                  <UButton
                    size="xs"
                    variant="ghost"
                    color="red"
                    icon="i-heroicons-x-mark"
                    :disabled="isFinalized"
                    title="Mark as Manually Declined"
                    @click="handleManualDecline(row.id)"
                  />

                  <UButton
                    size="xs"
                    variant="ghost"
                    icon="i-heroicons-chat-bubble-left-right"
                    :color="row.comment ? 'success' : 'gray'"
                    :title="row.comment ? 'Edit Comment' : 'Add Comment'"
                    @click="openCommentModal(row)"
                  />
                </div>
              </template>
            </GenericDataTable>
          </div>
        </template>

        <template #mtm>
          <div class="p-4">
            <h3 class="text-lg font-semibold mb-4">Month-to-Month Renewals</h3>

            <GenericDataTable
              :data="displayedItems"
              :columns="mtmColumns"
              :loading="itemsPending || worksheetPending"
              row-key="id"
              empty-message="No MTM renewals found."
              enable-export
              export-filename="mtm-renewals"
            >
              <template #cell-unit_name="{ row }">
                {{ row.units?.unit_name || row.unit_name || 'N/A' }}
              </template>

              <template #cell-lease_to_date="{ value }">
                {{ formatDate(value) }}
              </template>

              <template #cell-market_rent="{ value }">
                {{ formatCurrency(value) }}
              </template>

              <template #cell-current_rent="{ value }">
                {{ formatCurrency(value) }}
              </template>

              <template #cell-mtm_rent="{ row }">
                <span class="font-medium text-blue-600">{{ formatCurrency(row.mtm_rent) }}</span>
              </template>

              <template #cell-final_rent="{ row }">
                <input
                  v-model.number="row.final_rent"
                  type="number"
                  class="w-28 px-2 py-1 border-2 border-green-500 rounded text-right font-bold text-green-600"
                  :disabled="isFinalized"
                  @blur="updateCustomRent(row.id, row.final_rent - row.current_rent)"
                />
              </template>

              <template #cell-last_mtm_offer_date="{ value }">
                {{ formatDate(value) }}
              </template>

              <template #cell-status="{ row }">
                <div class="space-y-1">
                  <BadgeCell
                    :text="row.status"
                    :color="statusColors[row.status]"
                    variant="subtle"
                  />

                  <div v-if="row.is_manual_pending" class="text-xs text-yellow-600">
                    (Awaiting Yardi confirmation)
                  </div>
                </div>
              </template>

              <template #cell-approved="{ row }">
                <input
                  v-model="row.approved"
                  type="checkbox"
                  class="w-4 h-4 rounded"
                  :disabled="isFinalized"
                  @change="toggleApproval(row.id)"
                />
              </template>

              <template #cell-actions="{ row }">
                <div class="flex items-center gap-1">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="green"
                    icon="i-heroicons-check"
                    title="Mark as Manually Accepted"
                    :disabled="isFinalized"
                    @click="updateManualStatus(row.id, 'accepted')"
                  />

                  <UButton
                    size="xs"
                    variant="ghost"
                    color="red"
                    icon="i-heroicons-x-mark"
                    title="Mark as Manually Declined"
                    :disabled="isFinalized"
                    @click="handleManualDecline(row.id)"
                  />

                  <UButton
                    size="xs"
                    variant="ghost"
                    icon="i-heroicons-chat-bubble-left-right"
                    :color="row.comment ? 'success' : 'gray'"
                    :title="row.comment ? 'Edit Comment' : 'Add Comment'"
                    @click="openCommentModal(row)"
                  />
                </div>
              </template>
            </GenericDataTable>
          </div>
        </template>
      </SimpleTabs>
    </div>

    <!-- Save As Modal -->
    <SimpleModal v-model="showSaveAsModal" title="Save As New Worksheet">
      <form @submit.prevent="handleSaveAs" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">New Worksheet Name</label>
          <input
            v-model="saveAsName"
            type="text"
            class="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            type="button"
            variant="ghost"
            label="Cancel"
            @click="showSaveAsModal = false"
          />
          <UButton
            type="submit"
            label="Save As"
          />
        </div>
      </form>
    </SimpleModal>

    <!-- Comment Modal -->
    <SimpleModal v-model="showCommentModal" title="Add Comment">
      <form @submit.prevent="saveComment" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Comment</label>
          <textarea
            v-model="commentText"
            rows="4"
            class="w-full px-3 py-2 border rounded-md resize-none"
            placeholder="Add a comment for this renewal..."
          />
        </div>

        <div v-if="commentItem" class="text-xs text-gray-500">
          <div><strong>Unit:</strong> {{ commentItem.units?.unit_name || commentItem.unit_name || 'Unknown' }}</div>
          <div><strong>Resident:</strong> {{ commentItem.resident_name || 'Unknown' }}</div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            type="button"
            variant="ghost"
            label="Cancel"
            @click="showCommentModal = false"
          />
          <UButton
            type="submit"
            label="Save Comment"
          />
        </div>
      </form>
    </SimpleModal>

    <!-- Manual Accept Term Selection Modal -->
    <SimpleModal v-model="showManualAcceptModal" title="Manual Acceptance - Select Term">
      <div class="space-y-4">
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p class="text-sm text-blue-700 dark:text-blue-300">
            Select the lease term length that the resident accepted.
          </p>
        </div>

        <div v-if="manualAcceptItem" class="text-sm space-y-2">
          <div><strong>Unit:</strong> {{ manualAcceptItem.unit_name }}</div>
          <div><strong>Resident:</strong> {{ manualAcceptItem.resident_name }}</div>
          <div><strong>Current Rent:</strong> {{ formatCurrency(manualAcceptItem.current_rent) }}</div>
          <div><strong>Offered Rent:</strong> {{ formatCurrency(manualAcceptItem.final_rent) }}</div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Accepted Term Length</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="term in availableTerms"
              :key="term"
              type="button"
              class="px-4 py-3 border-2 rounded-lg transition-all text-center"
              :class="selectedAcceptTerm === term
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 font-semibold'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-400'"
              @click="selectedAcceptTerm = term"
            >
              <div class="text-lg font-bold">{{ term }}</div>
              <div class="text-xs text-gray-500">months</div>
            </button>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            type="button"
            variant="ghost"
            label="Cancel"
            @click="showManualAcceptModal = false"
          />
          <UButton
            type="button"
            label="Confirm Acceptance"
            color="success"
            icon="i-heroicons-check-circle"
            :disabled="!selectedAcceptTerm"
            @click="handleManualAccept"
          />
        </div>
      </div>
    </SimpleModal>

    <!-- Back Navigation Warning Modal -->
    <SimpleModal v-model="showBackWarningModal" title="Unsaved Changes">
      <div class="space-y-4">
        <div class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <UIcon name="i-heroicons-exclamation-triangle" class="text-orange-600 text-xl mt-0.5" />
            <div>
              <h4 class="font-semibold text-orange-800 dark:text-orange-200 mb-1">Warning</h4>
              <p class="text-sm text-orange-700 dark:text-orange-300">
                You have unsaved changes. If you leave this page now, your changes will be lost.
              </p>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            type="button"
            variant="ghost"
            label="Stay on Page"
            @click="showBackWarningModal = false"
          />
          <UButton
            type="button"
            label="Leave Without Saving"
            color="error"
            @click="confirmBackNavigation"
          />
        </div>
      </div>
    </SimpleModal>

    <!-- Finalize Modal -->
    <SimpleModal v-model="showFinalizeModal" title="Finalize Worksheet">
      <div class="space-y-4">
        <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <UIcon name="i-heroicons-exclamation-triangle" class="text-yellow-600 text-xl mt-0.5" />
            <div>
              <h4 class="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">Important</h4>
              <p class="text-sm text-yellow-700 dark:text-yellow-300">
                Finalizing this worksheet will:
              </p>
              <ul class="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300 mt-2 space-y-1">
                <li>Lock the worksheet (no further edits allowed)</li>
                <li>Change status to "Final"</li>
                <li>Generate and download a Mail Merger Excel file for offer letters</li>
              </ul>
            </div>
          </div>
        </div>

        <div v-if="worksheet" class="text-sm">
          <div class="grid grid-cols-2 gap-2">
            <div class="text-gray-500">Worksheet:</div>
            <div class="font-medium">{{ worksheet.name }}</div>

            <div class="text-gray-500">Total Items:</div>
            <div class="font-medium">{{ items?.length || 0 }}</div>

            <div class="text-gray-500">Approved:</div>
            <div class="font-medium">{{ summary.approved }} / {{ summary.total }}</div>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            type="button"
            variant="ghost"
            label="Cancel"
            @click="showFinalizeModal = false"
          />
          <UButton
            type="button"
            label="Finalize Worksheet"
            color="primary"
            icon="i-heroicons-lock-closed"
            :loading="isFinalizing || exportingMailMerger"
            @click="handleFinalize"
          />
        </div>
      </div>
    </SimpleModal>

    <!-- Term Configuration Modal -->
    <SimpleModal v-model="showTermConfigModal" title="Configure Lease Terms">
      <form @submit.prevent="saveTermConfig" class="space-y-6">
        <!-- Info Section -->
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p class="text-sm text-blue-700 dark:text-blue-300">
            Configure the primary lease term and up to 3 alternative terms with pricing adjustments.
            Set renewal goals for each term to track your leasing targets.
          </p>
        </div>

        <!-- Primary Term -->
        <div class="border-b pb-4">
          <h3 class="font-semibold mb-3">Primary Lease Term</h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Term Length (months)</label>
              <input
                v-model.number="termConfig.primary_term"
                type="number"
                min="1"
                max="24"
                class="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Renewal Goal (optional)</label>
              <input
                :value="termConfig.term_goals[termConfig.primary_term] || ''"
                @input="updateTermGoal(termConfig.primary_term, ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null)"
                type="number"
                min="0"
                class="w-full px-3 py-2 border rounded-md"
                placeholder="# of renewals"
              />
            </div>
          </div>
        </div>

        <!-- Alternative Terms -->
        <div class="space-y-4">
          <h3 class="font-semibold">Alternative Lease Terms (Optional)</h3>

          <!-- First Alternative -->
          <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div class="text-xs font-medium text-gray-500 mb-2">Alternative #1</div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium mb-1">Term (months)</label>
                <input
                  v-model.number="termConfig.first_term"
                  type="number"
                  min="1"
                  max="24"
                  class="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="e.g., 10"
                />
              </div>
              <div>
                <label class="block text-xs font-medium mb-1">Offset %</label>
                <input
                  v-model.number="termConfig.first_term_offset"
                  type="number"
                  step="0.1"
                  class="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="e.g., -2.5"
                />
                <div class="text-xs text-gray-500 mt-1">Negative = discount</div>
              </div>
              <div>
                <label class="block text-xs font-medium mb-1">Goal</label>
                <input
                  :value="termConfig.first_term ? (termConfig.term_goals[termConfig.first_term] || '') : ''"
                  @input="termConfig.first_term && updateTermGoal(termConfig.first_term, ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null)"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 border rounded-md text-sm"
                  :disabled="!termConfig.first_term"
                  placeholder="# renewals"
                />
              </div>
            </div>
          </div>

          <!-- Second Alternative -->
          <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div class="text-xs font-medium text-gray-500 mb-2">Alternative #2</div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium mb-1">Term (months)</label>
                <input
                  v-model.number="termConfig.second_term"
                  type="number"
                  min="1"
                  max="24"
                  class="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="e.g., 14"
                />
              </div>
              <div>
                <label class="block text-xs font-medium mb-1">Offset %</label>
                <input
                  v-model.number="termConfig.second_term_offset"
                  type="number"
                  step="0.1"
                  class="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="e.g., 1.0"
                />
                <div class="text-xs text-gray-500 mt-1">Positive = premium</div>
              </div>
              <div>
                <label class="block text-xs font-medium mb-1">Goal</label>
                <input
                  :value="termConfig.second_term ? (termConfig.term_goals[termConfig.second_term] || '') : ''"
                  @input="termConfig.second_term && updateTermGoal(termConfig.second_term, ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null)"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 border rounded-md text-sm"
                  :disabled="!termConfig.second_term"
                  placeholder="# renewals"
                />
              </div>
            </div>
          </div>

          <!-- Third Alternative -->
          <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div class="text-xs font-medium text-gray-500 mb-2">Alternative #3</div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium mb-1">Term (months)</label>
                <input
                  v-model.number="termConfig.third_term"
                  type="number"
                  min="1"
                  max="24"
                  class="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="e.g., 18"
                />
              </div>
              <div>
                <label class="block text-xs font-medium mb-1">Offset %</label>
                <input
                  v-model.number="termConfig.third_term_offset"
                  type="number"
                  step="0.1"
                  class="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="e.g., 2.0"
                />
                <div class="text-xs text-gray-500 mt-1">Positive = premium</div>
              </div>
              <div>
                <label class="block text-xs font-medium mb-1">Goal</label>
                <input
                  :value="termConfig.third_term ? (termConfig.term_goals[termConfig.third_term] || '') : ''"
                  @input="termConfig.third_term && updateTermGoal(termConfig.third_term, ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null)"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 border rounded-md text-sm"
                  :disabled="!termConfig.third_term"
                  placeholder="# renewals"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Early Acceptance Discount -->
        <div class="border-t pt-4">
          <h3 class="font-semibold mb-3">Early Acceptance Discount (Optional)</h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Discount Amount ($)</label>
              <input
                v-model.number="termConfig.early_discount"
                type="number"
                min="0"
                step="1"
                class="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., 100"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Valid Until Date</label>
              <input
                v-model="termConfig.early_discount_date"
                type="date"
                class="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
          <div class="text-xs text-gray-500 mt-2">
            Early bird discount for residents who sign before the specified date
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2 pt-4 border-t">
          <UButton
            type="button"
            variant="ghost"
            label="Cancel"
            @click="showTermConfigModal = false"
          />
          <UButton
            type="submit"
            label="Save Configuration"
            icon="i-heroicons-check"
          />
        </div>
      </form>
    </SimpleModal>

    <!-- Update Status Modal -->
    <SimpleModal
      v-model="showUpdateStatusModal"
      title="Update Renewal Status"
      width="max-w-2xl"
    >
      <UpdateStatusModal
        v-if="showUpdateStatusModal"
        :selected-items="selectedRows"
        :on-close="handleUpdateStatusModalClose"
      />
    </SimpleModal>
  </div>
  </ClientOnly>
</template>
