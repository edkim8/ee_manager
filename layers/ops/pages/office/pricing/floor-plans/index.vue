<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePropertyState } from '../../../../../base/composables/usePropertyState'
import { useSupabaseClient, useAsyncData, navigateTo, definePageMeta, useRoute, useRouter, refreshNuxtData } from '#imports'
import type { TableColumn } from '../../../../../table/types'
import SimpleModal from '../../../../../base/components/SimpleModal.vue'
import AmenityAdjustmentModal from '../../../../components/modals/AmenityAdjustmentModal.vue'
import SyncDiscrepanciesModal from '../../../../components/modals/SyncDiscrepanciesModal.vue'

// ===== EXCEL-BASED TABLE CONFIGURATION =====
import { allColumns as availablesColumnsRaw, roleColumns as availablesRoleColumns } from '../../../../../../configs/table-configs/availabilities_availables-complete.generated'
import { allColumns as applicantsColumnsRaw, roleColumns as applicantsRoleColumns } from '../../../../../../configs/table-configs/availabilities_applicants_futures-complete.generated'
import { filterColumnsByAccess } from '../../../../../table/composables/useTableColumns'

definePageMeta({
  layout: 'dashboard'
})

const supabase = useSupabaseClient()
const { activeProperty, userContext } = usePropertyState()
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
  return (route.query.floor_plan_id as string) || firstPlan?.floor_plan_id || null
})

