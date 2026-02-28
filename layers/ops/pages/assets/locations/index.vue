<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useSupabaseClient, useAsyncData, definePageMeta, useState, setPageLayout } from '#imports'
// Import SimpleModal instead of UModal
import SimpleModal from '../../../../base/components/SimpleModal.vue'
import { useAppMode } from '../../../../base/composables/useAppMode'
// Fix relative paths: from layers/ops/pages/assets/locations/ to layers/ops/components/map/
// ../../../components/map/LocationPicker.vue
import LocationPicker from '../../../components/map/LocationPicker.vue'
import LocationMap from '../../../components/map/LocationMap.vue'
import LocationNotesModal from '../../../components/location/LocationNotesModal.vue'
// ../../../composables/useLocationService
import { useLocationService } from '../../../composables/useLocationService'
import { usePropertyState } from '../../../../base/composables/usePropertyState'

definePageMeta({
  alias: ['/office/locations', '/maintenance/locations']
})

const { isAppMode } = useAppMode()

// Set layout dynamically based on app mode
if (isAppMode.value) {
  setPageLayout('mobile-app')
} else {
  setPageLayout('dashboard')
}

const supabase = useSupabaseClient()
const { fetchLocations } = useLocationService()
const { activeProperty: globalActiveProperty } = usePropertyState()

// State
const showAddModal = ref(false)
const showMapModal = ref(false)
const showNotesModal = ref(false)
const locations = useState<any[]>('locations-list', () => [])

// Fetch Properties for Selector (We need full details like Lat/Lng which might not be in the lightweight global options)
const { data: properties } = await useAsyncData('locations-page-properties', async () => {
  const { data, error } = await supabase
    .from('properties')
    .select('id, code, name, street_address, latitude, longitude')
    .order('name')
  
  if (error) throw error
  return data || []
})

// Computed Selected Property based on Global State
const selectedProperty = computed({
  get: () => {
    if (!globalActiveProperty.value || !properties.value) return null
    return properties.value.find((p: any) => p.code === globalActiveProperty.value) || null
  },
  set: (newVal: any) => {
    if (newVal?.code) {
      globalActiveProperty.value = newVal.code
    } else {
      globalActiveProperty.value = null
    }
  }
})

// Use async data to fetch locations on SSR if we have an active property
const { refresh: refreshLocations } = await useAsyncData('locations-fetch', async () => {
    if (!globalActiveProperty.value) return []
    const data = await fetchLocations(globalActiveProperty.value)
    locations.value = data
    return data
}, {
    watch: [globalActiveProperty],
    immediate: true
})

// Update loadLocations to use refresh
const loadLocations = async () => {
    await refreshLocations()
}

