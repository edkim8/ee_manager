<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePropertyState } from '../../../../../base/composables/usePropertyState'
import { useSupabaseClient, useAsyncData, navigateTo, definePageMeta, useRoute, useRouter, refreshNuxtData } from '#imports'
import type { TableColumn } from '../../../../../table/types'
import SimpleModal from '../../../../../base/components/SimpleModal.vue'
import AmenityAdjustmentModal from '../../../../components/modals/AmenityAdjustmentModal.vue'
import SyncDiscrepanciesModal from '../../../../components/modals/SyncDiscrepanciesModal.vue'

definePageMeta({
  layout: 'dashboard'
})

const supabase = useSupabaseClient()
const { activeProperty } = usePropertyState()
const route = useRoute()
const router = useRouter()

// 1. Fetch Summary Data for all Floor Plans
// Use a computed key that includes activeProperty to ensure proper reactivity
const { data: floorPlanSummaries, status: summaryStatus } = await useAsyncData(
  () => `floor-plan-summaries-${activeProperty.value}`,
  async () => {
    if (!activeProperty.value) {
      return []
    }

    // Parallel fetch: Summaries + Floor Plan Details (for SF sort)
    const [summariesResult, floorPlansResult] = await Promise.all([
      supabase
        .from('view_floor_plan_pricing_summary')
        .select('*')
        .eq('property_code', activeProperty.value),
      
      supabase
        .from('floor_plans')
        .select('id, area_sqft')
        .eq('property_code', activeProperty.value)
    ])

    if (summariesResult.error) {
      console.error('[Floor Plans] Error fetching summaries:', summariesResult.error)
      throw summariesResult.error
    }

    if (floorPlansResult.error) {
       console.warn('[Floor Plans] Could not fetch floor plan details:', floorPlansResult.error)
       // Fallback: return summaries sorted by name if SF fetch fails
       return (summariesResult.data || []).sort((a: any, b: any) => 
         (a.floor_plan_name || '').localeCompare(b.floor_plan_name || '')
       )
    }
    
    const summariesData = summariesResult.data || []
    const floorPlansData = floorPlansResult.data || []

    // Create SF map
    const sfMap = new Map<string, number>()
    floorPlansData.forEach((fp: any) => {
      if (fp.id) sfMap.set(fp.id, fp.area_sqft || 0)
    })

    // Attach SF and Sort
    const sortedSummaries = summariesData.map((item: any) => ({
      ...item,
      area_sqft: item.floor_plan_id ? sfMap.get(item.floor_plan_id) : 0
    })).sort((a: any, b: any) => {
      const sfA = a.area_sqft || 0
      const sfB = b.area_sqft || 0
      
      // Sort by SF Ascending (Smallest to Largest)
      if (sfA !== sfB) return sfA - sfB
      
      // Fallback to name
      return (a.floor_plan_name || '').localeCompare(b.floor_plan_name || '')
    })

    console.log('[Floor Plans] Sorted by SF:', sortedSummaries.map((s: any) => ({ name: s.floor_plan_name, sf: s.area_sqft })))

    return sortedSummaries
  },
  {
    watch: [activeProperty],
    // Don't execute server-side if no property yet
    server: !!activeProperty.value
  }
)

// 2. Select Active Floor Plan from Query Param or First Available
const selectedFloorPlanId = computed(() => {
  const firstPlan = floorPlanSummaries.value?.[0]
  console.log('[DEBUG] First floor plan:', firstPlan)
  console.log('[DEBUG] Available keys:', firstPlan ? Object.keys(firstPlan) : 'no data')
  return (route.query.floor_plan_id as string) || firstPlan?.floor_plan_id || null
})

// Fallback: If URL has floor_plan_id but summaries are empty, fetch directly
const { data: fallbackFloorPlan } = await useAsyncData(
  () => `fallback-fp-${route.query.floor_plan_id}`,
  async () => {
    const urlFloorPlanId = route.query.floor_plan_id as string
    if (!urlFloorPlanId) return null
    if (floorPlanSummaries.value && floorPlanSummaries.value.length > 0) return null

    console.log('[DEBUG] Fetching fallback floor plan data for:', urlFloorPlanId)

    const { data, error } = await supabase
      .from('view_floor_plan_pricing_summary')
      .select('*')
      .eq('floor_plan_id', urlFloorPlanId)
      .single()

    if (error) {
      console.error('[DEBUG] Fallback floor plan error:', error)
      return null
    }

    console.log('[DEBUG] Fallback floor plan fetched:', data)

    // If we got a floor plan, set the active property from it
    if (data && data.property_code && !activeProperty.value) {
      console.log('[DEBUG] Setting active property from fallback floor plan:', data.property_code)
      activeProperty.value = data.property_code
    }

    return data
  },
  {
    watch: [() => route.query.floor_plan_id, floorPlanSummaries]
  }
)