// Fallback: If URL has floor_plan_id but summaries are empty, fetch directly
const { data: fallbackFloorPlan } = await useAsyncData(
  () => `fallback-fp-${route.query.floor_plan_id}`,
  async () => {
    const urlFloorPlanId = route.query.floor_plan_id as string
    if (!urlFloorPlanId) return null
    if (floorPlanSummaries.value && floorPlanSummaries.value.length > 0) return null


    const { data, error } = await supabase
      .from('view_floor_plan_pricing_summary')
      .select('*')
      .eq('floor_plan_id', urlFloorPlanId)
      .single()

    if (error) {
      console.error('[DEBUG] Fallback floor plan error:', error)
      return null
    }


    // If we got a floor plan, set the active property from it
    if (data && data.property_code && !activeProperty.value) {
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

  // Use fallback if summaries don't have the floor plan
  return found || fallbackFloorPlan.value
})

const selectFloorPlan = (id: string) => {
  router.push({ query: { ...route.query, floor_plan_id: id } })
}

// 3. Fetch Units for the selected Floor Plan
const { data: units, status: unitsStatus, refresh: refreshUnits } = await useAsyncData(`fp-units-${selectedFloorPlanId.value}`, async () => {

    if (!selectedFloorPlanId.value) {
        return []
    }

    // 1. Fetch Pipeline data (to get status, rent_offered from Yardi)
    const { data: pipelineData, error: pipelineError } = await supabase
        .from('view_leasing_pipeline')
        .select('*, market_base_rent:calculated_market_rent')
        .eq('floor_plan_id', selectedFloorPlanId.value)
        .order('unit_name')


    if (pipelineError) {
        console.error('[DEBUG] Pipeline data error:', pipelineError)
        throw pipelineError
    }
    if (!pipelineData || pipelineData.length === 0) {
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

// Split units into Available and Applicant/Future
const availableUnits = computed(() => {
    const filtered = units.value?.filter((u: any) => u.status === 'Available') || []
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

// Columns for Available Units Table (Dynamic from Excel)
const availableColumns = computed(() => {
    return filterColumnsByAccess(availablesColumnsRaw, {
        userRole: activeProperty.value ? userContext.value?.access?.property_roles?.[activeProperty.value] : null,
        isSuperAdmin: !!userContext.value?.access?.is_super_admin
    })
})

// Columns for Applicant/Future Units Table (Dynamic from Excel)
const applicantFutureColumns = computed(() => {
    return filterColumnsByAccess(applicantsColumnsRaw, {
        userRole: activeProperty.value ? userContext.value?.access?.property_roles?.[activeProperty.value] : null,
        isSuperAdmin: !!userContext.value?.access?.is_super_admin
    })
})

// ===== DYNAMIC CONCESSION COLORING =====

/**
 * Calculate concession stats (min/max) for a unit list
 */
const getConcessionStats = (data: any[]) => {
  if (!data || data.length === 0) return { min: 0, max: 0 }
  const values = data.map(u => 
    Math.abs(u.market_base_rent > 0 ? ((u.calculated_offered_rent - u.market_base_rent) / u.market_base_rent) : 0)
  )
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  }
}

const availableConcessionStats = computed(() => getConcessionStats(availableUnits.value))
const applicantsConcessionStats = computed(() => getConcessionStats(applicantFutureUnits.value))

/**
 * Get dynamic color class based on where a value sits in the current range
 * RED: Top 15% (highest concessions)
 * GREEN: Bottom 15% (lowest concessions)
 */
const getDynamicConcessionColor = (value: number, stats: { min: number, max: number }) => {
    const { min, max } = stats
    if (max === 0 || min === max) return 'text-gray-900 dark:text-white'
    
    const range = max - min
    if (value >= min + (range * 0.85)) return 'text-red-600 dark:text-red-400 font-bold'
    if (value <= min + (range * 0.15)) return 'text-green-600 dark:text-green-400 font-bold'
    
    return 'text-gray-900 dark:text-white'
}


// Modal state (use v-model pattern)
const showPricingModal = ref(false)
const selectedUnit = ref<any>(null)

const showSyncModal = ref(false)

const openIndividualOverride = (unit: any) => {
  selectedUnit.value = unit
  showPricingModal.value = true
}

const handleModalClose = async (saved: boolean) => {
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
          <UCard class="relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 border-white/5 dark:border-white/10 shadow-xl rounded-2xl">
            <div class="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-transparent pointer-events-none" />
            <p class="relative z-10 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg Market Rent</p>
            <CellsCurrencyCell :value="activeFloorPlan.avg_market_rent" class="relative z-10 text-2xl font-black" />
          </UCard>
          <UCard class="relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 border-primary-500/20 shadow-xl shadow-primary-500/5 rounded-2xl bg-primary-50/50 dark:bg-primary-950/20">
            <div class="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent pointer-events-none" />
            <p class="relative z-10 text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-1">Avg Offered Rent</p>
            <CellsCurrencyCell :value="activeFloorPlan.avg_offered_rent" class="relative z-10 text-2xl font-black text-primary-600 dark:text-primary-400" />
          </UCard>
          <UCard class="relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 border-white/5 dark:border-white/10 shadow-xl rounded-2xl">
            <div class="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-transparent pointer-events-none" />
            <p class="relative z-10 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Concessions</p>
            <div class="relative z-10 flex items-baseline gap-2">
              <CellsCurrencyCell 
                :value="activeFloorPlan.rent_discrepancy" 
                :is-error="activeFloorPlan.rent_discrepancy < 0"
                class="text-2xl font-black"
                :class="activeFloorPlan.rent_discrepancy > 0 ? 'text-green-600' : ''"
              />
              <span class="text-xs font-bold opacity-70" :class="activeFloorPlan.rent_discrepancy > 0 ? 'text-green-600' : activeFloorPlan.rent_discrepancy < 0 ? 'text-red-600' : ''">
                ({{ activeFloorPlan.avg_market_rent > 0 ? ((activeFloorPlan.rent_discrepancy / activeFloorPlan.avg_market_rent) * 100).toFixed(1) : '0.0' }}%)
              </span>
            </div>
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
          <UCard class="relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 border-white/5 dark:border-white/10 shadow-xl rounded-2xl">
            <div class="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-transparent pointer-events-none" />
            <p class="relative z-10 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg Market Rent</p>
            <CellsCurrencyCell :value="availableUnitsMetrics.avgMarket" class="relative z-10 text-2xl font-black" />
          </UCard>
          <UCard class="relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 border-primary-500/20 shadow-xl shadow-primary-500/5 rounded-2xl bg-primary-50/50 dark:bg-primary-950/20">
            <div class="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent pointer-events-none" />
            <p class="relative z-10 text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-1">Avg Offered Rent</p>
            <CellsCurrencyCell :value="availableUnitsMetrics.avgOffered" class="relative z-10 text-2xl font-black text-primary-600 dark:text-primary-400" />
          </UCard>
          <UCard class="relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 border-white/5 dark:border-white/10 shadow-xl rounded-2xl">
            <div class="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-transparent pointer-events-none" />
            <p class="relative z-10 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Concessions</p>
            <div class="relative z-10 flex items-baseline gap-2">
              <CellsCurrencyCell 
                :value="availableUnitsMetrics.concessions" 
                :is-error="availableUnitsMetrics.concessions < 0"
                class="text-2xl font-black"
                :class="availableUnitsMetrics.concessions > 0 ? 'text-green-600' : ''"
              />
              <span class="text-xs font-bold opacity-70" :class="availableUnitsMetrics.concessions > 0 ? 'text-green-600' : availableUnitsMetrics.concessions < 0 ? 'text-red-600' : ''">
                ({{ availableUnitsMetrics.concessionPct.toFixed(1) }}%)
              </span>
            </div>
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

          <!-- Rent Columns (Mapped to Excel Keys) -->
          <template #cell-market_base_rent="{ value }">
              <CellsCurrencyCell :value="value" class="font-bold text-gray-700 dark:text-gray-300 font-mono" />
          </template>
          <template #cell-rent_offered="{ value }">
              <CellsCurrencyCell :value="Number(value)" class="font-black text-primary-600 font-mono" />
          </template>

          <!-- Amenities -->
          <template #cell-temp_amenities_total="{ value }">
              <CellsCurrencyCell :value="Number(value)" class="text-gray-500 font-mono" />
          </template>

          <!-- Concession Percentage (Mapped to Excel Key) -->
          <!-- Concession Percentage (Dynamic Colors) -->
          <template #cell-concession_total_pct="{ row }">
              <CellsPercentCell 
                :value="Math.abs(row.market_base_rent > 0 ? ((row.calculated_offered_rent - row.market_base_rent) / row.market_base_rent) : 0)" 
                :color-class="getDynamicConcessionColor(Math.abs(row.market_base_rent > 0 ? ((row.calculated_offered_rent - row.market_base_rent) / row.market_base_rent) : 0), availableConcessionStats)"
                class="font-mono"
              />
          </template>

          <template #cell-concession_display_calc="{ row }">
             <span :class="['font-mono text-xs', getDynamicConcessionColor(Math.abs(row.market_base_rent > 0 ? ((row.calculated_offered_rent - row.market_base_rent) / row.market_base_rent) : 0), availableConcessionStats)]">
                {{ row.concession_display_calc }}
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

          <!-- Rent Columns (Mapped to Excel Keys) -->
          <template #cell-market_base_rent="{ value }">
              <CellsCurrencyCell :value="value" class="font-bold text-gray-700 dark:text-gray-300 font-mono" />
          </template>

          <template #cell-lease_rent_amount="{ value }">
              <CellsCurrencyCell :value="value" class="font-black text-green-700 dark:text-green-500 font-mono" />
          </template>

          <!-- Amenities -->
          <template #cell-temp_amenities_total="{ value }">
              <CellsCurrencyCell :value="Number(value)" class="text-gray-500 font-mono" />
          </template>

          <!-- Concession Percentage (Mapped to Excel Key) -->
          <!-- Concession Percentage (Dynamic Colors) -->
          <template #cell-concession_total_pct="{ row }">
              <CellsPercentCell 
                :value="Math.abs(row.market_base_rent > 0 ? ((row.calculated_offered_rent - row.market_base_rent) / row.market_base_rent) : 0)" 
                :color-class="getDynamicConcessionColor(Math.abs(row.market_base_rent > 0 ? ((row.calculated_offered_rent - row.market_base_rent) / row.market_base_rent) : 0), applicantsConcessionStats)"
                class="font-mono"
              />
          </template>

          <template #cell-concession_display_calc="{ row }">
             <span :class="['font-mono text-xs', getDynamicConcessionColor(Math.abs(row.market_base_rent > 0 ? ((row.calculated_offered_rent - row.market_base_rent) / row.market_base_rent) : 0), applicantsConcessionStats)]">
                {{ row.concession_display_calc }}
             </span>
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

    <!-- Context Helper (Lazy Loaded) -->
    <LazyContextHelper 
      title="Floor Plan Pricing Manager" 
      description="Unit Inventory & Dynamic Pricing Logic"
    >
      <div class="space-y-4 text-sm leading-relaxed">
        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Pricing Components</h3>
          <p>
            Understanding the calculation stack for unit pricing:
          </p>
          <ul class="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Base Rent:</strong> The baseline contractual rent defined at the floor plan level.</li>
            <li><strong>Market Rent:</strong> The sum of Base Rent and all active individual unit amenities (e.g., floor levels, views, renovations).</li>
            <li><strong class="text-primary-600">Offered Rent:</strong> The final amount displayed to applicants, including any active concessions or strategic overrides.</li>
          </ul>
        </section>

        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Sync Monitoring</h3>
          <div class="space-y-2">
            <p>
              The <strong>Sync</strong> column provides a real-time audit between the App database and Yardi:
            </p>
            <ul class="list-disc pl-5 space-y-1">
              <li><strong class="text-red-600 uppercase italic">Rent Mismatch:</strong> Indicates the Yardi "Offered Rent" does not match the App's calculated total.</li>
              <li><strong class="text-orange-600 uppercase italic">Amenity Discrepancy:</strong> Flags units where Yardi's listed amenities differ from our database configuration.</li>
            </ul>
          </div>
          <div class="mt-2 bg-purple-50 dark:bg-purple-900/20 p-2 rounded border border-purple-100 dark:border-purple-800 text-xs text-purple-800 dark:text-purple-300">
            <strong>Pro Tip:</strong> Use the <strong>Export Sync</strong> button in the header to view a detailed report of all discrepancies across the selected floor plan.
          </div>
        </section>

        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Metric Definitions</h3>
          <p>
            Dashboards are split into two views to facilitate different management strategies:
          </p>
          <ul class="list-disc pl-5 mt-2 space-y-1">
            <li><strong>All Units:</strong> Historical and current benchmarks across the entire unit inventory.</li>
            <li><strong>Available Units:</strong> Critical averages specifically for the units currently seeking new applicants, which are most sensitive to pricing adjustments.</li>
          </ul>
        </section>

        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Manual Overrides</h3>
          <p>
            Click the <UIcon name="i-heroicons-pencil-square" class="inline-block w-3 h-3 align-text-bottom" /> icon on any available unit row to apply granular amenity adjustments or strategic pricing overrides.
          </p>
        </section>
      </div>
    </LazyContextHelper>
  </div>
</template>
