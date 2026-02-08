<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSupabaseClient, useAsyncData, definePageMeta } from '#imports'
import ImageModal from '../../../../base/components/modals/ImageModal.vue'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const availabilityId = route.params.id as string

const showImageModal = ref(false)

// Fetch Availability details
const { data: availability, status, error } = await useAsyncData(`availability-${availabilityId}`, async () => {
  const { data, error } = await supabase
    .from('view_table_availabilities')
    .select('*')
    .eq('id', availabilityId)
    .single()

  if (error) throw error
  return data
})

// Fetch Applications for this unit (Leasing Pipeline)
const { data: applications, status: appStatus } = await useAsyncData(`availability-apps-${availabilityId}`, async () => {
  if (!availability.value?.unit_id) return []
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('unit_id', availability.value.unit_id)
    .order('application_date', { ascending: false })
  
  if (error) throw error
  return data
})

// --- Pricing Engine Integration ---
import { usePricingEngine } from '../../../utils/pricing-engine'
const { getUnitPricingBreakdown } = usePricingEngine()
const { data: pricingBreakdown } = await useAsyncData(`avail-pricing-${availabilityId}`, async () => {
  if (!availability.value?.unit_id) return null
  return getUnitPricingBreakdown(availability.value.unit_id)
}, { watch: [availability] })

const goBack = () => {
  router.push('/office/availabilities')
}

// Map status to colors consistent with V2 patterns
const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'vacant unrented': return 'error'
    case 'vacant rented': return 'primary'
    case 'occupied unrented': return 'warning'
    case 'occupied rented': return 'neutral'
    default: return 'neutral'
  }
}

const getAppStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'approved': return 'primary'
    case 'pending': return 'warning'
    case 'denied': return 'error'
    case 'canceled': return 'neutral'
    default: return 'neutral'
  }
}

const imageUrl = computed(() => {
  const path = availability.value?.floor_plan_image_url
  if (!path) return null
  if (!path.startsWith('/') && !path.startsWith('http')) {
    return `/${path}`
  }
  return path
})

// --- Concession State ---
const { data: concessionData, refresh: refreshConcession } = await useAsyncData(`avail-concession-${availabilityId}`, async () => {
  if (!availability.value?.unit_id) return null
  const { data } = await supabase
    .from('view_concession_analysis')
    .select('*')
    .eq('unit_id', availability.value.unit_id)
    .single()
  return data
}, { watch: [availability] })

const concessionUpfront = ref<number>(0)
const concessionFreeDays = ref<number>(0)
const isSavingConcession = ref(false)

// Initialize concession values when data loads
watch(concessionData, (data) => {
  if (data) {
    concessionUpfront.value = data.concession_upfront_amount || 0
    concessionFreeDays.value = data.concession_free_rent_days || 0
  }
}, { immediate: true })

// Calculate concession percentages dynamically
const concessionPercentages = computed(() => {
  if (!availability.value?.rent_market || availability.value.rent_market === 0) {
    return { amenityPct: 0, totalPct: 0, display: '0%/0%' }
  }

  const rentMarket = availability.value.rent_market
  const amenityMonthly = concessionData.value?.amenity_concession_monthly || 0
  const upfrontMonthly = concessionUpfront.value / 12
  const freeRentMonthly = rentMarket * (concessionFreeDays.value / 365)

  const amenityPct = Math.round((amenityMonthly / rentMarket) * 100 * 10) / 10
  const totalPct = Math.round(((amenityMonthly + upfrontMonthly + freeRentMonthly) / rentMarket) * 100 * 10) / 10

  return {
    amenityPct,
    totalPct,
    display: `${amenityPct}%/${totalPct}%`
  }
})

// Helper function to convert days to weeks/months for display
const formatFreeDays = (days: number) => {
  if (days === 0) return '0 days'
  if (days % 30 === 0) return `${days / 30} month${days / 30 !== 1 ? 's' : ''}`
  if (days % 7 === 0) return `${days / 7} week${days / 7 !== 1 ? 's' : ''}`
  return `${days} day${days !== 1 ? 's' : ''}`
}

