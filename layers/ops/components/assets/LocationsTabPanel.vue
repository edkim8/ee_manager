<script setup lang="ts">
import { computed } from 'vue'
import { useAsyncData } from '#imports'
import LocationMap from '../map/LocationMap.vue'
import LocationPicker from '../map/LocationPicker.vue'
import { useLocationService } from '../../composables/useLocationService'

const props = defineProps<{
  propertyCode: string
}>()

const { fetchLocations } = useLocationService()

const { data: locations, refresh: refreshLocations } = useAsyncData(
  `locations-panel-${props.propertyCode}`,
  () => fetchLocations(props.propertyCode)
)

// LocationMap expects { id: string } but LocationRecord has id?: string — cast to satisfy the prop
const locationList = computed((): any[] => locations.value ?? [])

const handleLocationSaved = async () => {
  await refreshLocations()
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
    <div class="md:col-span-2 min-h-[500px]">
      <LocationMap :locations="locationList" />
    </div>
    <div>
      <LocationPicker
        :property-code="propertyCode"
        @location-saved="handleLocationSaved"
      />
    </div>
  </div>
</template>