const activeFloorPlan = computed(() => {
  const found = floorPlanSummaries.value?.find((fp: any) => fp.floor_plan_id === selectedFloorPlanId.value)
  console.log('[DEBUG] Active floor plan:', { selectedId: selectedFloorPlanId.value, found, fallback: fallbackFloorPlan.value })

  // Use fallback if summaries don't have the floor plan
  return found || fallbackFloorPlan.value
})

const selectFloorPlan = (id: string) => {
  router.push({ query: { ...route.query, floor_plan_id: id } })
}

// 3. Fetch Units for the selected Floor Plan
const { data: units, status: unitsStatus, refresh: refreshUnits } = await useAsyncData(`fp-units-${selectedFloorPlanId.value}`, async () => {
    console.log('[DEBUG] Fetching units for floor plan:', selectedFloorPlanId.value)

    if (!selectedFloorPlanId.value) {
        console.log('[DEBUG] No selected floor plan, returning empty array')
        return []
    }

    // 1. Fetch Pipeline data (to get status, rent_offered from Yardi)
    const { data: pipelineData, error: pipelineError } = await supabase
        .from('view_leasing_pipeline')
        .select('*')
        .eq('floor_plan_id', selectedFloorPlanId.value)
        .order('unit_name')

    console.log('[DEBUG] Pipeline data response:', { count: pipelineData?.length, error: pipelineError })

    if (pipelineError) {
        console.error('[DEBUG] Pipeline data error:', pipelineError)
        throw pipelineError
    }
    if (!pipelineData || pipelineData.length === 0) {
        console.log('[DEBUG] No pipeline data found, returning empty array')
        return []
    }

    // 2. Build leases map from pipeline data (already has rent info)
    const unitIds = pipelineData.map((p: any) => p.unit_id)
    const leasesMap = new Map()
    pipelineData.forEach((p: any) => {
        // For Applied/Future status, use rent_offered as the leased rent
        if (['Applied', 'Future'].includes(p.status) && p.rent_offered) {
            leasesMap.set(p.unit_id, Number(p.rent_offered))
        }
    })

    // 3. Fetch application_date overrides if missing from pipeline
    // (Pipeline should have it, but we keep this as a robust fallback/override source)
    const { data: applicationsData, error: appsError } = await supabase
        .from('applications')
        .select('unit_id, application_date')
        .in('unit_id', unitIds)
        .order('application_date', { ascending: true })

    // 4. Fetch unit_amenities with amenity details for sync comparison
    const { data: unitAmenitiesData, error: amenError } = await supabase
        .from('unit_amenities')
        .select('unit_id, amenities(yardi_amenity, yardi_name, yardi_code)')
        .in('unit_id', unitIds)
        .eq('active', true)

    const applicationsMap = new Map()
    applicationsData?.forEach((a: any) => applicationsMap.set(a.unit_id, a.application_date))

    const unitAmenitiesMap = new Map<string, string[]>()
    unitAmenitiesData?.forEach((ua: any) => {
        if (!ua.amenities) return
        const unitId = ua.unit_id
        if (!unitAmenitiesMap.has(unitId)) {
            unitAmenitiesMap.set(unitId, [])
        }
        const amenityIds = [
            ua.amenities.yardi_amenity,
            ua.amenities.yardi_code,
            ua.amenities.yardi_name
        ].filter(Boolean)
        unitAmenitiesMap.get(unitId)?.push(...amenityIds)
    })

    try {
        const enrichedUnits = pipelineData.map((item: any) => {
            const calculated = item.calculated_offered_rent || 0
            const offered = Number(item.rent_offered || 0)
            const rentMatches = Math.abs(offered - calculated) < 0.01
            const leasedRent = leasesMap.get(item.unit_id)
            // Use pipeline date with map fallback
            const applicationDate = item.application_date || applicationsMap.get(item.unit_id)

            let yardiAmenities: string[] = []
            if (item.amenities) {
                if (typeof item.amenities === 'string') {
                    yardiAmenities = item.amenities.split('<br>').map((a: string) => a.trim()).filter(Boolean)
                } else if (Array.isArray(item.amenities)) {
                    yardiAmenities = item.amenities
                }
            }

            const dbAmenities = unitAmenitiesMap.get(item.unit_id) || []
            const missingInDb = yardiAmenities.filter((ya: string) => !dbAmenities.includes(ya))
            const extraInDb = dbAmenities.filter((da: string) => !yardiAmenities.includes(da))

            const criticalAlerts = []
            const infoAlerts = []

            if (!rentMatches) {
                criticalAlerts.push(`💰 Rent Mismatch: Yardi $${offered.toLocaleString()} ≠ Calculated $${calculated.toLocaleString()} (Δ $${Math.abs(offered - calculated).toLocaleString()})`)
            }

            if (missingInDb.length > 0) {
                const alert = `⚠️ Missing in DB: ${missingInDb.join(', ')}`
                if (rentMatches) infoAlerts.push(alert)
                else criticalAlerts.push(alert)
            }
            if (extraInDb.length > 0) {
                const alert = `➕ Extra in DB: ${extraInDb.join(', ')}`
                if (rentMatches) infoAlerts.push(alert)
                else criticalAlerts.push(alert)
            }

            return {
                ...item,
                leased_rent: leasedRent || 0,
                application_date: applicationDate,
                sync_alerts: criticalAlerts,
                sync_info: infoAlerts,
                sync_status: criticalAlerts.length === 0 ? 'synced' : 'error'
            }
        })
        return enrichedUnits
    } catch (error) {
        console.error('[DEBUG] Error enriching units:', error)
        throw error
    }
}, {
    watch: [selectedFloorPlanId]
})

