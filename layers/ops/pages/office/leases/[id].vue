<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSupabaseClient, useAsyncData, definePageMeta } from '#imports'
import type { TableColumn } from '../../../../table/types'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const leaseId = route.params.id as string

// Fetch Lease Details (Main Record)
const { data: lease, status, error } = await useAsyncData(`lease-${leaseId}`, async () => {
  const { data, error } = await supabase
    .from('view_table_leases')
    .select('*')
    .eq('id', leaseId)
    .single()

  if (error) throw error
  return data
})

// Fetch All Residents for this Tenancy (Contact Card)
const { data: household } = await useAsyncData(`lease-household-${leaseId}`, async () => {
  if (!lease.value?.tenancy_id) return []
  const { data, error } = await supabase
    .from('residents')
    .select('*')
    .eq('tenancy_id', lease.value.tenancy_id)
    .order('role', { ascending: true }) // Primary usually shows first
  
  if (error) throw error
  return data
})

// Fetch Lease Chronology (History of adjustments/renewals for this tenancy)
const { data: chronology, status: chronoStatus } = await useAsyncData(`lease-chronology-${leaseId}`, async () => {
  if (!lease.value?.tenancy_id) return []
  const { data, error } = await supabase
    .from('leases')
    .select('*')
    .eq('tenancy_id', lease.value.tenancy_id)
    .order('start_date', { ascending: false })
  
  if (error) throw error
  return data
})

// Fetch Unit Summary from linked asset
const { data: unitSummary } = await useAsyncData(`lease-unit-summary-${leaseId}`, async () => {
  if (!lease.value?.unit_id) return null
  const { data, error } = await supabase
    .from('view_table_units')
    .select('*')
    .eq('id', lease.value.unit_id)
    .single()
  
  if (error) throw error
  return data
})

const goBack = () => {
  router.back()
}

const chronoColumns: TableColumn[] = [
  { key: 'start_date', label: 'Start', sortable: true, width: '120px' },
  { key: 'end_date', label: 'End', sortable: true, width: '120px' },
  { key: 'rent_amount', label: 'Rent', sortable: true, align: 'right', width: '120px' },
  { key: 'lease_status', label: 'Status', align: 'center', width: '100px' }
]

