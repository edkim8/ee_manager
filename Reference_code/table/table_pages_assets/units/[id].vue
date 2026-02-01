<script setup lang="ts">


const route = useRoute()
const router = useRouter()
const unitId = route.params.id as string
const supabase = useSupabaseClient()

const { data: unitData, status, error } = await useAsyncData(`unit-${unitId}`, async () => {
  // Fetch Unit & Floor Plan
  const unitPromise = supabase
    .from('units')
    .select('*, buildings(name), floor_plans(code, marketing_name, bedroom_count, bathroom_count, area_sqft, market_base_rent, primary_image_url)')
    .eq('id', unitId)
    .single()

  // Fetch Amenities (via Join Table)
  const amenitiesPromise = supabase
    .from('unit_amenities')
    .select('amenities(amenity_name, amenity_amount)')
    .eq('unit_id', unitId)
    .eq('is_active', true)

  const [unitResult, amenitiesResult] = await Promise.all([unitPromise, amenitiesPromise])

  if (unitResult.error) throw unitResult.error
  if (amenitiesResult.error) throw amenitiesResult.error

  return {
    unit: unitResult.data,
    amenities: amenitiesResult.data.map((a: any) => ({
      name: a.amenities?.amenity_name || 'Unknown',
      amount: a.amenities?.amenity_amount || 0
    }))
  }
})

const unit = computed(() => unitData.value?.unit)
const amenities = computed(() => unitData.value?.amenities || [])

// Financials
const baseRent = computed(() => unit.value?.floor_plans?.market_base_rent || 0)
const amenityTotal = computed(() => amenities.value.reduce((sum: number, a: { amount: number }) => sum + a.amount, 0))
const marketRent = computed(() => baseRent.value + amenityTotal.value)

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount)
}

// Image Logic
const imageSource = computed(() => {
  if (!unit.value?.floor_plans?.primary_image_url) return null
  const url = unit.value.floor_plans.primary_image_url
  return url.startsWith('/') ? url : `/${url}`
})

const statusColor = computed(() => {
  switch (unit.value?.availability_status) {
    case 'available': return 'green'
    case 'leased': return 'gray'
    default: return 'gray'
  }
})

