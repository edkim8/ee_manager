<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLocationService } from '../../../composables/useLocationService'
import LocationMap from '../../../components/map/LocationMap.vue'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const { fetchLocationById, fetchLocations } = useLocationService()

const locationId = route.query.locationId as string
const location = ref<any>(null)
const propertyLocations = ref<any[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

const loadData = async () => {
  if (!locationId) {
    error.value = 'No location ID provided.'
    isLoading.value = false
    return
  }

  try {
    isLoading.value = true
    // Fetch the specific location
    const loc = await fetchLocationById(locationId)
    location.value = loc

    // Fetch all locations for the same property for context
    if (loc.property_code) {
      propertyLocations.value = await fetchLocations(loc.property_code)
    } else {
      propertyLocations.value = [loc]
    }
  } catch (err: any) {
    console.error('Error loading shared location:', err)
    error.value = 'Failed to load location data. It may have been deleted.'
  } finally {
    isLoading.value = false
  }
}

const isSharing = ref(false)
const shareLocation = async (loc: any) => {
    if (!loc || isSharing.value) return

    isSharing.value = true
    try {
        const iconType = loc.icon_type || 'general'
        const shareLink = `${window.location.origin}/assets/locations/map?locationId=${loc.id}`
        const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`
        
        const lat = typeof loc.latitude === 'number' ? loc.latitude.toFixed(6) : (loc.latitude || 'N/A')
        const lng = typeof loc.longitude === 'number' ? loc.longitude.toFixed(6) : (loc.longitude || 'N/A')
        
        const shareText = `📍 ${iconType.replace('_', ' ').toUpperCase()}
Description: ${loc.description || 'No description'}
Coordinates: ${lat}, ${lng}
ID: ${loc.id}

🔗 Dashboard Link (Internal): ${shareLink}
🌐 Google Maps (Public): ${googleMapsLink}`

        const clipboardText = `${shareText}\n\n(You can copy and paste this into an email or message to share the location details).`

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Location: ${iconType.replace('_', ' ')}`,
                    text: shareText,
                    url: shareLink
                })
            } catch (err) {
                console.error('Error sharing:', err)
            }
        } else {
            try {
                await navigator.clipboard.writeText(clipboardText)
                alert('Location details copied to clipboard! You can now paste this into an email or message to share with your team.')
            } catch (err) {
                console.error('Failed to copy:', err)
            }
        }
    } finally {
        isSharing.value = false
    }
}

const handleShareFromMap = (locationId: string) => {
    const loc = propertyLocations.value.find((l: any) => l.id === locationId)
    if (loc) {
        shareLocation(loc)
    }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between shadow-sm z-10">
      <div class="flex items-center gap-4">
        <UButton
          icon="i-heroicons-arrow-left"
          color="gray"
          variant="ghost"
          @click="router.back()"
        />
        <div v-if="location">
          <h1 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 capitalize">
            {{ location.icon_type.replace('_', ' ') }}
            <UBadge size="xs" color="gray" variant="subtle" class="ml-2 font-mono h-5">
              {{ locationId.substring(0, 8) }}
            </UBadge>
          </h1>
          <p class="text-xs text-gray-500 truncate max-w-md">
            {{ location.description || 'Shared Location View' }}
          </p>
        </div>
        <div v-else-if="isLoading">
          <div class="h-5 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
          <div class="h-3 w-48 bg-gray-100 dark:bg-gray-800 animate-pulse rounded mt-1"></div>
        </div>
        <div v-else>
          <h1 class="text-lg font-bold text-red-600">Location Not Found</h1>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          to="/assets/locations"
          icon="i-heroicons-list-bullet"
          color="primary"
          variant="soft"
          size="sm"
        >
          Manager
        </UButton>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 relative">
      <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 z-20 backdrop-blur-sm">
        <div class="flex flex-col items-center gap-3">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
          <span class="text-sm font-medium text-gray-500">Initializing Map Scope...</span>
        </div>
      </div>

      <div v-else-if="error" class="h-full flex flex-col items-center justify-center p-6 text-center">
        <UIcon name="i-heroicons-exclamation-circle" class="w-16 h-16 text-red-500 mb-4" />
        <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
        <p class="text-gray-500 max-w-md mb-6">{{ error }}</p>
        <UButton to="/assets/locations" color="primary">Go to Location Manager</UButton>
      </div>

      <div v-else class="h-full w-full">
        <LocationMap
          :locations="propertyLocations"
          :initial-center="location ? { lat: location.latitude, lng: location.longitude } : undefined"
          @share-location="handleShareFromMap"
        />
      </div>
    </div>
  </div>
</template>