const leaseStatusColors: Record<string, string> = {
  'Current': 'primary',
  'Notice': 'warning',
  'Future': 'primary',
  'Past': 'neutral',
  'Eviction': 'error'
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Breadcrumbs -->
    <nav class="flex mb-6 text-sm font-medium text-gray-600 dark:text-gray-400" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink to="/office/leases" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Leases</NuxtLink>
        </li>
        <li v-if="lease">
          <div class="flex items-center">
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span class="ml-1 md:ml-2 text-gray-900 dark:text-gray-100 font-bold">Lease for Unit {{ lease.unit_name }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Content Handling -->
    <div v-if="status === 'pending'" class="p-12 space-y-8">
      <USkeleton class="h-12 w-1/3" />
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <USkeleton class="h-64 lg:col-span-2" />
        <USkeleton class="h-64" />
      </div>
    </div>

    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/10 p-6 rounded-xl border border-red-200 dark:border-red-900/50 text-center">
      <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 class="text-lg font-bold text-red-700 dark:text-red-400">Error loading lease</h2>
      <p class="text-sm text-red-600 dark:text-red-500 mb-6">{{ error.message }}</p>
      <UButton color="error" @click="goBack">Back to List</UButton>
    </div>

    <div v-else-if="lease" class="space-y-8">
      <div class="mb-4">
        <UButton
          icon="i-heroicons-arrow-left"
          label="Back to Leases"
          color="neutral"
          variant="ghost"
          @click="goBack"
          class="-ml-2.5 dark:text-gray-400 dark:hover:text-white"
        />
      </div>

      <div class="border-b border-gray-200 dark:border-gray-800 pb-8 flex justify-between items-end">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <UBadge size="sm" :color="lease.is_active ? 'primary' : 'neutral'" variant="subtle" class="font-bold">
              {{ lease.lease_status }}
            </UBadge>
            <span v-if="lease.is_mtm" class="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">Month-to-Month</span>
          </div>
          <h1 class="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            {{ lease.resident_name }}
          </h1>
          <p class="text-xl text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-2">
            <span class="font-bold text-gray-900 dark:text-white">Unit {{ lease.unit_name }}</span>
            <span class="text-gray-300 dark:text-gray-700 mx-1">&middot;</span>
            <span>{{ lease.property_name }}</span>
          </p>
        </div>
        
        <div class="text-right">
          <p class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Contract Rent</p>
          <p class="text-4xl font-black text-primary-600 dark:text-primary-400 tracking-tighter">
            ${{ lease.rent_amount?.toLocaleString() }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="md:col-span-2 space-y-8">
          <!-- Resident Contact Card -->
          <div class="bg-white dark:bg-gray-900/80 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 class="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-users" class="text-gray-400" />
              Resident Contact
            </h3>
            <div class="space-y-4">
              <div v-for="member in household" :key="member.id" class="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 group hover:border-primary-500/50 transition-colors">
                <div class="flex items-center gap-4">
                   <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold">
                     {{ member.name?.[0] }}
                   </div>
                   <div>
                     <p class="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                       {{ member.name }}
                       <UBadge v-if="member.role === 'Primary'" size="xs" variant="subtle" color="primary">Primary</UBadge>
                     </p>
                     <p class="text-xs text-gray-500">{{ member.email || 'No email' }} &middot; {{ member.phone || 'No phone' }}</p>
                   </div>
                </div>
                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <UButton v-if="member.email" icon="i-heroicons-envelope" color="neutral" variant="ghost" size="xs" :to="`mailto:${member.email}`" />
                   <UButton v-if="member.phone" icon="i-heroicons-phone" color="neutral" variant="ghost" size="xs" :to="`tel:${member.phone}`" />
                   <UButton :to="`/office/residents/${member.id}`" icon="i-heroicons-arrow-top-right-on-square" color="primary" variant="ghost" size="xs" />
                </div>
              </div>
            </div>
          </div>

          <!-- Lease Chronology -->
          <div class="bg-white dark:bg-gray-900/80 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 class="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-clock" class="text-gray-400" />
              Lease Chronology
            </h3>
            <GenericDataTable
              :data="chronology || []"
              :columns="chronoColumns"
              :loading="chronoStatus === 'pending'"
              row-key="id"
              striped
            >
              <template #cell-start_date="{ value }">
                <span class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ new Date(value).toLocaleDateString() }}</span>
              </template>
              <template #cell-end_date="{ value }">
                <span class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ new Date(value).toLocaleDateString() }}</span>
              </template>
              <template #cell-rent_amount="{ value }">
                <span class="font-bold text-gray-900 dark:text-white">${{ value?.toLocaleString() }}</span>
              </template>
              <template #cell-lease_status="{ value }">
                <UBadge size="xs" variant="subtle" :color="leaseStatusColors[value] || 'neutral'">
                  {{ value }}
                </UBadge>
              </template>
            </GenericDataTable>
          </div>
        </div>

        <div class="space-y-6">
          <!-- Unit Summary -->
          <div v-if="unitSummary" class="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
            <h4 class="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 font-mono">Unit Summary</h4>
            <div class="space-y-6">
               <div v-if="unitSummary.primary_image_url" class="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 aspect-video bg-white dark:bg-gray-900">
                  <NuxtImg :src="unitSummary.primary_image_url" class="w-full h-full object-cover" />
               </div>
               <div class="grid grid-cols-2 gap-4">
                  <div class="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                    <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Area (SF)</p>
                    <p class="text-sm font-bold text-gray-900 dark:text-white">{{ unitSummary.sf?.toLocaleString() }} sqft</p>
                  </div>
                  <div class="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                    <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Floor</p>
                    <p class="text-sm font-bold text-gray-900 dark:text-white">Level {{ unitSummary.floor_number }}</p>
                  </div>
               </div>
               <div class="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Floor Plan</p>
                  <p class="text-sm font-black text-primary-600 dark:text-primary-400 underline decoration-2 underline-offset-4">
                     {{ unitSummary.floor_plan_marketing_name }}
                  </p>
               </div>
               <UButton :to="`/assets/units/${unitSummary.id}`" block color="neutral" variant="outline" class="rounded-xl font-bold">View Asset Details</UButton>
            </div>
          </div>

          <div class="bg-gray-900 dark:bg-gray-800/80 rounded-3xl p-8 text-white shadow-xl shadow-gray-900/10">
            <h4 class="text-xs font-black uppercase tracking-widest opacity-60 mb-6 font-mono text-primary-400">Lease Meta</h4>
            <div class="space-y-4 text-sm font-medium">
               <div class="flex justify-between items-center py-2 border-b border-white/5 opacity-80">
                <span>Lease ID</span>
                <span class="font-mono text-[10px]">{{ lease.id?.slice(0, 8) }}...</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-white/5 opacity-80">
                <span>Tenancy ID</span>
                <span class="font-mono text-[10px]">{{ lease.tenancy_id }}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-white/5 opacity-80">
                <span>Created At</span>
                <span>{{ lease.created_at ? new Date(lease.created_at).toLocaleDateString() : '-' }}</span>
              </div>
            </div>
            <div class="mt-8 pt-8 border-t border-white/10 italic text-[10px] opacity-40">
              Contract financial data from Yardi Data Layer
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
