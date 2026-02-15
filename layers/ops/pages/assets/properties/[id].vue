<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSupabaseClient, useAsyncData, definePageMeta } from '#imports'
import ImageModal from '../../../../base/components/modals/ImageModal.vue'
import ImageGalleryItem from '../../../../base/components/ImageGalleryItem.vue'
import SimpleTabs from '../../../../base/components/SimpleTabs.vue'
import LocationMap from '../../../components/map/LocationMap.vue'
import LocationPicker from '../../../components/map/LocationPicker.vue'
import AttachmentManager from '../../../../base/components/AttachmentManager.vue'
import { useLocationService } from '../../../composables/useLocationService'
import { useImageActions } from '../../../../base/composables/useImageActions'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const propertyId = route.params.id as string

const { isModalOpen: showImageModal, activeImage, openImageModal } = useImageActions()
const activeTab = ref('overview')
const { fetchLocations } = useLocationService()

const tabs = [
  { label: 'Overview', value: 'overview' },
  { label: 'Locations', value: 'locations' }
]


// Fetch Property Details
const { data: property, status, error } = await useAsyncData(`property-${propertyId}`, async () => {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single()

  if (error) throw error
  return data
})

// Fetch Building Count for this property
const { data: buildingsSummary } = await useAsyncData(`property-buildings-count-${propertyId}`, async () => {
  if (!property.value) return { count: 0 }
  
  const { count, error } = await supabase
    .from('buildings')
    .select('*', { count: 'exact', head: true })
    .eq('property_code', property.value.code)
  
  if (error) throw error
  
  return { count: count || 0 }
})

// Fetch Floor Plans Summary for this property
const { data: floorPlansSummary } = await useAsyncData(`property-floor-plans-summary-${propertyId}`, async () => {
  if (!property.value) return { count: 0, minSf: 0, maxSf: 0 }
  
  const { data, count, error } = await supabase
    .from('floor_plans')
    .select('area_sqft', { count: 'exact' })
    .eq('property_code', property.value.code)
  
  if (error) throw error
  if (!data || data.length === 0) return { count: 0, minSf: 0, maxSf: 0 }

  const sfs = data.map((fp: any) => fp.area_sqft || 0).filter((sf: number) => sf > 0)
  return {
    count: count || 0,
    minSf: sfs.length > 0 ? Math.min(...sfs) : 0,
    maxSf: sfs.length > 0 ? Math.max(...sfs) : 0
  }
})

// Fetch Units Count for this property
const { data: unitsSummary } = await useAsyncData(`property-units-count-${propertyId}`, async () => {
  if (!property.value) return { count: 0 }
  
  const { count, error } = await supabase
    .from('units')
    .select('*', { count: 'exact', head: true })
    .eq('property_code', property.value.code)
  
  if (error) throw error
  
  return { count: count || 0 }
})

const goBack = () => {
  router.push('/assets/properties')
}

// Computed Image URL - Ensure absolute path from public directory
const imageUrl = computed(() => {
  const path = property.value?.primary_image_url
  if (!path) return null
  if (!path.startsWith('/') && !path.startsWith('http')) {
    return `/${path}`
  }
  return path
})

// Fetch Locations
const { data: locations, refresh: refreshLocations } = await useAsyncData(`property-locations-${propertyId}`, async () => {
  if (!property.value?.code) return []
  return await fetchLocations(property.value.code)
})