const saveConcessions = async () => {
  if (!availability.value?.unit_id) return

  isSavingConcession.value = true
  try {
    const { error } = await supabase
      .from('availabilities')
      .update({
        concession_upfront_amount: concessionUpfront.value,
        concession_free_rent_days: concessionFreeDays.value
      })
      .eq('unit_id', availability.value.unit_id)

    if (error) throw error

    await refreshConcession()
    // Show success notification (you can add toast notification here)
  } catch (err) {
    console.error('Error saving concessions:', err)
    // Show error notification
  } finally {
    isSavingConcession.value = false
  }
}

// --- Solver State ---
const { solveForTargetRent } = usePricingEngine()
const targetRentInput = ref<number | null>(null)
const isSolving = ref(false)
const solverResult = ref<any>(null)

const handleSolve = async () => {
  if (!targetRentInput.value || !availability.value?.unit_id || !availability.value?.property_code) return

  isSolving.value = true
  solverResult.value = await solveForTargetRent(
    availability.value.unit_id,
    availability.value.property_code,
    targetRentInput.value
  )
  isSolving.value = false
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Breadcrumbs -->
    <nav class="flex mb-6 text-sm font-medium text-gray-600 dark:text-gray-400" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink to="/office/availabilities" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Availabilities</NuxtLink>
        </li>
        <li v-if="availability">
          <div class="flex items-center">
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span class="ml-1 md:ml-2 text-gray-900 dark:text-gray-100 font-bold">Unit {{ availability.unit_name }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Content Handling -->
    <div v-if="status === 'pending'" class="p-12 space-y-8">
      <USkeleton class="h-12 w-1/3" />
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <USkeleton class="h-64 lg:col-span-2" />
        <USkeleton class="h-64" />
      </div>
    </div>

    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/10 p-6 rounded-xl border border-red-200 dark:border-red-900/50 text-center">
      <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 class="text-lg font-bold text-red-700 dark:text-red-400">Error loading availability</h2>
      <p class="text-sm text-red-600 dark:text-red-500 mb-6">{{ error.message }}</p>
      <UButton color="error" @click="goBack">Back to List</UButton>
    </div>

    <div v-else-if="availability" class="space-y-8">
      <div class="mb-4">
        <UButton
          icon="i-heroicons-arrow-left"
          label="Back to Availabilities"
          color="neutral"
          variant="ghost"
          @click="goBack"
          class="-ml-2.5 dark:text-gray-400 dark:hover:text-white"
        />
      </div>

      <div class="border-b border-gray-200 dark:border-gray-800 pb-8 flex justify-between items-end">
        <div>
          <div class="flex items-center gap-3 mb-3">
             <UBadge size="lg" :color="getStatusColor(availability.status)" variant="subtle" class="font-bold uppercase tracking-wider">
              {{ availability.status }}
            </UBadge>
            <span class="text-gray-400 dark:text-gray-600 font-mono text-sm tracking-widest">{{ availability.property_code }}</span>
          </div>
          <h1 class="text-5xl font-black text-gray-900 dark:text-white tracking-tighter mb-2">
            Unit {{ availability.unit_name }}
          </h1>
          <p class="text-xl text-gray-600 dark:text-gray-400 font-medium">
            {{ availability.building_name }} &middot; {{ availability.floor_plan_name }}
          </p>
        </div>
        
        <div class="text-right">
          <p class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Effective Rent</p>
          <p class="text-4xl font-black text-primary-600 dark:text-primary-400 tracking-tighter">
            ${{ availability.rent_offered?.toLocaleString() }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-8">
          <!-- Summary Metrics -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="bg-white dark:bg-gray-900/80 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm text-center group transition-transform hover:-translate-y-1">
              <p class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Vacancy</p>
              <p class="text-3xl font-black text-gray-900 dark:text-white leading-none">{{ availability.vacant_days }}d</p>
            </div>
             <div class="bg-white dark:bg-gray-900/80 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm text-center group transition-transform hover:-translate-y-1">
              <p class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Turnover</p>
              <p class="text-3xl font-black text-gray-900 dark:text-white leading-none">{{ availability.turnover_days }}d</p>
            </div>
             <div class="bg-white dark:bg-gray-900/80 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm text-center group transition-transform hover:-translate-y-1">
              <p class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Area (SF)</p>
              <p class="text-3xl font-black text-gray-900 dark:text-white leading-none">{{ availability.sf?.toLocaleString() }}</p>
            </div>
             <div class="bg-white dark:bg-gray-900/80 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm text-center group transition-transform hover:-translate-y-1">
              <p class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Available</p>
              <p class="text-xl font-black text-primary-600 dark:text-primary-400 leading-none mt-1">
                {{ availability.available_date ? new Date(availability.available_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric'}) : 'Ready' }}
              </p>
            </div>
          </div>

          <!-- Leasing Pipeline Progress -->
          <div class="bg-white dark:bg-gray-900/80 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
             <div class="flex items-center justify-between mb-8">
                <h3 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <UIcon name="i-heroicons-funnel" class="text-primary-500" />
                  Leasing Pipeline
                </h3>
                <UBadge v-if="availability.screening_result" :color="availability.screening_result?.toLowerCase().includes('pass') ? 'primary' : 'warning'" variant="soft" class="font-bold">
                  Latest Result: {{ availability.screening_result }}
                </UBadge>
             </div>
             
             <div v-if="applications?.length" class="space-y-6">
                <div v-for="(app, idx) in applications" :key="app.id" class="relative pl-8 pb-6 border-l-2 border-gray-100 dark:border-gray-800 last:pb-0">
                   <!-- Timeline Bullet -->
                   <div class="absolute left-[-9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900" :class="idx === 0 ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-700'"></div>
                   
                   <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 group transition-colors hover:border-primary-500/50">
                      <div>
                         <p class="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {{ app.applicant_name }}
                            <UBadge size="xs" :color="getAppStatusColor(app.status)" variant="soft">{{ app.status }}</UBadge>
                         </p>
                         <p class="text-xs text-gray-500 mt-1">Applied: {{ new Date(app.application_date).toLocaleDateString() }} &middot; Agent: {{ app.agent || 'Not assigned' }}</p>
                      </div>
                      <div v-if="app.is_overdue" class="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold">
                         <UIcon name="i-heroicons-clock" class="w-4 h-4" />
                         Overdue Task
                      </div>
                   </div>
                </div>
             </div>
             <div v-else class="text-center py-12 bg-gray-50/50 dark:bg-gray-950/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                <UIcon name="i-heroicons-user-plus" class="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <p class="text-gray-500 dark:text-gray-400 font-medium">No active applications in the pipeline.</p>
             </div>
          </div>

          <!-- Unit Layout / Floor Plan -->
          <div v-if="imageUrl" class="bg-white dark:bg-gray-950 p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden group cursor-zoom-in" @click="showImageModal = true">
            <div class="aspect-video relative rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900/30 flex items-center justify-center p-8">
                <NuxtImg 
                :src="imageUrl" 
                class="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-700" 
                :alt="availability.floor_plan_name"
                placeholder 
                />
                <div class="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-gray-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
                   <div>
                      <p class="text-white text-lg font-black tracking-tight">{{ availability.floor_plan_name }}</p>
                      <p class="text-white/60 text-xs font-bold uppercase tracking-widest">Layout View</p>
                   </div>
                   <UIcon name="i-heroicons-magnifying-glass-plus" class="text-white w-8 h-8" />
                </div>
            </div>
          </div>
        </div>

        <!-- Sidebar / Operational Actions -->
        <div class="space-y-6">
          <div class="bg-gray-900 dark:bg-gray-800/80 rounded-3xl p-8 text-white shadow-xl shadow-gray-900/10">
            <h4 class="text-xs font-black uppercase tracking-widest opacity-60 mb-6 font-mono text-primary-400">Inventory Meta</h4>
            <div class="space-y-4 text-sm font-medium">
              <div class="flex justify-between items-center py-2 border-b border-white/5 opacity-80">
                <span>Unit ID</span>
                <span class="font-mono text-[10px]">{{ availability.unit_id?.slice(0, 8) }}...</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-white/5 opacity-80">
                <span>FP ID</span>
                <span class="font-mono text-[10px]">{{ availability.floor_plan_id?.slice(0, 8) }}...</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-white/5 opacity-80">
                <span>Agent</span>
                <span>{{ availability.leasing_agent || 'Standard' }}</span>
              </div>
            </div>

            <div class="mt-8 pt-8 space-y-3">
               <h4 class="text-xs font-black uppercase tracking-widest opacity-60 mb-4 font-mono text-primary-400">Navigation</h4>
               <UButton
                  v-if="availability.unit_id"
                  :to="`/assets/units/${availability.unit_id}`"
                  block
                  color="white"
                  variant="ghost"
                  class="justify-start hover:bg-white/10 rounded-xl"
                  icon="i-heroicons-home"
                >
                  View Asset Details
                </UButton>
                <UButton
                  v-if="availability.building_id"
                  :to="`/assets/buildings/${availability.building_id}`"
                  block
                  color="white"
                  variant="ghost"
                  class="justify-start hover:bg-white/10 rounded-xl"
                  icon="i-heroicons-building-office"
                >
                  View Building
                </UButton>
            </div>
            
            <div class="mt-8 pt-8 border-t border-white/10">
              <p class="text-[10px] font-mono opacity-30 leading-relaxed italic">
                Inventory refreshed: {{ new Date().toLocaleDateString() }}<br>
                Source: Yardi Availabilities
              </p>
            </div>
          </div>

          <!-- Pricing & Amenities Breakdown -->
          <div v-if="pricingBreakdown" class="bg-white dark:bg-gray-900/80 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 class="text-lg font-bold mb-4 text-gray-900 dark:text-white">Pricing & Amenities</h3>
            <AmenityPriceList
              :base-rent="pricingBreakdown.baseRent"
              :fixed-amenities="pricingBreakdown.fixedAmenities"
              :market-rent="pricingBreakdown.marketRent"
              :temp-amenities="pricingBreakdown.tempAmenities"
              :offered-rent="pricingBreakdown.offeredRent"
            />
          </div>

          <!-- Lease Concessions -->
          <div class="bg-emerald-50 dark:bg-emerald-900/10 p-8 rounded-3xl border border-emerald-100 dark:border-emerald-800/50">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h4 class="text-xs font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest font-mono">Lease Concessions</h4>
                <p class="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 leading-tight uppercase font-bold">Track upfront deals & free rent</p>
              </div>
              <div class="text-right">
                <p class="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold mb-1">Concession %</p>
                <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {{ concessionPercentages.display }}
                </p>
                <p class="text-[9px] text-emerald-600/60 dark:text-emerald-400/60 uppercase font-bold mt-0.5">
                  C% / A% (Amortized)
                </p>
              </div>
            </div>

            <div class="space-y-4 mb-6">
              <!-- Upfront Concession -->
              <UFormGroup label="Upfront Concession ($)" help="One-time dollar concession (e.g., $500 off first month)">
                <UInput
                  v-model="concessionUpfront"
                  type="number"
                  icon="i-heroicons-currency-dollar"
                  size="lg"
                  placeholder="0"
                  :min="0"
                />
              </UFormGroup>

              <!-- Free Rent Period -->
              <UFormGroup
                label="Free Rent Period (days)"
                :help="`Currently: ${formatFreeDays(concessionFreeDays)} • Quick values: 7 days = 1 week, 14 days = 2 weeks, 30 days = 1 month`"
              >
                <UInput
                  v-model="concessionFreeDays"
                  type="number"
                  icon="i-heroicons-calendar-days"
                  size="lg"
                  placeholder="0"
                  :min="0"
                />
              </UFormGroup>

              <!-- Quick Preset Buttons -->
              <div class="flex flex-wrap gap-2">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="outline"
                  @click="concessionFreeDays = 7"
                >
                  1 Week
                </UButton>
                <UButton
                  size="xs"
                  color="neutral"
                  variant="outline"
                  @click="concessionFreeDays = 14"
                >
                  2 Weeks
                </UButton>
                <UButton
                  size="xs"
                  color="neutral"
                  variant="outline"
                  @click="concessionFreeDays = 30"
                >
                  1 Month
                </UButton>
                <UButton
                  size="xs"
                  color="neutral"
                  variant="outline"
                  @click="concessionFreeDays = 60"
                >
                  2 Months
                </UButton>
              </div>
            </div>

            <!-- Concession Breakdown -->
            <div class="bg-white/50 dark:bg-gray-900/30 p-4 rounded-xl border border-emerald-200/50 dark:border-emerald-800/30 space-y-2 text-sm mb-4">
              <div class="flex justify-between items-center">
                <span class="text-gray-600 dark:text-gray-400">Amenity Concessions (C%)</span>
                <span class="font-bold text-emerald-600 dark:text-emerald-400">{{ concessionPercentages.amenityPct }}%</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600 dark:text-gray-400">Upfront (Monthly Amortized)</span>
                <span class="font-medium text-gray-900 dark:text-white">${{ (concessionUpfront / 12).toFixed(2) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600 dark:text-gray-400">Free Rent (Monthly Value)</span>
                <span class="font-medium text-gray-900 dark:text-white">${{ availability?.rent_market ? ((availability.rent_market * concessionFreeDays / 365)).toFixed(2) : '0.00' }}</span>
              </div>
              <div class="flex justify-between items-center pt-2 border-t border-emerald-200/50 dark:border-emerald-800/30">
                <span class="font-bold text-gray-900 dark:text-white">Total Concessions (A%)</span>
                <span class="font-black text-emerald-600 dark:text-emerald-400">{{ concessionPercentages.totalPct }}%</span>
              </div>
            </div>

            <!-- Save Button -->
            <UButton
              block
              color="emerald"
              variant="solid"
              label="Save Concessions"
              icon="i-heroicons-check-circle"
              size="lg"
              :loading="isSavingConcession"
              @click="saveConcessions"
              class="font-bold rounded-2xl shadow-lg shadow-emerald-500/20"
            />
          </div>

          <!-- Rent Solver Assistant -->
          <div v-if="pricingBreakdown" class="bg-indigo-50 dark:bg-indigo-900/10 p-8 rounded-3xl border border-indigo-100 dark:border-indigo-800/50">
             <h4 class="text-xs font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-4 font-mono">Rent Solver</h4>
             <p class="text-[10px] text-indigo-600 dark:text-indigo-400 mb-6 leading-tight uppercase font-bold">Find best amenities to reach target rent</p>
             
             <div class="space-y-4">
                <UFormGroup label="Target Offered Rent">
                   <UInput v-model="targetRentInput" type="number" icon="i-heroicons-banknotes" size="lg" placeholder="e.g. 2450" />
                </UFormGroup>
                
                <UButton 
                    block 
                    color="indigo" 
                    variant="solid" 
                    label="Calculate Amenities" 
                    icon="i-heroicons-sparkles" 
                    :loading="isSolving"
                    @click="handleSolve"
                />

                <!-- Solver Result -->
                <div v-if="solverResult" class="mt-6 pt-6 border-t border-indigo-200/50 dark:border-indigo-800/50 space-y-3">
                   <div v-if="solverResult.success" class="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold text-xs uppercase">
                      <UIcon name="i-heroicons-check-circle" />
                      Exact Match Found
                   </div>
                   <div v-else class="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase">
                      <UIcon name="i-heroicons-exclamation-circle" />
                      Closest Possible Match
                   </div>

                   <div class="space-y-2">
                      <div v-for="amenity in solverResult.solution" :key="amenity.id" class="flex justify-between items-center text-sm font-medium">
                         <span class="text-gray-700 dark:text-gray-300">{{ amenity.yardi_name }}</span>
                         <span class="text-indigo-600 dark:text-indigo-400">+${{ amenity.amount }}</span>
                      </div>
                      <div v-if="solverResult.remainingGap !== 0" class="flex justify-between items-center text-sm font-black pt-2 border-t border-indigo-200/30">
                         <span class="text-gray-900 dark:text-white">Remaining Gap</span>
                         <span class="text-rose-500">${{ solverResult.remainingGap.toFixed(2) }}</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div class="bg-primary-50 dark:bg-primary-900/10 p-8 rounded-3xl border border-primary-100 dark:border-primary-800/50">
             <h4 class="text-xs font-black text-primary-900 dark:text-primary-400 uppercase tracking-widest mb-6 font-mono">Operations</h4>
             <div class="space-y-4">
                <UButton block color="primary" size="lg" label="Generate Quote" icon="i-heroicons-document-text" class="font-bold rounded-2xl shadow-lg shadow-primary-500/20" />
                <UButton block color="neutral" variant="outline" size="lg" label="Schedule Showing" icon="i-heroicons-calendar-days" class="font-bold rounded-2xl" />
             </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reusable Image Modal -->
    <ImageModal
      v-if="showImageModal"
      v-model="showImageModal"
      :src="imageUrl"
      :alt="availability?.unit_name"
    />
  </div>
</template>
