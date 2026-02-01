<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const floorPlanId = route.params.id as string
const supabase = useSupabaseClient()

const { data: floorPlanData, status, error } = await useAsyncData(`floor-plan-${floorPlanId}`, async () => {
  const { data, error } = await supabase
    .from('floor_plans')
    .select('*, properties(name, code), units(count)')
    .eq('id', floorPlanId)
    .single()

  if (error) throw error
  return { info: data } // Maintain structure for template compatibility or flatten it? 
  // actually, the previous code returned { info: ..., units: ... }
  // To minimize template churn, I'll return { info: data } but wait, the 'stats_cache' is on 'data'.
})

// Image source: Use database URL (e.g., apartments/photo.webp)
const imageSource = computed(() => {
  if (!floorPlanData.value?.info?.primary_image_url) return null
  const url = floorPlanData.value.info.primary_image_url
  // Ensure absolute path for public folder assets
  return url.startsWith('/') ? url : `/${url}`
})

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

// Compute Building Stats (Read from Cache)
const buildingStats = computed(() => {
  // Structure in DB: stats_cache: { buildings: [{ name, propCode, count }, ...] }
  // @ts-ignore
  return floorPlanData.value?.info?.stats_cache?.buildings || []
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
          to="/assets/floor-plans"
          label="All Plans"
        />
      </UButtonGroup>
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          {{ floorPlanData?.info?.marketing_name }}
          <UBadge color="gray" variant="subtle" size="lg" v-if="floorPlanData?.info?.properties">
            {{ floorPlanData.info.properties.code }}
          </UBadge>
          <UBadge color="primary" variant="subtle" size="lg">{{ floorPlanData?.info?.code }}</UBadge>
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          {{ floorPlanData?.info?.bedroom_count }} Bed / {{ floorPlanData?.info?.bathroom_count }} Bath • {{ floorPlanData?.info?.area_sqft }} SqFt
        </p>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div v-if="floorPlanData" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- Left Column: Image -->
      <div class="lg:col-span-2 space-y-6">
        <UCard :ui="{ body: { padding: 'p-0' } }" class="overflow-hidden">
          <div class="aspect-video w-full bg-gray-100 dark:bg-gray-800 relative flex items-center justify-center">
            <img 
              v-if="imageSource"
              :src="imageSource" 
              :alt="floorPlanData.info.marketing_name"
              class="w-full h-full object-contain bg-white"
              @error="(e) => (e.target as HTMLImageElement).style.display = 'none'" 
            />
            <div v-else class="text-gray-400 flex flex-col items-center">
              <UIcon name="i-heroicons-map" class="text-6xl mb-2" />
              <span>No Image Available</span>
            </div>
          </div>
        </UCard>

        <!-- Description / Details -->
        <UCard>
           <template #header>
            <h3 class="font-semibold text-lg">Plan Details</h3>
          </template>
           <p class="text-gray-600 dark:text-gray-300 mb-4">
            {{ floorPlanData.info.description || 'No description available for this floor plan.' }}
          </p>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Property</dt>
              <dd class="text-gray-900 dark:text-white">{{ floorPlanData.info.properties?.name }}</dd>
            </div>
             <div>
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Base Rent</dt>
              <dd class="text-gray-900 dark:text-white text-lg font-semibold">{{ formatCurrency(floorPlanData.info.market_base_rent || 0) }}</dd>
            </div>
          </dl>
        </UCard>

        <!-- Additional Data (Requested) -->
        <UCard>
          <template #header>
            <h3 class="font-semibold text-lg flex items-center gap-2">
              <UIcon name="i-heroicons-clipboard-document-list" class="text-primary-500" />
              Additional Data
            </h3>
          </template>
          <div class="py-8 text-center text-gray-500 dark:text-gray-400 italic">
            Future specific floor plan metrics will be displayed here.
          </div>
        </UCard>
      </div>

      <!-- Right Column: Stats -->
      <div class="space-y-6">
        <UCard>
          <template #header>
            <h3 class="font-semibold text-lg">Stats</h3>
          </template>
          
          <dl class="divide-y divide-gray-200 dark:divide-gray-700">
             <!-- Building Breakdown List -->
             <div class="py-3">
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Buildngs</dt>
              <dd v-if="buildingStats.length > 0" class="space-y-1">
                <div v-for="stat in buildingStats" :key="stat.name" class="flex justify-between text-sm">
                  <span class="text-gray-700 dark:text-gray-300">
                    {{ stat.name }} 
                    <UBadge size="xs" color="gray" variant="soft">{{ stat.propCode }}</UBadge>
                  </span>
                  <span class="font-semibold text-gray-900 dark:text-white">{{ stat.count }}</span>
                </div>
              </dd>
              <dd v-else class="text-sm text-gray-500 italic">No units assigned</dd>
            </div>

            <div class="py-3 flex justify-between border-t border-gray-200 dark:border-gray-700">
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Units</dt>
              <dd class="text-sm font-semibold text-gray-900 dark:text-white">{{ floorPlanData.info.units[0]?.count || 0 }}</dd>
            </div>
            <div class="py-3 flex justify-between">
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Bedrooms</dt>
              <dd class="text-sm font-semibold text-gray-900 dark:text-white">{{ floorPlanData.info.bedroom_count }}</dd>
            </div>
            <div class="py-3 flex justify-between">
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Bathrooms</dt>
              <dd class="text-sm font-semibold text-gray-900 dark:text-white">{{ floorPlanData.info.bathroom_count }}</dd>
            </div>
             <div class="py-3 flex justify-between">
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Square Feet</dt>
              <dd class="text-sm font-semibold text-gray-900 dark:text-white">{{ floorPlanData.info.area_sqft }}</dd>
            </div>
          </dl>
        </UCard>

        <UCard class="bg-gray-50 dark:bg-gray-800 border-dashed border-2 border-gray-300 dark:border-gray-700">
            <div class="text-center py-4 text-gray-500">
                <UIcon name="i-heroicons-photo" class="text-4xl mb-2 mx-auto block" />
                <span class="text-sm">Floor Plan Image / Diagram</span>
            </div>
        </UCard>
      </div>

    </div>
    
    <!-- Loading State -->
    <div v-else-if="status === 'pending'" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-4xl text-primary-500" />
    </div>
    
    <!-- Error State -->
    <div v-else class="text-center py-12">
      <h2 class="text-xl font-bold text-red-500 mb-2">Floor Plan Not Found</h2>
      <UButton to="/assets/floor-plans" variant="outline">Return to List</UButton>
    </div>

  </div>
</template>
