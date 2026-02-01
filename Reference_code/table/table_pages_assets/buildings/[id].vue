<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const buildingId = route.params.id as string
const supabase = useSupabaseClient()

const { data: buildingData, status, error } = await useAsyncData(`building-${buildingId}`, async () => {
  // Fetch Building (now includes stats_cache)
  const { data, error } = await supabase
    .from('buildings')
    .select('*, properties(name, code), units(count)')
    .eq('id', buildingId)
    .single()

  if (error) throw error
  return data
})

// Image source: Placeholder logic
const imageSource = computed(() => {
  // In future we might have building specific images
  // For now return null to show placeholder icon
  return null
})

// Floor Plan Stats (Read from Cache)
const floorPlanStats = computed(() => {
  // Structure in DB: stats_cache: { floor_plans: [{ code, name, count }, ...] }
  // @ts-ignore
  return buildingData.value?.stats_cache?.floor_plans || []
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
          {{ buildingData?.name }}
          <UBadge color="gray" variant="subtle" size="lg" v-if="buildingData?.properties">
            {{ buildingData.properties.code }}
          </UBadge>
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          {{ buildingData?.street_address }}, {{ buildingData?.city }}, {{ buildingData?.state_code }} {{ buildingData?.postal_code }}
        </p>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div v-if="buildingData" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- Left Column: Image -->
      <div class="lg:col-span-2 space-y-6">
        <UCard :ui="{ body: { padding: 'p-0' } }" class="overflow-hidden">
          <div class="aspect-video w-full bg-gray-100 dark:bg-gray-800 relative flex items-center justify-center">
            <div class="text-gray-400 flex flex-col items-center">
              <UIcon name="i-heroicons-home-modern" class="text-6xl mb-2" />
              <span>No Image Available</span>
            </div>
          </div>
        </UCard>

        <!-- Description / Details -->
        <UCard>
           <template #header>
            <h3 class="font-semibold text-lg">Building Details</h3>
          </template>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Structure Type</dt>
              <dd class="text-gray-900 dark:text-white">{{ buildingData.structure_type || '-' }}</dd>
            </div>
            <div>
               <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Property</dt>
               <dd class="text-gray-900 dark:text-white">{{ buildingData.properties?.name }}</dd>
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
            Future specific building data will be displayed here.
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
            <!-- Floor Plans List -->
             <div class="py-3">
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Floor Plans</dt>
              <dd v-if="floorPlanStats.length > 0" class="space-y-1">
                <div v-for="stat in floorPlanStats" :key="stat.code" class="flex justify-between text-sm">
                  <span class="text-gray-700 dark:text-gray-300">{{ stat.code }} <span class="text-xs text-gray-500">({{ stat.name }})</span></span>
                  <span class="font-semibold text-gray-900 dark:text-white">{{ stat.count }}</span>
                </div>
              </dd>
              <dd v-else class="text-sm text-gray-500 italic">No units assigned</dd>
            </div>

            <div class="py-3 flex justify-between border-t border-gray-200 dark:border-gray-700">
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Units</dt>
              <dd class="text-sm font-semibold text-gray-900 dark:text-white">{{ buildingData.units[0]?.count || 0 }}</dd>
            </div>
            <div class="py-3 flex justify-between">
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Year Built</dt>
              <dd class="text-sm font-semibold text-gray-900 dark:text-white">{{ buildingData.year_built || '-' }}</dd>
            </div>
            <div class="py-3 flex justify-between">
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Floors</dt>
              <dd class="text-sm font-semibold text-gray-900 dark:text-white">{{ buildingData.floor_count || '-' }}</dd>
            </div>
          </dl>
        </UCard>
      </div>

    </div>
    
    <!-- Loading State -->
    <div v-else-if="status === 'pending'" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-4xl text-primary-500" />
    </div>
    
    <!-- Error State -->
    <div v-else class="text-center py-12">
      <h2 class="text-xl font-bold text-red-500 mb-2">Building Not Found</h2>
      <UButton to="/assets/buildings" variant="outline">Return to List</UButton>
    </div>

  </div>
</template>