// Prevent body scroll when fullscreen map modal is open
watch(showMapModal, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

const handleLocationSaved = async () => {
    showAddModal.value = false
    await loadLocations()
}

// View/Delete functionality
const showDetailModal = ref(false)
const selectedLocation = ref<any>(null)
const { deleteLocation } = useLocationService()
const isDeleting = ref(false)

const viewLocation = (location: any) => {
    selectedLocation.value = location
    showDetailModal.value = true
}

const viewNotes = () => {
    showDetailModal.value = false
    showNotesModal.value = true
}

const handleViewNotesFromMap = (locationId: string) => {
    // Find the location
    const location = locations.value.find((loc: any) => loc.id === locationId)
    if (location) {
        selectedLocation.value = location
        showMapModal.value = false
        showNotesModal.value = true
    }
}

const handleViewDetailFromMap = (locationId: string) => {
    const location = locations.value.find((loc: any) => loc.id === locationId)
    if (location) {
        selectedLocation.value = location
        showMapModal.value = false
        showDetailModal.value = true
    }
}

const handleDelete = async () => {
    if (!selectedLocation.value?.id) return

    if (!confirm('Are you sure you want to delete this location?')) return

    isDeleting.value = true
    try {
        await deleteLocation(selectedLocation.value.id)
        showDetailModal.value = false
        selectedLocation.value = null
        await loadLocations()
    } catch (e) {
        console.error('Error deleting location:', e)
        alert('Failed to delete location')
    } finally {
        isDeleting.value = false
    }
}

// Sharing functionality
const handleShareFromMap = (locationId: string) => {
    const loc = locations.value.find((l: any) => l.id === locationId)
    if (loc) {
        shareLocation(loc)
    }
}

// Sharing functionality
const isSharing = ref(false)
const shareLocation = async (locationOverride?: any) => {
    if (isSharing.value) return
    
    const loc = locationOverride || selectedLocation.value
    if (!loc) return

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
            // Fallback to clipboard
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

// Helper to get icon for type
const getIconForType = (type: string) => {
    const icons: Record<string, string> = {
        electrical: 'i-heroicons-bolt',
        plumbing: 'i-heroicons-wrench-screwdriver',
        hvac: 'i-heroicons-cube',
        structural: 'i-heroicons-building-office',
        lighting: 'i-heroicons-light-bulb',
        safety_fire: 'i-heroicons-fire',
        landscaping: 'i-heroicons-sparkles',
        pavement_parking: 'i-heroicons-square-3-stack-3d',
        waste: 'i-heroicons-trash',
        incident: 'i-heroicons-exclamation-triangle',
        general: 'i-heroicons-map-pin'
    }
    return icons[type] || icons.general
}

const getColorForType = (type: string) => {
    const colors: Record<string, string> = {
        electrical: 'yellow',
        plumbing: 'blue',
        hvac: 'sky',
        structural: 'orange',
        lighting: 'purple',
        safety_fire: 'red',
        landscaping: 'green',
        pavement_parking: 'pink',
        waste: 'orange',
        incident: 'red',
        general: 'gray'
    }
    return colors[type] || colors.general
}

// Compute category summary
const categorySummary = computed(() => {
    const summary: Record<string, { count: number; label: string; color: string; icon: string }> = {}

    locations.value.forEach((loc: any) => {
        const type = loc.icon_type
        if (!summary[type]) {
            summary[type] = {
                count: 0,
                label: type.replace('_', ' '),
                color: getColorForType(type),
                icon: getIconForType(type)
            }
        }
        summary[type].count++
    })

    // Sort by count descending
    return Object.entries(summary)
        .sort(([, a], [, b]) => b.count - a.count)
        .map(([type, data]) => ({ type, ...data }))
})
</script>

<template>
  <div class="p-4 max-w-lg mx-auto min-h-screen flex flex-col">
    <div class="mb-6">
      <h1 class="text-2xl font-black text-gray-900 dark:text-white mb-2">Location Manager</h1>
      <p class="text-gray-500 dark:text-gray-400 text-sm">Select a property to manage geospatial assets.</p>
    </div>

    <!-- Selected Property Display -->
    <div v-if="selectedProperty" class="mb-8">
      <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 flex items-center justify-between">
         <div>
            <h2 class="font-bold text-lg text-gray-900 dark:text-white">{{ selectedProperty.name }}</h2>
            <p class="text-sm text-gray-500">{{ selectedProperty.street_address }}</p>
         </div>
         <UBadge color="primary" variant="subtle">{{ locations.length }} Locs</UBadge>
      </div>
    </div>

    <!-- Actions (Only visible when property selected) -->
    <div v-if="selectedProperty" class="space-y-4 flex-1">
        <div class="grid grid-cols-2 gap-4">
            <UButton
                size="xl"
                block
                color="primary"
                variant="solid"
                class="h-32 flex flex-col gap-2 rounded-2xl shadow-lg"
                @click="showAddModal = true"
            >
                <UIcon name="i-heroicons-map-pin" class="w-10 h-10" />
                <span class="font-bold">Add Location</span>
            </UButton>

            <UButton
                size="xl"
                block
                color="gray"
                variant="solid"
                class="h-32 flex flex-col gap-2 rounded-2xl shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                @click="showMapModal = true"
            >
                <UIcon name="i-heroicons-map" class="w-10 h-10 text-green-500" />
                <span class="font-bold">View Map</span>
            </UButton>
        </div>

        <!-- Summary by Categories -->
        <div class="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 mt-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xs font-black uppercase tracking-widest text-gray-500">Summary</h3>
                <span class="text-2xl font-black text-gray-900 dark:text-white">{{ locations.length }}</span>
            </div>

            <!-- Category Breakdown -->
            <div v-if="categorySummary.length > 0" class="space-y-2">
                <div
                    v-for="cat in categorySummary"
                    :key="cat.type"
                    class="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-700"
                >
                    <div class="flex items-center gap-2">
                        <UBadge :color="cat.color" variant="subtle" size="sm">
                            <UIcon :name="cat.icon" class="w-3 h-3" />
                        </UBadge>
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                            {{ cat.label }}
                        </span>
                    </div>
                    <span class="text-sm font-bold text-gray-900 dark:text-white">{{ cat.count }}</span>
                </div>
            </div>

            <!-- Empty state -->
            <div v-else class="text-center py-4">
                <p class="text-sm text-gray-500">No locations yet</p>
            </div>
        </div>

        <!-- Locations List -->
        <div v-if="locations.length > 0" class="mt-6">
            <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Recent Locations</h3>
            <div class="space-y-2">
                <div
                    v-for="loc in locations.slice(0, 10)"
                    :key="loc.id"
                    class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
                    @click="viewLocation(loc)"
                >
                    <div class="flex items-start gap-3">
                        <UBadge :color="getColorForType(loc.icon_type)" variant="subtle" class="mt-1">
                            <UIcon :name="getIconForType(loc.icon_type)" class="w-4 h-4" />
                        </UBadge>
                        <div class="flex-1 min-w-0">
                            <h4 class="font-bold text-sm text-gray-900 dark:text-white capitalize">
                                {{ loc.icon_type.replace('_', ' ') }}
                            </h4>
                            <p v-if="loc.description" class="text-xs text-gray-500 truncate">
                                {{ loc.description }}
                            </p>
                            <p class="text-xs text-gray-400 mt-1">
                                {{ new Date(loc.created_at).toLocaleDateString() }}
                            </p>
                        </div>
                        <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 text-gray-400" />
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Empty State -->
    <div v-else class="flex-1 flex flex-col items-center justify-center opacity-30">
        <UIcon name="i-heroicons-building-office-2" class="w-24 h-24 mb-4" />
        <p class="font-medium text-center">Please select a property<br>to begin.</p>
    </div>

    <!-- Add Location Modal -->
    <SimpleModal v-model="showAddModal" title="Add Location" width="w-full max-w-md">
        <div v-if="selectedProperty" class="p-6">
            <LocationPicker
                :property-code="selectedProperty.code"
                @location-saved="handleLocationSaved"
            />
        </div>
    </SimpleModal>

    <!-- Map Modal (Fullscreen) -->
    <Transition name="modal">
        <div
            v-if="showMapModal"
            class="fixed inset-0 z-50 bg-white dark:bg-gray-900"
            @click.stop
        >
            <div v-if="selectedProperty" class="h-screen flex flex-col">
                <!-- Header -->
                <div class="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <h3 class="font-bold text-lg text-gray-900 dark:text-white">{{ selectedProperty.name }} Map</h3>
                    <button
                        type="button"
                        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        @click="showMapModal = false"
                    >
                        <UIcon name="i-heroicons-x-mark" class="w-6 h-6 text-gray-500" />
                    </button>
                </div>
                <!-- Map Content -->
                <div class="flex-1 relative">
                    <LocationMap
                        :locations="locations"
                        :initial-center="selectedProperty?.latitude && selectedProperty?.longitude ? { lat: selectedProperty.latitude, lng: selectedProperty.longitude } : undefined"
                        @view-detail="handleViewDetailFromMap"
                        @view-notes="handleViewNotesFromMap"
                        @share-location="handleShareFromMap"
                    />
                </div>
            </div>
        </div>
    </Transition>

    <!-- Location Detail Modal -->
    <SimpleModal v-model="showDetailModal" width="w-full max-w-lg">
        <div v-if="selectedLocation" class="p-6">
            <!-- Header with Badge and Info -->
            <div class="flex items-center gap-3 mb-6">
                <UBadge :color="getColorForType(selectedLocation.icon_type)" size="lg">
                    <UIcon :name="getIconForType(selectedLocation.icon_type)" class="w-5 h-5" />
                </UBadge>
                <div>
                    <h3 class="font-bold text-lg capitalize text-gray-900 dark:text-white">
                        {{ selectedLocation.icon_type.replace('_', ' ') }}
                    </h3>
                    <p class="text-xs text-gray-500">
                        {{ new Date(selectedLocation.created_at).toLocaleString() }}
                    </p>
                </div>
            </div>

            <!-- Image Preview -->
            <div v-if="selectedLocation.source_image_url" class="mb-4">
                <NuxtImg
                    :src="selectedLocation.source_image_url"
                    class="w-full h-auto rounded-lg shadow-md"
                />
            </div>

            <!-- Description -->
            <div v-if="selectedLocation.description" class="mb-4">
                <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Description</label>
                <p class="text-sm text-gray-900 dark:text-white">{{ selectedLocation.description }}</p>
            </div>

            <!-- Coordinates -->
            <div class="mb-6">
                <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Coordinates</label>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <p class="text-xs text-gray-500 mb-1">Latitude</p>
                        <p class="text-sm font-mono font-medium text-gray-900 dark:text-white">{{ selectedLocation.latitude.toFixed(6) }}</p>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <p class="text-xs text-gray-500 mb-1">Longitude</p>
                        <p class="text-sm font-mono font-medium text-gray-900 dark:text-white">{{ selectedLocation.longitude.toFixed(6) }}</p>
                    </div>
                </div>
                <a 
                    :href="`https://www.google.com/maps/search/?api=1&query=${selectedLocation.latitude},${selectedLocation.longitude}`" 
                    target="_blank"
                    class="mt-3 block text-center text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors"
                >
                    <UIcon name="i-heroicons-globe-alt" class="w-3 h-3 mr-1 inline-block align-middle" />
                    Open in Google Maps (Public)
                </a>
            </div>

            <!-- Location Assets (Inventory) -->
            <div class="mb-6">
              <ClientOnly>
                <LocationAssetsWidget
                  location-type="location"
                  :location-id="selectedLocation.id"
                  title="Assets"
                />
              </ClientOnly>
            </div>

            <!-- Actions -->
            <div class="space-y-4">
                <UButton
                    color="primary"
                    variant="solid"
                    block
                    size="xl"
                    class="rounded-2xl border-2 border-primary-600 dark:border-primary-400 font-black uppercase tracking-widest shadow-lg shadow-primary-500/20 active:scale-95 transition-all h-14"
                    @click="viewNotes"
                >
                    <UIcon name="i-heroicons-document-text" class="w-5 h-5 mr-3" />
                    View Notes
                </UButton>

                <!-- Share Location Button (Information) -->
                <UButton
                    color="sky"
                    variant="outline"
                    block
                    size="xl"
                    class="rounded-2xl border-2 border-sky-500 font-black uppercase tracking-widest active:scale-95 transition-all h-14 bg-sky-50/50 dark:bg-sky-900/10"
                    @click="shareLocation"
                >
                    <UIcon name="i-heroicons-share" class="w-5 h-5 mr-3" />
                    Share Location
                </UButton>

                <!-- Secondary Actions Row -->
                <div class="flex gap-4">
                    <UButton
                        color="red"
                        variant="outline"
                        block
                        size="xl"
                        class="flex-1 rounded-2xl border-2 border-red-500 font-black uppercase tracking-widest active:scale-95 transition-all h-14 bg-red-50/50 dark:bg-red-900/10"
                        :loading="isDeleting"
                        @click="handleDelete"
                    >
                        <UIcon name="i-heroicons-trash" class="w-5 h-5 mr-2" />
                        Delete
                    </UButton>
                    <UButton
                        color="amber"
                        variant="outline"
                        size="xl"
                        class="flex-1 rounded-2xl border-2 border-amber-500 font-black uppercase tracking-widest active:scale-95 transition-all h-14 bg-amber-50/50 dark:bg-amber-900/10 justify-center"
                        @click="showDetailModal = false"
                    >
                        <UIcon name="i-heroicons-x-mark" class="w-5 h-5 mr-2" />
                        Close
                    </UButton>
                </div>
            </div>
        </div>
    </SimpleModal>

    <!-- Notes Modal -->
    <LocationNotesModal
        v-if="selectedLocation"
        v-model="showNotesModal"
        :location-id="selectedLocation.id"
        :location-name="selectedLocation.icon_type.replace('_', ' ')"
    />
    <!-- Context Helper (Client-only to avoid positioning hydration mismatch) -->
    <ClientOnly>
      <ContextHelper 
        title="Location Manager" 
        description="Geospatial Asset Tracking & Maintenance"
      >
        <div class="space-y-4 text-sm leading-relaxed">
        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Geospatial Assets</h3>
          <p>
            The Location Manager allows you to track physical assets (Electrical, Plumbing, HVAC) and incidents across the property using precise GPS coordinates.
          </p>
          <p class="mt-2 text-xs text-gray-400">
            <strong>Pro Tip:</strong> These location data can be ported or shared to facilitate field coordination.
          </p>
        </section>

        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Interactive Map</h3>
          <ul class="list-disc pl-5 space-y-2">
            <li>
              <strong>Add Location:</strong> Tap to drop a pin. 
              <div class="mt-1 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-800 text-xs">
                <strong>Optimization:</strong> The optimal method is by taking a photo. Geolocation is extracted from the photo's metadata. 
                <br><br>
                Note that the coordinates reflect the <em>camera's location</em>, not the subject. Take the photo as close to the asset as possible (ideally from directly above).
              </div>
            </li>
            <li><strong>View Map:</strong> Open a full-screen interactive view of all assets at the selected property.</li>
            <li class="mt-4">
              <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-800">
                <div class="flex items-center gap-2 mb-1">
                    <UIcon name="i-heroicons-share" class="w-4 h-4 text-green-600 dark:text-green-400" />
                    <strong class="text-green-900 dark:text-green-200">Sharing & Team Coordination</strong>
                </div>
                <p class="text-xs text-green-800 dark:text-green-300">
                    Click any location and use the <strong>Share</strong> button. Use the <strong>Copy</strong> feature to generate a detailed summary that you can paste directly into an email or message for team coordination.
                </p>
              </div>
            </li>
          </ul>
        </section>

        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Asset Categories</h3>
          <p>
            Assets are categorized into specialized groups (e.g., HVAC, Fire Safety) with color-coded badges for quick visual auditing in both the list and map views.
          </p>
        </section>

        <section>
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Recent Activity</h3>
          <p>
            The "Recent Locations" list provides a quick audit trail of the latest assets added or updated for the property.
          </p>
        </section>
      </div>
      </ContextHelper>
    </ClientOnly>
  </div>
</template>

<style scoped>
/* Modal transition for fullscreen map */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