const handleLocationSaved = async () => {
  await refreshLocations()
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Breadcrumbs -->
    <nav class="flex mb-6 text-sm font-medium text-gray-600 dark:text-gray-400" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink to="/assets/properties" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Properties</NuxtLink>
        </li>
        <li v-if="property">
          <div class="flex items-center">
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span class="ml-1 md:ml-2 text-gray-900 dark:text-gray-100 font-bold">{{ property.name }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Content Handling -->
    <div v-if="status === 'pending'" class="p-12 space-y-8">
      <USkeleton class="h-12 w-1/3" />
      <div class="space-y-4">
        <USkeleton class="h-96 w-full rounded-3xl" />
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="lg:col-span-2 space-y-6">
             <USkeleton class="h-64" />
             <div class="grid grid-cols-3 gap-4">
                <USkeleton class="h-40" />
                <USkeleton class="h-40" />
                <USkeleton class="h-40" />
             </div>
          </div>
          <USkeleton class="h-64" />
        </div>
      </div>
    </div>

    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/10 p-6 rounded-xl border border-red-200 dark:border-red-900/50 text-center">
      <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 class="text-lg font-bold text-red-700 dark:text-red-400">Error loading property</h2>
      <p class="text-sm text-red-600 dark:text-red-500 mb-6">{{ error.message }}</p>
      <UButton color="error" @click="goBack">Back to List</UButton>
    </div>

    <div v-else-if="property" class="space-y-8">
      <div class="mb-4">
        <UButton
          icon="i-heroicons-arrow-left"
          label="Back to List"
          color="neutral"
          variant="ghost"
          @click="router.back()"
          class="-ml-2.5 dark:text-gray-400 dark:hover:text-white"
        />
      </div>

      <!-- Property Header -->
      <div class="border-b border-gray-200 dark:border-gray-800 pb-8">
        <div class="flex items-center gap-3 mb-2">
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 uppercase">Property</span>
          <span class="text-gray-400 dark:text-gray-600 font-mono">{{ property.code }}</span>
        </div>
        <h1 class="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{{ property.name }}</h1>
        <p class="text-xl text-gray-600 dark:text-gray-400 mt-2">{{ property.street_address }}, {{ property.city }}, {{ property.state_code }} {{ property.postal_code }}</p>

        <!-- Mobile-only Attachment Manager -->
        <div class="mt-8 md:hidden">
          <AttachmentManager 
            :record-id="propertyId" 
            record-type="property" 
            title="Photos & Files"
          />
        </div>
      </div>

      <!-- Primary Property Image -->
      <div v-if="imageUrl" class="relative">
        <ImageGalleryItem 
          :src="imageUrl" 
          :alt="property.name"
          aspect-ratio="h-[400px]"
        />
      </div>

      <SimpleTabs v-model="activeTab" :items="tabs">
        <template #overview>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div class="md:col-span-2 space-y-6">
                <!-- Key Stats Overlay/Header -->
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div class="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
                    <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Total Units</p>
                    <p class="text-3xl font-black text-gray-900 dark:text-white">{{ unitsSummary?.count || property.total_unit_count }}</p>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
                    <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Year Built</p>
                    <p class="text-3xl font-black text-gray-900 dark:text-white">{{ property.year_built }}</p>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
                    <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Status</p>
                    <p class="text-xl font-black text-green-600 dark:text-green-400 uppercase">Active</p>
                    </div>
                </div>

                <!-- Summary Blocks Grid (3 Columns) -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <!-- Buildings Card -->
                    <div class="bg-white dark:bg-gray-900/80 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center text-center">
                    <div class="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                        <UIcon name="i-heroicons-building-office-2" class="w-6 h-6 text-primary-500" />
                    </div>
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-1">Buildings</h3>
                    <p class="text-2xl font-black text-gray-900 dark:text-white mb-1">{{ buildingsSummary?.count || 0 }}</p>
                    <p class="text-[10px] text-gray-500 dark:text-gray-500 uppercase font-black mb-6 tracking-wider">Registered</p>
                    <UButton
                        to="/assets/buildings"
                        color="primary"
                        variant="soft"
                        size="sm"
                        label="Buildings Table"
                        class="mt-auto w-full rounded-xl font-bold justify-center"
                    />
                    </div>

                    <!-- Floor Plans Card -->
                    <div class="bg-white dark:bg-gray-900/80 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center text-center">
                    <div class="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                        <UIcon name="i-heroicons-document-duplicate" class="w-6 h-6 text-primary-500" />
                    </div>
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-1">Floor Plans</h3>
                    <p class="text-2xl font-black text-gray-900 dark:text-white mb-1">{{ floorPlansSummary?.count || 0 }}</p>
                    <p class="text-[10px] text-gray-500 dark:text-gray-500 uppercase font-black mb-6 tracking-wider">
                        {{ floorPlansSummary?.minSf?.toLocaleString() }}-{{ floorPlansSummary?.maxSf?.toLocaleString() }} sf
                    </p>
                    <UButton
                        to="/assets/floor-plans"
                        color="primary"
                        variant="soft"
                        size="sm"
                        label="Floor Plans Table"
                        class="mt-auto w-full rounded-xl font-bold justify-center"
                    />
                    </div>

                    <!-- Units Card -->
                    <div class="bg-white dark:bg-gray-900/80 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center text-center">
                    <div class="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                        <UIcon name="i-heroicons-home" class="w-6 h-6 text-primary-500" />
                    </div>
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-1">Units</h3>
                    <p class="text-2xl font-black text-gray-900 dark:text-white mb-1">{{ unitsSummary?.count || 0 }}</p>
                    <p class="text-[10px] text-gray-500 dark:text-gray-500 uppercase font-black mb-6 tracking-wider">Total Inventory</p>
                    <UButton
                        to="/assets/units"
                        color="primary"
                        variant="soft"
                        size="sm"
                        label="Units Table"
                        class="mt-auto w-full rounded-xl font-bold justify-center"
                    />
                    </div>
                </div>

                <!-- Description Card -->
                <div class="bg-white dark:bg-gray-900/80 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white tracking-tight">About Property</h3>
                    <p class="text-gray-600 dark:text-gray-400 leading-relaxed">{{ property.description || 'No description available for this property.' }}</p>
                </div>
                </div>

                <div class="space-y-6">
                <!-- Contact & Info Sidebar -->
                <div class="bg-gray-900 dark:bg-gray-800/80 rounded-3xl p-8 text-white shadow-xl shadow-gray-900/10">
                    <h4 class="text-xs font-black uppercase tracking-widest opacity-60 mb-6 font-mono">Contact & Info</h4>
                    <div class="space-y-4">
                    <UButton
                        v-if="property.website_url"
                        :to="property.website_url"
                        target="_blank"
                        variant="solid"
                        color="warning"
                        class="w-full justify-center px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-warning-500/20"
                        icon="i-heroicons-globe-alt"
                        label="Visit Website"
                    />
                    <div class="text-sm opacity-80 pt-6 border-t border-white/10">
                        <p class="mb-1 italic opacity-60">Internal ID:</p>
                        <p class="font-mono text-[10px] truncate opacity-90">{{ property.id }}</p>
                    </div>
                    </div>
                </div>

                <!-- Property Attachments - Desktop Sidebar -->
                <div class="hidden md:block bg-white dark:bg-gray-900/80 p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm shadow-gray-200/50 dark:shadow-none">
                  <AttachmentManager 
                    :record-id="propertyId" 
                    record-type="property" 
                    title="Property Photos & Files"
                  />
                </div>

                <!-- Quick Actions/Notes -->
                <div class="p-6 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <h4 class="text-sm font-bold text-gray-900 dark:text-white mb-3 tracking-tight">Sync Status</h4>
                    <div class="flex items-center gap-2 mb-2">
                        <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider text-[10px] font-black italic">Live & Synced</span>
                    </div>
                    <ClientOnly>
                      <p class="text-[9px] text-gray-500 dark:text-gray-500 uppercase font-black italic">Last Updated: {{ new Date().toLocaleDateString() }}</p>
                    </ClientOnly>
                </div>
                </div>
            </div>
        </template>

        <template #locations>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div class="md:col-span-2 min-h-[500px]">
                    <LocationMap 
                        :locations="locations || []" 
                        :initial-center="property.latitude && property.longitude ? { lat: property.latitude, lng: property.longitude } : undefined"
                    />
                </div>
                <div>
                   <LocationPicker 
                      :property-code="property.code" 
                      @location-saved="handleLocationSaved" 
                   /> 
                </div>
            </div>
        </template>
      </SimpleTabs>
    </div>

    <!-- Reusable Image Modal -->
    <ImageModal
      v-if="showImageModal"
      v-model="showImageModal"
      :src="activeImage.src"
      :alt="activeImage.alt"
    />
  </div>
</template>