// Add watcher to log when units change
watch(units, (newUnits) => {
    console.log('[DEBUG] Units data updated:', {
        count: newUnits?.length,
        hasData: !!newUnits,
        firstUnit: newUnits?.[0]
    })
}, { immediate: true })

// Split units into Available and Applicant/Future
const availableUnits = computed(() => {
    const filtered = units.value?.filter((u: any) => u.status === 'Available') || []
    console.log('[DEBUG] Available units:', { total: units.value?.length, available: filtered.length })
    return filtered
})

const applicantFutureUnits = computed(() => {
    const filtered = units.value?.filter((u: any) => ['Applied', 'Leased'].includes(u.status))
        .sort((a: any, b: any) => {
            // Sort by application_date ascending
            if (!a.application_date) return 1
            if (!b.application_date) return -1
            return new Date(a.application_date).getTime() - new Date(b.application_date).getTime()
        }) || []
    console.log('[DEBUG] Applicant/Future units:', { count: filtered.length })
    return filtered
})

// Computed metrics for Available Units only
const availableUnitsMetrics = computed(() => {
    if (!availableUnits.value || availableUnits.value.length === 0) {
        return {
            avgMarket: 0,
            avgOffered: 0,
            concessions: 0,
            concessionPct: 0,
            count: 0
        }
    }

    const totalMarket = availableUnits.value.reduce((sum: number, u: any) => sum + (u.calculated_market_rent || 0), 0)
    const totalOffered = availableUnits.value.reduce((sum: number, u: any) => sum + (u.calculated_offered_rent || 0), 0)
    const count = availableUnits.value.length

    return {
        avgMarket: totalMarket / count,
        avgOffered: totalOffered / count,
        concessions: (totalOffered - totalMarket) / count,
        concessionPct: totalMarket > 0 ? (((totalOffered - totalMarket) / totalMarket) * 100) : 0,
        count
    }
})

// Columns for Available Units Table
const availableColumns: TableColumn[] = [
  { key: 'unit_name', label: 'Unit', sortable: true, width: '100px', align: 'center' },
  { key: 'sync_alerts', label: 'Sync', width: '80px', align: 'center' },
  { key: 'base_rent', label: 'Base', sortable: true, align: 'right' },
  { key: 'calculated_market_rent', label: 'Market', sortable: true, align: 'right' },
  { key: 'calculated_offered_rent', label: 'Offered', sortable: true, align: 'right' },
  { key: 'rent_offered', label: 'Yardi Offered Rent', sortable: true, align: 'right' },
  { key: 'concession_percent', label: '% Concession', sortable: true, align: 'right' },
  { key: 'actions', label: '', width: '60px', align: 'right' }
]