const usageColor = computed(() => {
  switch (unit.value?.usage_type) {
    case 'revenue': return 'primary'
    case 'model': return 'orange'
    case 'employee': return 'purple'
    case 'down': return 'red'
    default: return 'gray'
  }
})
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <!-- Header with Back Button -->
    <div class="flex items-center gap-4">
      <UButtonGroup orientation="horizontal" variant="solid">
        <UButton
          icon="i-heroicons-arrow-left"
          color="white"
          label="Back"
          @click="router.back()"
        />
        <UButton
          icon="i-heroicons-table-cells"
          color="white"
          to="/assets/units"
          label="All Units"
        />
      </UButtonGroup>
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          Unit {{ unit?.unit_number }}
          <UBadge color="gray" variant="subtle" size="lg" v-if="unit?.property_code">
            {{ unit.property_code }}
          </UBadge>
           <UBadge :color="statusColor" variant="subtle" size="lg" class="capitalize">
            {{ unit?.availability_status }}
          </UBadge>
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          {{ unit?.buildings?.name }} • Floor {{ unit?.floor_number }}
        </p>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div v-if="unit" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- Left Column: Image & Financials -->
      <div class="lg:col-span-2 space-y-6">
        
        <!-- Floor Plan Image Card -->
        <UCard :ui="{ body: { padding: 'p-0' } }" class="overflow-hidden">
          <div class="aspect-video w-full bg-gray-100 dark:bg-gray-800 relative flex items-center justify-center">
            <img 
              v-if="imageSource"
              :src="imageSource" 
              :alt="unit.floor_plans?.marketing_name"
              class="w-full h-full object-contain bg-white"
              @error="(e) => (e.target as HTMLImageElement).style.display = 'none'" 
            />
            <div v-else class="text-gray-400 flex flex-col items-center">
              <UIcon name="i-heroicons-map" class="text-6xl mb-2" />
              <span>No Image Available</span>
            </div>
             <!-- Overlay Info -->
             <div class="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
               <p class="font-semibold text-sm">{{ unit.floor_plans?.marketing_name }}</p>
               <p class="text-xs text-gray-500">{{ unit.floor_plans?.code }}</p>
             </div>
          </div>
        </UCard>

        <!-- Market Valuation Card -->
        <UCard>
           <template #header>
            <h3 class="font-semibold text-lg flex items-center gap-2">
              <UIcon name="i-heroicons-banknotes" class="text-green-500" />
              Market Valuation
            </h3>
          </template>
           
           <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
             <!-- Breakdown -->
             <div class="space-y-3">
               <div class="flex justify-between items-center text-sm">
                 <span class="text-gray-500">Base Rent</span>
                 <span class="font-medium">{{ formatCurrency(baseRent) }}</span>
               </div>
               
               <!-- Amenities List -->
               <div v-if="amenities.length > 0" class="border-t border-dashed border-gray-200 dark:border-gray-700 pt-2 space-y-2">
                 <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Amenities</p>
                 <div v-for="amenity in amenities" :key="amenity.name" class="flex justify-between items-center text-sm">
                   <span class="text-gray-600 dark:text-gray-300 flex items-center gap-2">
                     <UIcon name="i-heroicons-sparkles" class="text-yellow-500 w-4 h-4" />
                     {{ amenity.name }}
                   </span>
                   <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(amenity.amount) }}</span>
                 </div>
               </div>
               <div v-else class="text-xs text-gray-400 italic pt-1">
                 No physical amenities assigned.
               </div>
             </div>

             <!-- Total -->
             <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 flex flex-col items-center justify-center text-center">
               <p class="text-sm text-gray-500 font-medium mb-1">Total Market Rent</p>
               <p class="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">{{ formatCurrency(marketRent) }}</p>
               <p class="text-xs text-gray-400 mt-2">Per Month</p>
             </div>
           </div>
        </UCard>

      </div>

      <!-- Right Column: Specs & History -->
      <div class="space-y-6">
        
        <!-- Specs Card -->
         <UCard>
           <template #header>
            <h3 class="font-semibold text-lg">Unit Specifications</h3>
          </template>
           <div class="space-y-4">
             <div>
                <dl class="grid grid-cols-3 gap-2 text-center">
                  <div class="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    <dt class="text-xs text-gray-500 uppercase">Bed</dt>
                    <dd class="font-semibold text-gray-900 dark:text-white">{{ unit.floor_plans?.bedroom_count }}</dd>
                  </div>
                  <div class="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    <dt class="text-xs text-gray-500 uppercase">Bath</dt>
                    <dd class="font-semibold text-gray-900 dark:text-white">{{ unit.floor_plans?.bathroom_count }}</dd>
                  </div>
                  <div class="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    <dt class="text-xs text-gray-500 uppercase">SqFt</dt>
                    <dd class="font-semibold text-gray-900 dark:text-white">{{ unit.floor_plans?.area_sqft }}</dd>
                  </div>
                </dl>
             </div>
             <div>
               <dt class="text-xs text-gray-500 uppercase mb-1">Configuration</dt>
               <dd class="flex items-center gap-2">
                 <UBadge :color="usageColor" variant="soft" class="capitalize">{{ unit.usage_type }}</UBadge>
                 <span class="text-xs text-gray-400 font-mono">{{ unit.id.split('-')[0] }}...</span>
               </dd>
             </div>
             <div class="pt-4 border-t border-gray-100 dark:border-gray-800">
                <UButton block variant="outline" color="gray" :to="`/assets/floor-plans/${unit.floor_plan_id}`">
                  View Floor Plan Details
                </UButton>
             </div>
           </div>
        </UCard>

        <!-- LEASING LAYER COMPONENTS -->
        <div class="space-y-6">
           <AvailabilityStatusCard :unit-id="unit.id" />
           <LeasingSummaryCard :unit-id="unit.id" />
           <ResidentDetailsCard :unit-id="unit.id" />
        </div>

      </div>

    </div>
    
    <!-- Loading/Error States -->
    <div v-else-if="status === 'pending'" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-4xl text-primary-500" />
    </div>
    <div v-else class="text-center py-12">
      <h2 class="text-xl font-bold text-red-500 mb-2">Unit Not Found</h2>
      <UButton to="/assets/units" variant="outline">Return to List</UButton>
    </div>

  </div>
</template>
