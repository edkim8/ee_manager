<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const propertyId = route.params.id as string
const supabase = useSupabaseClient()

const { data: property, status, error } = await useAsyncData(`property-${propertyId}`, async () => {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single()

  if (error) throw error
  return data
})

// Image source: Try primary_image_url first, fallback to local convention
const imageSource = computed(() => {
  if (property.value?.primary_image_url) return property.value.primary_image_url
  // Fallback convention: /images/properties/[code].jpg
  // Note: This assumes jpg, standardizing on jpg/png or just checking existence is better but simple for now
  return property.value?.code ? `/images/properties/${property.value.code}.jpg` : null
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
          to="/assets/properties"
          label="All Properties"
        />
      </UButtonGroup>
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          {{ property?.name }}
          <UBadge color="primary" variant="subtle" size="lg">{{ property?.code }}</UBadge>
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          {{ property?.street_address }}, {{ property?.city }}, {{ property?.state_code }} {{ property?.postal_code }}
        </p>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div v-if="property" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- Left Column: Image -->
      <div class="lg:col-span-2 space-y-6">
        <UCard :ui="{ body: { padding: 'p-0' } }" class="overflow-hidden">
          <div class="aspect-video w-full bg-gray-100 dark:bg-gray-800 relative flex items-center justify-center">
            <img 
              v-if="imageSource"
              :src="imageSource" 
              :alt="property.name"
              class="w-full h-full object-cover"
              @error="(e) => (e.target as HTMLImageElement).style.display = 'none'" 
            />
            <div v-else class="text-gray-400 flex flex-col items-center">
              <UIcon name="i-heroicons-photo" class="text-6xl mb-2" />
              <span>No Image Available</span>
            </div>
          </div>
        </UCard>

        <!-- Description -->
        <UCard>
          <template #header>
            <h3 class="font-semibold text-lg">About this Property</h3>
          </template>
          <p class="text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">
            {{ property.description || 'No description available.' }}
          </p>
        </UCard>
      </div>

      <!-- Right Column: Details -->
      <div class="space-y-6">
        <UCard>
          <template #header>
            <h3 class="font-semibold text-lg flex items-center gap-2">
              <UIcon name="i-heroicons-information-circle" class="text-primary-500" />
              Key Details
            </h3>
          </template>
          
          <dl class="divide-y divide-gray-200 dark:divide-gray-700">
            <div class="py-3 flex justify-between">
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Units</dt>
              <dd class="text-sm font-semibold text-gray-900 dark:text-white">{{ property.total_unit_count || '-' }}</dd>
            </div>
            <div class="py-3 flex justify-between">
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Year Built</dt>
              <dd class="text-sm font-semibold text-gray-900 dark:text-white">{{ property.year_built || '-' }}</dd>
            </div>
            <div class="py-3 flex justify-between">
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">State</dt>
              <dd class="text-sm font-semibold text-gray-900 dark:text-white">{{ property.state_code }}</dd>
            </div>
             <div class="py-3 flex justify-between">
              <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">City</dt>
              <dd class="text-sm font-semibold text-gray-900 dark:text-white">{{ property.city }}</dd>
            </div>
          </dl>

          <template #footer>
              <UButton 
                v-if="property.website_url"
                :to="property.website_url" 
                target="_blank" 
                block 
                color="gray" 
                variant="ghost" 
                icon="i-heroicons-globe-alt"
              >
                Visit Website
              </UButton>
          </template>
        </UCard>

        <!-- Actions or Stats Placeholder -->
        <UCard class="bg-primary-50 dark:bg-primary-900/10 border-primary-100 dark:border-primary-800">
          <div class="text-center py-4">
             <h4 class="font-bold text-primary-700 dark:text-primary-400 text-lg mb-1">Actions</h4>
             <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Manage this property from the admin panel.</p>
             <UButton to="/admin/properties" color="primary" variant="soft" block>Go to Admin</UButton>
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
      <h2 class="text-xl font-bold text-red-500 mb-2">Property Not Found</h2>
      <UButton to="/assets/properties" variant="outline">Return to List</UButton>
    </div>

  </div>
</template>