// Columns for Applicant/Future Units Table (History)
const applicantFutureColumns: TableColumn[] = [
  { key: 'unit_name', label: 'Unit', sortable: true, width: '100px', align: 'center' },
  { key: 'status', label: 'Status', sortable: true, width: '120px', align: 'center' },
  { key: 'application_date', label: 'Application Date', sortable: true, align: 'center' },
  { key: 'base_rent', label: 'Base', sortable: true, align: 'right' },
  { key: 'calculated_market_rent', label: 'Market', sortable: true, align: 'right' },
  { key: 'leased_rent', label: 'Leased Rent', sortable: true, align: 'right' },
  { key: 'concession_percent', label: '% Concession', sortable: true, align: 'right' }
]

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

// Modal state (use v-model pattern)
const showPricingModal = ref(false)
const selectedUnit = ref<any>(null)

const showSyncModal = ref(false)

const openIndividualOverride = (unit: any) => {
  console.log('[openIndividualOverride] Opening modal for unit:', unit)
  selectedUnit.value = unit
  showPricingModal.value = true
}

const handleModalClose = async (saved: boolean) => {
  console.log('[handleModalClose] Closing modal, saved:', saved)
  showPricingModal.value = false
  if (saved) {
    await refreshUnits()
    await refreshNuxtData('floor-plan-summaries')
  }
  // Clear after closing
  setTimeout(() => {
    selectedUnit.value = null
  }, 300) // Wait for modal close animation
}

const handleExportSync = () => {
    if (!units.value || !activeFloorPlan.value) return
    showSyncModal.value = true
}

