<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePropertyState } from '../../../../base/composables/usePropertyState'
import { useSupabaseClient, useAsyncData, navigateTo, definePageMeta } from '#imports'
import ImageModal from '../../../../base/components/modals/ImageModal.vue'

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const { activeProperty } = usePropertyState()

definePageMeta({
  layout: 'dashboard'
})

// Fetch Availability Detail from view
const { data: availability, status, error } = await useAsyncData(`availability-detail-${route.params.id}`, async () => {
  const { data, error } = await supabase
    .from('view_table_availabilities')
    .select('*')
    .eq('unit_id', route.params.id)
    .single()
  
  if (error) throw error
  return data
})

const statusColors: Record<string, string> = {
  'Available': 'primary',
  'Applied': 'warning',
  'Leased': 'success'
}

const showImageModal = ref(false)

// Computed Image URL - Ensure absolute path from public directory
const imageUrl = computed(() => {
  const path = availability.value?.floor_plan_image_url
  if (!path) return null
  // If it doesn't start with / or http, prepend /
  if (!path.startsWith('/') && !path.startsWith('http')) {
    return `/${path}`
  }
  return path
})
// Vacancy color mapping logic (Synchronized with index)
const getVacancyColor = (days: number | null) => {
  const vc = days ?? 0
  if (vc >= 0) return '#B91C1C'  // Darker Rich Red (Currently Vacant)
  if (vc >= -25) return '#F472B6' // Pink (-1 to -25)
  if (vc >= -50) return '#FBBF24' // Yellow (-26 to -50)
  if (vc >= -75) return '#34D399' // Green (-51 to -75)
  return '#60A5FA'               // Blue (<-75)
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Back Button & Breadcrumbs -->
    <div class="mb-6 flex flex-col md:flex-row md:items-center gap-4">
      <UButton
        icon="i-heroicons-arrow-left"
        label="Back"
        color="primary"
        variant="outline"
        class="-ml-2.5 md:hidden rounded-xl font-bold"
        @click="router.back()"
      />
      <div class="flex items-center gap-2 text-sm text-gray-500">
        <UButton
          icon="i-heroicons-arrow-left"
          color="primary"
          variant="outline"
          class="hidden md:flex -ml-2.5 mr-2 rounded-xl font-bold"
          @click="router.back()"
        />
        <NuxtLink to="/office/availabilities" class="hover:text-primary-600 font-medium">Office</NuxtLink>
        <UIcon name="i-heroicons-chevron-right" class="w-3 h-3" />
        <NuxtLink to="/office/availabilities" class="hover:text-primary-600 font-medium">Availabilities</NuxtLink>
        <UIcon name="i-heroicons-chevron-right" class="w-3 h-3" />
        <span class="text-gray-900 font-bold tracking-tight">Unit {{ availability?.unit_name || '...' }}</span>
      </div>
    </div>

    <div v-if="status === 'pending'" class="flex justify-center p-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <div v-else-if="error" class="p-8 bg-red-50 border border-red-200 rounded-3xl text-red-700">
      <h2 class="text-xl font-bold mb-2">Error Loading Availability</h2>
      <p>{{ error.message }}</p>
      <UButton color="error" variant="ghost" class="mt-4" to="/office/availabilities">
        Back to Availabilities
      </UButton>
    </div>

    <div v-else-if="availability" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left Column: Primary Info -->
      <div class="lg:col-span-2 space-y-8">
        <!-- Header Card -->
        <div class="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div class="absolute top-0 right-0 p-8 flex items-center gap-3">
            <UBadge 
              size="lg" 
              :color="statusColors[availability.operational_status] || 'neutral'"
              variant="outline"
              class="uppercase tracking-widest font-bold"
            >
              {{ availability.operational_status }}
            </UBadge>
          </div>

          <div class="flex items-center gap-6 mb-4">
            <div class="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 shadow-inner">
              <UIcon name="i-heroicons-clipboard-document-list" class="w-12 h-12" />
            </div>
            <div>
              <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Unit Availability</p>
              <h1 class="text-4xl font-black tracking-tight text-gray-900 mb-1 flex items-center gap-3">
                <span 
                  class="px-3 py-1 rounded-xl text-gray-950 shadow-sm"
                  :style="{ backgroundColor: getVacancyColor(availability.vacant_days) }"
                >
                  Unit {{ availability.unit_name }}
                </span>
              </h1>
              <p class="text-lg font-bold text-gray-900">
                {{ availability.floor_plan_name }} &middot; {{ availability.sf }}
              </p>
            </div>
          </div>
        </div>
 
        <!-- Metrics & Financials Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Inventory Metrics -->
          <div class="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                <UIcon name="i-heroicons-chart-bar" class="w-6 h-6" />
              </div>
              <h3 class="text-xl font-bold">Inventory Metrics</h3>
            </div>
            <div class="space-y-6">
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Days Vacant</p>
                <div class="flex items-baseline gap-2">
                  <p 
                    class="text-3xl font-black"
                    :style="{ color: getVacancyColor(availability.vacant_days) }"
                  >
                    {{ availability.vacant_days ?? 0 }}
                  </p>
                  <span class="text-sm font-bold text-gray-400">Days</span>
                </div>
              </div>
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Turnover Time</p>
                <div class="flex items-baseline gap-2">
                  <p class="text-xl font-bold text-gray-700">
                    {{ availability.turnover_days ?? 0 }}
                  </p>
                  <span class="text-sm font-bold text-gray-400">Days</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Financials Card -->
          <div class="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                <UIcon name="i-heroicons-banknotes" class="w-6 h-6" />
              </div>
              <h3 class="text-xl font-bold">Pricing</h3>
            </div>
            <div class="space-y-6">
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Offered Rent</p>
                <p class="text-3xl font-black text-primary-600">
                  ${{ availability.rent_offered?.toLocaleString() || '0' }}
                </p>
              </div>
              <div class="pt-4 border-t border-gray-100">
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Leasing Agent</p>
                <p class="text-xl font-bold text-gray-700">
                  {{ availability.leasing_agent || 'Unassigned' }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Timeline Section -->
        <div class="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <UIcon name="i-heroicons-calendar-days" class="w-6 h-6" />
            </div>
            <h3 class="text-xl font-bold">Availability Timeline</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p class="text-xs font-bold text-gray-400 uppercase mb-1">Previous Move-out</p>
              <p class="text-lg font-bold text-gray-900">
                {{ availability.move_out_date ? new Date(availability.move_out_date).toLocaleDateString() : 'Unknown' }}
              </p>
            </div>
            <div>
              <p class="text-xs font-bold text-gray-400 uppercase mb-1">Available Date</p>
              <p class="text-lg font-bold text-primary-600">
                {{ availability.available_date ? new Date(availability.available_date).toLocaleDateString() : 'Not set' }}
              </p>
            </div>
            <div>
              <p class="text-xs font-bold text-gray-400 uppercase mb-1">Estimated Move-in</p>
              <p class="text-lg font-bold text-gray-900">
                {{ availability.move_in_date ? new Date(availability.move_in_date).toLocaleDateString() : 'Unleased' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Amenities Section -->
        <div v-if="availability.amenities?.length" class="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <UIcon name="i-heroicons-sparkles" class="w-6 h-6" />
            </div>
            <h3 class="text-xl font-bold">Unit Amenities</h3>
          </div>
          <div class="flex flex-wrap gap-2">
            <UBadge 
              v-for="amenity in availability.amenities" 
              :key="amenity"
              color="neutral"
              variant="subtle"
              class="px-3 py-1 text-sm font-medium"
            >
              {{ amenity }}
            </UBadge>
          </div>
        </div>
      </div>

      <!-- Right Column: Connections -->
      <div class="space-y-8">
        <div class="bg-gray-50 p-8 rounded-3xl border border-gray-200">
          <h3 class="text-sm font-black uppercase text-gray-400 mb-6 tracking-widest">Connections</h3>
          
          <div class="space-y-8">
            <!-- Unit -->
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-primary-600 flex-shrink-0">
                <UIcon name="i-heroicons-key" class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Unit Detail</p>
                <NuxtLink 
                  :to="`/assets/units/${availability.unit_id}`"
                  class="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors"
                >
                  Unit {{ availability.unit_name }}
                </NuxtLink>
              </div>
            </div>

            <!-- Building -->
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-primary-600 flex-shrink-0">
                <UIcon name="i-heroicons-home-modern" class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Building</p>
                <NuxtLink 
                  :to="`/assets/buildings/${availability.building_id}`"
                  class="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors"
                >
                  {{ availability.building_name }}
                </NuxtLink>
              </div>
            </div>

            <!-- Floor Plan -->
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-primary-600 flex-shrink-0">
                <UIcon name="i-heroicons-map" class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Floor Plan</p>
                <NuxtLink 
                  :to="`/assets/floor-plans`" 
                  class="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors"
                >
                  {{ availability.floor_plan_name }}
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>

        <!-- Layout Preview Card (Positioned in sidebar) -->
        <div v-if="availability.floor_plan_image_url" class="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="flex items-center gap-2 mb-4 px-2">
            <UIcon name="i-heroicons-photo" class="w-5 h-5 text-gray-400" />
            <h3 class="text-xs font-black uppercase text-gray-400 tracking-widest">Layout Preview</h3>
          </div>
          <div 
            class="aspect-square bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden group cursor-zoom-in"
            @click="showImageModal = true"
          >
            <NuxtImg 
              v-if="imageUrl"
              :src="imageUrl" 
              :alt="availability.floor_plan_name"
              class="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
              placeholder
            />
            <div v-else class="text-gray-400">
              <UIcon name="i-heroicons-photo" class="w-12 h-12" />
            </div>
          </div>
          
          <div v-if="imageUrl" class="mt-4 pt-4 border-t border-gray-100 flex justify-center">
            <UButton
              :to="imageUrl"
              target="_blank"
              variant="solid"
              color="primary"
              size="sm"
              block
              icon="i-heroicons-arrow-top-right-on-square"
              label="View Full Resolution"
              class="rounded-xl font-bold"
            />
          </div>
        </div>

        <!-- Future Tenancy Status -->
        <div v-if="availability.future_status" class="bg-primary-50 p-8 rounded-3xl border border-primary-100">
          <div class="flex items-center gap-3 mb-4 text-primary-600">
            <UIcon name="i-heroicons-arrow-right-circle" class="w-6 h-6" />
            <h3 class="font-black uppercase tracking-widest text-sm">Pipeline Status</h3>
          </div>
          <p class="text-lg font-bold text-primary-900 mb-2">
            Unit is currently <span class="uppercase">{{ availability.future_status }}</span>
          </p>
          <p class="text-sm text-primary-700 leading-relaxed">
            This unit has a linked future tenancy. The operational status is locked as <strong>{{ availability.operational_status }}</strong>.
          </p>
        </div>
      </div>
    </div>

    <!-- Reusable Image Modal -->
    <ImageModal
      v-if="showImageModal"
      v-model="showImageModal"
      :src="imageUrl"
      :alt="availability?.floor_plan_name"
    />
  </div>
</template>
