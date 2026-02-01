<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSupabaseClient, useAsyncData, definePageMeta } from '#imports'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const unitId = route.params.id as string

// Fetch Unit Details
const { data: unit, status, error } = await useAsyncData(`unit-${unitId}`, async () => {
  const { data, error } = await supabase
    .from('view_table_units')
    .select('*')
    .eq('id', unitId)
    .single()

  if (error) throw error
  return data
})

const goBack = () => {
  router.push('/assets/units')
}

// Computed Image URL - Ensure absolute path from public directory
const imageUrl = computed(() => {
  const path = unit.value?.primary_image_url
  if (!path) return null
  if (!path.startsWith('/') && !path.startsWith('http')) {
    return `/${path}`
  }
  return path
})
const tenancyStatusColors: Record<string, string> = {
  'Current': 'primary',
  'Past': 'error',
  'Future': 'primary',
  'Notice': 'warning'
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Breadcrumbs -->
    <nav class="flex mb-6 text-sm font-medium text-gray-500" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink to="/assets/units" class="hover:text-primary-600">Units</NuxtLink>
        </li>
        <li v-if="unit">
          <div class="flex items-center">
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400" />
            <span class="ml-1 md:ml-2 text-gray-700 font-bold">Unit {{ unit.unit_name }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Content -->
    <div v-if="unit" class="space-y-8">
      <div class="mb-4">
        <UButton
          icon="i-heroicons-arrow-left"
          label="Back to List"
          color="neutral"
          variant="ghost"
          @click="router.back()"
          class="-ml-2.5"
        />
      </div>

      <div class="border-b border-gray-200 pb-8 flex justify-between items-end">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-700 uppercase">Unit</span>
            <span class="text-gray-400 font-mono">{{ unit.property_code }}</span>
          </div>
          <h1 class="text-4xl font-black text-gray-900 tracking-tight">Unit {{ unit.unit_name }}</h1>
          <p class="text-xl text-gray-500 mt-2">
            <NuxtLink 
              v-if="unit.building_id"
              :to="`/assets/buildings/${unit.building_id}`"
              class="hover:text-primary-600 underline-offset-4 hover:underline transition-colors"
            >
              {{ unit.building_name }}
            </NuxtLink>
            <span v-else>{{ unit.building_name || '-' }}</span>
            &middot; Floor {{ unit.floor_number }}
          </p>
        </div>
        
        <div class="pb-2 flex gap-2">
          <UBadge v-if="unit.tenancy_status" size="lg" variant="outline" :color="tenancyStatusColors[unit.tenancy_status] || 'neutral'">
            Tenancy: {{ unit.tenancy_status }}
          </UBadge>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="md:col-span-2 space-y-8">
          <div class="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
            <h3 class="text-xl font-bold mb-6">Details</h3>
            <div class="grid grid-cols-2 gap-y-6">
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Floor Plan</p>
                <p class="text-lg font-bold text-gray-900">
                  <NuxtLink 
                    v-if="unit.floor_plan_id"
                    :to="`/assets/floor-plans/${unit.floor_plan_id}`"
                    class="text-primary-600 hover:text-primary-700 underline-offset-4 hover:underline transition-colors"
                  >
                    {{ unit.floor_plan_marketing_name }} ({{ unit.floor_plan_code }})
                  </NuxtLink>
                  <span v-else>{{ unit.floor_plan_marketing_name }} ({{ unit.floor_plan_code }})</span>
                </p>
              </div>
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Usage Type</p>
                <p class="text-lg font-bold text-gray-900 uppercase">{{ unit.usage_type }}</p>
              </div>
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Area (SF)</p>
                <p class="text-lg text-gray-600">{{ unit.sf?.toLocaleString() || '-' }} sqft</p>
              </div>
              <div class="col-span-2 pt-4 border-t border-gray-100">
                <p class="text-xs font-bold text-gray-400 uppercase mb-2">Description</p>
                <p class="text-gray-600 leading-relaxed">{{ unit.description || 'No description provided.' }}</p>
              </div>
            </div>
          </div>

          <!-- Occupancy Details -->
          <div class="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
            <h3 class="text-xl font-bold mb-6">Occupancy</h3>
            <div class="grid grid-cols-2 gap-y-6">
              <div class="col-span-2">
                <p class="text-xs font-bold text-gray-400 uppercase mb-2">Resident</p>
                <div v-if="unit.resident_name" class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600">
                    <UIcon name="i-heroicons-user" class="w-6 h-6" />
                  </div>
                  <div>
                    <p class="text-lg font-bold text-gray-700">{{ unit.resident_name }}</p>
                    <p class="text-sm text-gray-500">Primary Resident</p>
                  </div>
                </div>
                <div v-else class="text-gray-500 italic">No active resident</div>
              </div>
              
              <div class="pt-4 border-t border-gray-100">
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Move-in Date</p>
                <p class="text-lg font-bold text-gray-900">{{ unit.move_in_date ? new Date(unit.move_in_date).toLocaleDateString() : '-' }}</p>
              </div>
              
              <div class="pt-4 border-t border-gray-100">
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Move-out Date</p>
                <p class="text-lg font-bold text-gray-900">{{ unit.move_out_date ? new Date(unit.move_out_date).toLocaleDateString() : '-' }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div v-if="imageUrl" class="rounded-3xl overflow-hidden border border-gray-200">
            <NuxtImg :src="imageUrl" class="w-full h-auto object-cover" placeholder />
          </div>
          
          <div class="bg-gray-50 p-6 rounded-2xl border border-gray-200">
            <h4 class="text-sm font-bold text-gray-900 mb-4">Quick Actions</h4>
            <div class="space-y-3">
              <UButton class="w-full" variant="outline" label="Sync with Yardi" icon="i-heroicons-arrow-path" />
              <UButton class="w-full" variant="outline" label="Manage Flags" icon="i-heroicons-flag" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
