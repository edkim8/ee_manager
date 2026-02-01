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

// Fetch Lease Detail from view
const { data: lease, status, error } = await useAsyncData(`lease-detail-${route.params.id}`, async () => {
  const { data, error } = await supabase
    .from('view_table_leases')
    .select('*')
    .eq('id', route.params.id)
    .single()
  
  if (error) throw error
  return data
})

const statusColors: Record<string, string> = {
  'Current': 'primary',
  'Active': 'primary',
  'Pending': 'warning',
  'Notice': 'warning',
  'Closed': 'neutral',
  'Terminated': 'error',
  'Expired': 'neutral'
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Breadcrumbs -->
    <div class="mb-6 flex items-center gap-2 text-sm text-gray-500">
      <NuxtLink to="/office/leases" class="hover:text-primary-600">Office</NuxtLink>
      <UIcon name="i-heroicons-chevron-right" class="w-3 h-3" />
      <NuxtLink to="/office/leases" class="hover:text-primary-600">Leases</NuxtLink>
      <UIcon name="i-heroicons-chevron-right" class="w-3 h-3" />
      <span class="text-gray-900 font-medium">Lease {{ lease?.id?.slice(0, 8) || '...' }}</span>
    </div>

    <div v-if="status === 'pending'" class="flex justify-center p-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <div v-else-if="error" class="p-8 bg-red-50 border border-red-200 rounded-3xl text-red-700">
      <h2 class="text-xl font-bold mb-2">Error Loading Lease</h2>
      <p>{{ error.message }}</p>
      <UButton color="error" variant="ghost" class="mt-4" to="/office/leases">
        Back to Leases
      </UButton>
    </div>

    <div v-else-if="lease" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left Column: Primary Info -->
      <div class="lg:col-span-2 space-y-8">
        <!-- Header Card -->
        <div class="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div class="absolute top-0 right-0 p-8 flex items-center gap-3">
            <UBadge 
              v-if="lease.is_mtm"
              size="lg"
              color="error"
              variant="solid"
              class="uppercase tracking-widest font-black animate-pulse"
            >
              MTM
            </UBadge>
            <UBadge 
              size="lg" 
              :color="lease.lease_status === 'Notice' ? 'warning' : (lease.is_active ? 'primary' : (statusColors[lease.lease_status] || 'neutral'))"
              variant="outline"
              class="uppercase tracking-widest font-bold"
            >
              {{ lease.lease_status }} {{ (lease.is_active && lease.lease_status !== 'Notice') ? '(Active)' : '' }}
            </UBadge>
          </div>

          <div class="flex items-center gap-6 mb-4">
            <div class="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 shadow-inner">
              <UIcon name="i-heroicons-document-text" class="w-12 h-12" />
            </div>
            <div>
              <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Lease Document</p>
              <h1 class="text-4xl font-black tracking-tight text-gray-900 mb-1">
                {{ lease.unit_name }} &middot; {{ lease.resident_name || 'Unassigned' }}
              </h1>
            </div>
          </div>
        </div>

        <!-- Financials Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Rent Card -->
          <div class="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                <UIcon name="i-heroicons-banknotes" class="w-6 h-6" />
              </div>
              <h3 class="text-xl font-bold">Financials</h3>
            </div>
            <div class="space-y-6">
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Monthly Rent</p>
                <p class="text-3xl font-black text-primary-600">
                  ${{ lease.rent_amount?.toLocaleString() || '0' }}
                </p>
              </div>
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Security Deposit</p>
                <p class="text-xl font-bold text-gray-600">
                  ${{ lease.deposit_amount?.toLocaleString() || '0' }}
                </p>
              </div>
              <div class="pt-4 border-t border-gray-100">
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Household Size</p>
                <p class="text-xl font-bold text-gray-700">
                  {{ lease.household_count || 0 }} {{ (lease.household_count === 1) ? 'Person' : 'People' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Dates Card -->
          <div class="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <UIcon name="i-heroicons-calendar-days" class="w-6 h-6" />
              </div>
              <h3 class="text-xl font-bold">Lease Term</h3>
            </div>
            <div class="space-y-6">
              <div class="mb-4 pb-4 border-b border-gray-100">
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Tenancy Move-in</p>
                <p class="text-xl font-bold text-primary-600">
                  {{ lease.move_in_date ? new Date(lease.move_in_date).toLocaleDateString() : 'Not set' }}
                </p>
              </div>
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Lease Start Date</p>
                <p class="text-xl font-bold text-gray-900">
                  {{ lease.start_date ? new Date(lease.start_date).toLocaleDateString() : 'Not set' }}
                </p>
              </div>
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Lease End Date</p>
                <p class="text-xl font-bold text-gray-900">
                  {{ lease.end_date ? new Date(lease.end_date).toLocaleDateString() : 'Not set' }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- System Metadata -->
        <div class="bg-gray-50/50 p-6 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-400 flex justify-between">
           <div>System ID: {{ lease.id }}</div>
           <div>Tenancy Reference: {{ lease.tenancy_id }}</div>
        </div>
      </div>

      <!-- Right Column: Connections -->
      <div class="space-y-8">
        <div class="bg-gray-50 p-8 rounded-3xl border border-gray-200">
          <h3 class="text-sm font-black uppercase text-gray-400 mb-6 tracking-widest">Connections</h3>
          
          <div class="space-y-8">
            <!-- Resident -->
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-primary-600 flex-shrink-0">
                <UIcon name="i-heroicons-user" class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Primary Resident</p>
                <NuxtLink 
                  v-if="lease.resident_id"
                  :to="`/office/residents/${lease.resident_id}`"
                  class="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors"
                >
                  {{ lease.resident_name }}
                </NuxtLink>
                <p v-else class="text-xl font-bold text-gray-400 italic">No resident</p>
              </div>
            </div>

            <!-- Unit -->
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-primary-600 flex-shrink-0">
                <UIcon name="i-heroicons-key" class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase mb-1">Assigned Unit</p>
                <NuxtLink 
                  :to="`/assets/units/${lease.unit_id}`"
                  class="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors"
                >
                  Unit {{ lease.unit_name }}
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
                  :to="`/assets/buildings/${lease.building_id}`"
                  class="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors"
                >
                  {{ lease.building_name }}
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