const handleSyncModalClose = () => {
    showSyncModal.value = false
}
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex justify-between items-center">
      <div class="flex items-center gap-4">
        <UButton
          icon="i-heroicons-arrow-left"
          variant="ghost"
          color="neutral"
          to="/office/availabilities"
        />
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Floor Plan Pricing Manager</h1>
      </div>

      <div v-if="activeFloorPlan">
        <UButton
            label="Export Sync"
            variant="outline"
            icon="i-heroicons-arrow-down-tray"
            @click="handleExportSync"
        />
      </div>
    </div>

    <!-- Floor Plan Tabs -->
    <div 
      v-if="floorPlanSummaries && floorPlanSummaries.length" 
      class="flex flex-wrap gap-2 mb-8 p-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800"
    >
      <UButton
        v-for="fp in floorPlanSummaries"
        :key="fp.floor_plan_id"
        :variant="selectedFloorPlanId === fp.floor_plan_id ? 'solid' : 'ghost'"
        :color="selectedFloorPlanId === fp.floor_plan_id ? 'primary' : 'neutral'"
        size="sm"
        @click="selectFloorPlan(fp.floor_plan_id)"
      >
        <div class="flex flex-col items-start px-2 py-1">
            <span class="text-[10px] font-bold uppercase tracking-widest opacity-70">{{ fp.floor_plan_code }}</span>
            <span class="font-bold">{{ fp.floor_plan_name }}</span>
            <span class="text-[10px] opacity-60">{{ fp.available_units }} Avail / {{ fp.total_units }} Units</span>
        </div>
      </UButton>
    </div>

    <!-- Metrics Cards -->
    <div v-if="activeFloorPlan" class="space-y-6 mb-8">
      <!-- All Units Metrics -->
      <div>
        <div class="mb-3 flex items-center gap-2">
          <h3 class="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">All Units ({{ activeFloorPlan.total_units }})</h3>
          <UTooltip text="Averages across all units in this floor plan, regardless of status">
            <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-gray-400" />
          </UTooltip>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UCard>
            <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Avg Market Rent</p>
            <p class="text-xl font-black">{{ formatCurrency(activeFloorPlan.avg_market_rent) }}</p>
          </UCard>
          <UCard>
            <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Avg Offered Rent</p>
            <p class="text-xl font-black text-primary-600">{{ formatCurrency(activeFloorPlan.avg_offered_rent) }}</p>
          </UCard>
          <UCard>
            <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Concessions</p>
            <p
              class="text-xl font-black"
              :class="activeFloorPlan.rent_discrepancy > 0 ? 'text-green-600' : activeFloorPlan.rent_discrepancy < 0 ? 'text-red-600' : ''"
            >
              {{ activeFloorPlan.rent_discrepancy > 0 ? '+' : '' }}{{ formatCurrency(activeFloorPlan.rent_discrepancy) }}
              <span class="text-xs font-bold opacity-70 ml-1">
                ({{ activeFloorPlan.avg_market_rent > 0 ? ((activeFloorPlan.rent_discrepancy / activeFloorPlan.avg_market_rent) * 100).toFixed(1) : '0.0' }}%)
              </span>
            </p>
          </UCard>
        </div>
      </div>

      <!-- Available Units Metrics -->
      <div v-if="availableUnits.length > 0">
        <div class="mb-3 flex items-center gap-2">
          <h3 class="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Available Units ({{ availableUnitsMetrics.count }})</h3>
          <UTooltip text="Averages for units currently available for pricing adjustments">
            <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-gray-400" />
          </UTooltip>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UCard>
            <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Avg Market Rent</p>
            <p class="text-xl font-black">{{ formatCurrency(availableUnitsMetrics.avgMarket) }}</p>
          </UCard>
          <UCard>
            <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Avg Offered Rent</p>
            <p class="text-xl font-black text-primary-600">{{ formatCurrency(availableUnitsMetrics.avgOffered) }}</p>
          </UCard>
          <UCard>
            <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Concessions</p>
            <p
              class="text-xl font-black"
              :class="availableUnitsMetrics.concessions > 0 ? 'text-green-600' : availableUnitsMetrics.concessions < 0 ? 'text-red-600' : ''"
            >
              {{ availableUnitsMetrics.concessions > 0 ? '+' : '' }}{{ formatCurrency(availableUnitsMetrics.concessions) }}
              <span class="text-xs font-bold opacity-70 ml-1">
                ({{ availableUnitsMetrics.concessionPct.toFixed(1) }}%)
              </span>
            </p>
          </UCard>
        </div>
      </div>
    </div>

    <!-- Available Units Table -->
    <div v-if="activeFloorPlan" class="mb-12">
      <div class="mb-4 flex items-center gap-3">
        <h2 class="text-lg font-black text-gray-900 dark:text-white">Available Units</h2>
        <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">{{ availableUnits.length }} units</span>
      </div>

      <GenericDataTable
        :columns="availableColumns"
        :data="availableUnits"
        :loading="unitsStatus === 'pending'"
        row-key="unit_id"
        striped
      >
          <!-- Unit Badge -->
          <template #cell-unit_name="{ value }">
              <span class="px-2 py-1 bg-gray-900 text-white rounded text-[10px] font-black min-w-[50px] inline-block text-center shadow-sm">
                  {{ value }}
              </span>
          </template>

          <!-- Sync Alerts -->
          <template #cell-sync_alerts="{ row }">
              <CellsAlertCell
                :alerts="row.sync_alerts"
                :info-alerts="row.sync_info"
                :status="row.sync_status"
              />
          </template>

          <!-- Rent Columns -->
          <template #cell-base_rent="{ value }">
              <span class="text-sm text-gray-400 font-mono">{{ formatCurrency(value) }}</span>
          </template>

          <template #cell-calculated_market_rent="{ value }">
              <span class="text-sm font-bold text-gray-700 dark:text-gray-300 font-mono">{{ formatCurrency(value) }}</span>
          </template>

          <template #cell-calculated_offered_rent="{ value }">
              <span class="text-sm font-black text-primary-600 font-mono">{{ formatCurrency(value) }}</span>
          </template>

          <template #cell-rent_offered="{ value }">
              <span class="text-sm font-black text-gray-950 dark:text-white font-mono">{{ formatCurrency(Number(value)) }}</span>
          </template>

          <!-- Concession Percentage -->
          <template #cell-concession_percent="{ row }">
              <span
                  class="text-sm font-bold font-mono"
                  :class="(row.calculated_offered_rent - row.calculated_market_rent) > 0 ? 'text-green-600' : (row.calculated_offered_rent - row.calculated_market_rent) < 0 ? 'text-red-600' : 'text-gray-500'"
              >
                  {{ row.calculated_market_rent > 0 ? (((row.calculated_offered_rent - row.calculated_market_rent) / row.calculated_market_rent) * 100).toFixed(1) : '0.0' }}%
              </span>
          </template>

          <!-- Individual Action -->
          <template #cell-actions="{ row }">
              <UButton
                  icon="i-heroicons-pencil-square"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="openIndividualOverride(row)"
              />
          </template>
      </GenericDataTable>
    </div>

    <!-- Applicant/Future Units Table (History) -->
    <div v-if="activeFloorPlan" class="mb-8">
      <div class="mb-4 flex items-center gap-3">
        <h2 class="text-lg font-black text-gray-900 dark:text-white">Applicant/Future Units</h2>
        <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">{{ applicantFutureUnits.length }} units (Read-Only)</span>
      </div>

      <GenericDataTable
        :columns="applicantFutureColumns"
        :data="applicantFutureUnits"
        :loading="unitsStatus === 'pending'"
        row-key="unit_id"
        striped
      >
          <!-- Unit Badge -->
          <template #cell-unit_name="{ value }">
              <span class="px-2 py-1 bg-gray-900 text-white rounded text-[10px] font-black min-w-[50px] inline-block text-center shadow-sm">
                  {{ value }}
              </span>
          </template>

          <!-- Status Badge -->
          <template #cell-status="{ value }">
              <CellsBadgeCell
                  :text="value"
                  :color="value === 'Applied' ? 'warning' : value === 'Leased' ? 'success' : 'neutral'"
                  variant="subtle"
              />
          </template>

          <!-- Application Date -->
          <template #cell-application_date="{ value }">
              <span class="text-sm text-gray-600 dark:text-gray-400">
                  {{ value ? new Date(value).toLocaleDateString() : '-' }}
              </span>
          </template>

          <template #cell-base_rent="{ value }">
              <span class="text-sm text-gray-400 font-mono">{{ formatCurrency(value) }}</span>
          </template>

          <template #cell-concession_percent="{ row }">
              <span
                  class="text-sm font-bold font-mono"
                  :class="(row.leased_rent - row.calculated_market_rent) > 0 ? 'text-green-600' : (row.leased_rent - row.calculated_market_rent) < 0 ? 'text-red-600' : 'text-gray-500'"
              >
                  {{ row.calculated_market_rent > 0 ? (((row.leased_rent - row.calculated_market_rent) / row.calculated_market_rent) * 100).toFixed(1) : '0.0' }}%
              </span>
          </template>

          <template #cell-calculated_market_rent="{ value }">
              <span class="text-sm font-bold text-gray-700 dark:text-gray-300 font-mono">{{ formatCurrency(value) }}</span>
          </template>

          <!-- Leased Rent -->
          <template #cell-leased_rent="{ value }">
              <span class="text-sm font-black text-green-700 dark:text-green-500 font-mono">{{ formatCurrency(value) }}</span>
          </template>
      </GenericDataTable>
    </div>

    <div v-if="summaryStatus !== 'pending' && (!floorPlanSummaries || floorPlanSummaries.length === 0) && !activeFloorPlan" class="py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
        <UIcon name="i-heroicons-building-office-2" class="text-4xl text-gray-300 mb-2" />
        <p v-if="!activeProperty" class="text-gray-500 font-medium">Please select a property from the sidebar.</p>
        <p v-else class="text-gray-500 font-medium">No floor plans found for this property.</p>
    </div>

    <!-- Pricing Modal -->
    <SimpleModal
      v-model="showPricingModal"
      :title="selectedUnit ? `Unit ${selectedUnit.unit_name} Pricing Override` : 'Unit Pricing'"
      width="max-w-7xl"
    >
      <AmenityAdjustmentModal
        v-if="selectedUnit"
        :unit="selectedUnit"
        :on-close="handleModalClose"
      />
    </SimpleModal>

    <!-- Sync Discrepancies Modal -->
    <SimpleModal
      v-model="showSyncModal"
      title="Sync Discrepancies Report"
      width="max-w-4xl"
    >
      <SyncDiscrepanciesModal
        v-if="showSyncModal && units && activeFloorPlan"
        :units="units"
        :floor-plan-name="activeFloorPlan.floor_plan_name || activeFloorPlan.floor_plan_code"
        :on-close="handleSyncModalClose"
      />
    </SimpleModal>
  </div>
</template>
