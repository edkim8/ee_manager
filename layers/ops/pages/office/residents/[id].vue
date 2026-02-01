<script setup lang="ts">
import { useRoute } from 'vue-router'
import { usePropertyState } from '../../../../base/composables/usePropertyState'
import { useSupabaseClient, useAsyncData, navigateTo, definePageMeta } from '#imports'

const route = useRoute()
const supabase = useSupabaseClient()
const { activeProperty } = usePropertyState()

definePageMeta({
  layout: 'dashboard'
})

// Fetch Resident Detail from view
const { data: resident, status, error } = await useAsyncData(`resident-detail-${route.params.id}`, async () => {
  const { data, error } = await supabase
    .from('view_table_residents')
    .select('*')
    .eq('id', route.params.id)
    .single()
  
  if (error) throw error
  return data
})

const tenancyStatusColors: Record<string, string> = {
  'Current': 'primary',
  'Past': 'error',
  'Future': 'primary',
  'Notice': 'warning',
  'Applicant': 'neutral',
  'Eviction': 'error',
  'Denied': 'error',
  'Canceled': 'neutral'
}

const roleColors: Record<string, string> = {
  'Primary': 'primary',
  'Roommate': 'neutral',
  'Occupant': 'neutral',
  'Guarantor': 'warning'
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Breadcrumbs -->
    <div class="mb-6 flex items-center gap-2 text-sm text-gray-500">
      <NuxtLink to="/office/residents" class="hover:text-primary-600">Office</NuxtLink>
      <UIcon name="i-heroicons-chevron-right" class="w-3 h-3" />
      <NuxtLink to="/office/residents" class="hover:text-primary-600">Residents</NuxtLink>
      <UIcon name="i-heroicons-chevron-right" class="w-3 h-3" />
      <span class="text-gray-900 font-medium">{{ resident?.name || 'Loading...' }}</span>
    </div>

    <div v-if="status === 'pending'" class="flex justify-center p-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <div v-else-if="error" class="p-8 bg-red-50 border border-red-200 rounded-3xl text-red-700">
      <h2 class="text-xl font-bold mb-2">Error Loading Resident</h2>
      <p>{{ error.message }}</p>
      <UButton color="error" variant="ghost" class="mt-4" to="/office/residents">
        Back to Residents
      </UButton>
    </div>

    <div v-else-if="resident" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left Column: Primary Info -->
      <div class="lg:col-span-2 space-y-8">
        <!-- Header Card -->
        <div class="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div class="absolute top-0 right-0 p-8">
            <div class="flex flex-col items-end gap-2">
              <UBadge 
                size="lg" 
                :color="tenancyStatusColors[resident.tenancy_status] || 'neutral'"
                variant="outline"
              >
                {{ resident.tenancy_status }}
              </UBadge>
              <UBadge 
                size="md" 
                :color="roleColors[resident.role] || 'neutral'"
                variant="subtle"
              >
                {{ resident.role }}
              </UBadge>
            </div>
          </div>

          <div class="flex items-center gap-6 mb-4">
            <div class="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 shadow-inner">
              <UIcon name="i-heroicons-user" class="w-12 h-12" />
            </div>
            <div>
              <h1 class="text-4xl font-black tracking-tight text-gray-900 mb-1">
                {{ resident.name }}
              </h1>
              <p class="text-xl text-gray-500 font-medium">
                {{ resident.building_name }} &middot; Unit {{ resident.unit_name }}
              </p>
            </div>
          </div>
        </div>

        <!-- Details Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Profile Card -->
          <div class="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
            <div class="flex items-center gap-3 mb-6">
              <UIcon name="i-heroicons-identification" class="w-6 h-6 text-primary-500" />
              <h3 class="text-xl font-bold">Contact Info</h3>
            </div>
            <div class="space-y-6">
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Email Address</p>
                <p class="text-lg font-bold text-gray-900">{{ resident.email || 'No email provided' }}</p>
              </div>
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Phone Number</p>
                <p class="text-lg font-bold text-gray-900">{{ resident.phone || 'No phone provided' }}</p>
              </div>
            </div>
          </div>

          <!-- Tenancy & Lease Card -->
          <div class="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
            <div class="flex items-center gap-3 mb-6">
              <UIcon name="i-heroicons-calendar-days" class="w-6 h-6 text-primary-500" />
              <h3 class="text-xl font-bold">Tenancy & Lease</h3>
            </div>
            <div class="grid grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Move-in Date</p>
                <p class="text-lg font-bold text-gray-900">
                  {{ resident.move_in_date ? new Date(resident.move_in_date).toLocaleDateString() : 'Not set' }}
                </p>
              </div>
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Move-out Date</p>
                <p class="text-lg font-bold text-gray-900">
                  {{ resident.move_out_date ? new Date(resident.move_out_date).toLocaleDateString() : 'Not set' }}
                </p>
              </div>
              <div class="pt-4 border-t border-gray-100">
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Lease Start</p>
                <p class="text-lg font-bold text-blue-600">
                  {{ resident.lease_start_date ? new Date(resident.lease_start_date).toLocaleDateString() : 'Not set' }}
                </p>
              </div>
              <div class="pt-4 border-t border-gray-100">
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Lease End</p>
                <p class="text-lg font-bold text-blue-600">
                  {{ resident.lease_end_date ? new Date(resident.lease_end_date).toLocaleDateString() : 'Not set' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Relational Data -->
      <div class="space-y-8">
        <!-- Unit Info Card -->
        <div class="bg-gray-50 p-8 rounded-3xl border border-gray-200">
          <h3 class="text-sm font-black uppercase text-gray-400 mb-6 tracking-widest">Lease Property</h3>
          
          <div class="space-y-8">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-primary-600 flex-shrink-0">
                <UIcon name="i-heroicons-key" class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Assigned Unit</p>
                <NuxtLink 
                  :to="`/assets/units/${resident.unit_id}`"
                  class="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors"
                >
                  Unit {{ resident.unit_name }}
                </NuxtLink>
              </div>
            </div>

            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-primary-600 flex-shrink-0">
                <UIcon name="i-heroicons-home-modern" class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Building</p>
                <NuxtLink 
                  :to="`/assets/buildings/${resident.building_id}`"
                  class="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors"
                >
                  {{ resident.building_name }}
                </NuxtLink>
              </div>
            </div>

            <div class="pt-6 border-t border-gray-200">
              <UButton 
                block 
                color="neutral" 
                variant="outline" 
                size="lg" 
                icon="i-heroicons-document-magnifying-glass"
                :to="`/office/leases?tenancy_id=${resident.tenancy_id}`"
              >
                View Lease Details
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
