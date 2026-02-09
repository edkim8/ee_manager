<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGeoLocation } from '../../composables/useGeoLocation'
import { useLocationService } from '../../composables/useLocationService'

// Props for linking
const props = defineProps<{
  propertyCode: string
}>()

const emit = defineEmits<{
  (e: 'location-saved'): void
}>()

const { extractCoordinates } = useGeoLocation()
const { addLocation, uploadLocationImage } = useLocationService()

// State
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const isExtracting = ref(false)
const isSaving = ref(false)
const errorMsg = ref<string | null>(null)

// Form State
const form = ref({
  latitude: null as number | null,
  longitude: null as number | null,
  icon_type: 'general' as 'electrical' | 'plumbing' | 'hvac' | 'structural' | 'lighting' | 'safety_fire' | 'landscaping' | 'pavement_parking' | 'waste' | 'incident' | 'general',
  description: ''
})

const iconOptions = [
  { label: 'Electrical (Panel, Transformer)', value: 'electrical' },
  { label: 'Plumbing (Mains, Shut-offs)', value: 'plumbing' },
  { label: 'HVAC (Condensers, Boilers)', value: 'hvac' },
  { label: 'Structural (Roof, Walls, Balconies)', value: 'structural' },
  { label: 'Lighting (Pole lights, Wall packs)', value: 'lighting' },
  { label: 'Safety/Fire (Extinguishers, Alarms)', value: 'safety_fire' },
  { label: 'Landscaping (Irrigation, Trees)', value: 'landscaping' },
  { label: 'Pavement/Parking (Asphalt, Carports)', value: 'pavement_parking' },
  { label: 'Waste (Dumpsters, Compactors)', value: 'waste' },
  { label: 'Incident (Vandalism, Noise, Issues)', value: 'incident' },
  { label: 'General / Other', value: 'general' }
]

const hasCoordinates = computed(() => form.value.latitude !== null && form.value.longitude !== null)

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0]
    previewUrl.value = URL.createObjectURL(selectedFile.value)
    errorMsg.value = null
    isExtracting.value = true

    try {
      const coords = await extractCoordinates(selectedFile.value)
      if (coords) {
        form.value.latitude = coords.lat
        form.value.longitude = coords.lng
      } else {
        // Soft error - just let them enter manually
        console.log('No GPS data found. User must enter manually.')
        // We don't necessarily need to show an error, just stop spinning.
        // Maybe show a toast/notification? For now, just a console log is better than blocking.
        // Or a helper message.
        errorMsg.value = 'No GPS data found. Please enter manually.'
      }
    } catch (e) {
      console.error(e)
      errorMsg.value = 'Error reading image data.'
    } finally {
      isExtracting.value = false
    }
  }
}

const saveLocation = async () => {
  if (!hasCoordinates.value) return
  isSaving.value = true
  errorMsg.value = null

  try {
    let imageUrl = ''
    if (selectedFile.value) {
      try {
        imageUrl = await uploadLocationImage(selectedFile.value)
      } catch (uploadError) {
        console.error('Upload failed:', uploadError)
        errorMsg.value = 'Failed to upload image. Saving without image.'
        // Proceed without image if upload fails? Or stop?
        // Let's stop and warn user.
        throw new Error('Image upload failed')
      }
    }

    // Debug: Log what we're about to save
    console.log('💾 Saving location with data:', {
      latitude: form.value.latitude,
      longitude: form.value.longitude,
      icon_type: form.value.icon_type,
      icon_type_type: typeof form.value.icon_type,
      description: form.value.description,
      property_code: props.propertyCode
    })

    await addLocation({
      latitude: form.value.latitude!,
      longitude: form.value.longitude!,
      icon_type: form.value.icon_type,
      description: form.value.description,
      source_image_url: imageUrl,
      property_code: props.propertyCode
    })

    // Reset
    selectedFile.value = null
    previewUrl.value = null
    form.value = {
      latitude: null,
      longitude: null,
      icon_type: 'general',
      description: ''
    }
    emit('location-saved')

  } catch (e: any) {
    errorMsg.value = e.message || 'Error saving location'
  } finally {
    isSaving.value = false
  }
}

const triggerFileInput = () => {
    fileInput.value?.click()
}
</script>

<template>
  <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
    <h3 class="text-lg font-bold mb-4">Add New Location</h3>

    <div class="space-y-4">
      <!-- File Input -->
      <div 
        class="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        @click="triggerFileInput"
      >
        <input 
            ref="fileInput"
            type="file" 
            accept="image/*" 
            capture="environment"
            class="hidden"
            @change="handleFileSelect"
        >
        <div v-if="!previewUrl" class="flex flex-col items-center gap-2">
            <UIcon name="i-heroicons-camera" class="w-8 h-8 text-gray-400" />
            <span class="text-sm text-gray-500 font-medium">Click to take photo or upload</span>
        </div>
        
        <div v-else class="relative inline-block">
            <NuxtImg :src="previewUrl" class="h-32 rounded-lg object-cover shadow-md" />
            <div 
                v-if="isExtracting"
                class="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg"
            >
                <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 text-white animate-spin" />
            </div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="errorMsg" class="text-red-500 text-xs font-bold text-center">
        {{ errorMsg }}
      </div>

      <!-- Coordinates Display / Manual Entry -->
      <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2" @click.stop>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Latitude</label>
              <UInput v-model.number="form.latitude" placeholder="33.29..." type="text" inputmode="decimal" />
          </div>
          <div class="space-y-2" @click.stop>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Longitude</label>
              <UInput v-model.number="form.longitude" placeholder="-111.84..." type="text" inputmode="decimal" />
          </div>
      </div>

      <!-- Form Fields -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Type Dropdown -->
        <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Type</label>
            <select
                v-model="form.icon_type"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
                <option v-for="option in iconOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                </option>
            </select>
        </div>

        <!-- Description Input -->
        <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Description</label>
            <UInput v-model="form.description" placeholder="e.g. Broken fuse box" class="w-full" />
        </div>
      </div>

      <!-- Action -->
      <UButton 
        block 
        color="primary" 
        :loading="isSaving"
        @click="saveLocation"
      >
        Save Location
      </UButton>
    </div>
  </div>
</template>
