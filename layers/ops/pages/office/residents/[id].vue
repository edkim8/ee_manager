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
const residentId = route.params.id as string

// Fetch Resident Details
const { data: resident, status, error } = await useAsyncData(`resident-${residentId}`, async () => {
  const { data, error } = await supabase
    .from('view_table_residents')
    .select('*')
    .eq('id', residentId)
    .single()

  if (error) throw error
  return data
})

// Fetch Active Lease for this resident
const { data: activeLease, status: leaseStatus } = await useAsyncData(`resident-active-lease-${residentId}`, async () => {
  if (!resident.value?.tenancy_id) return null
  const { data, error } = await supabase
    .from('view_table_leases')
    .select('*')
    .eq('tenancy_id', resident.value.tenancy_id)
    .eq('lease_status', 'Current')
    .maybeSingle()
  
  if (error) throw error
  return data
})

// Fetch Payment History (Delinquencies)
const { data: paymentHistory, status: paymentStatus } = await useAsyncData(`resident-payment-history-${residentId}`, async () => {
  if (!resident.value?.tenancy_id) return []
  const { data, error } = await supabase
    .from('delinquencies')
    .select('*')
    .eq('tenancy_id', resident.value.tenancy_id)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
})

const goBack = () => {
  router.back()
}

const statusColors: Record<string, string> = {
  'Current': 'primary',
  'Past': 'error',
  'Future': 'primary',
  'Notice': 'warning',
  'Applicant': 'neutral'
}

const paymentColumns = [
  { key: 'created_at', label: 'Report Date', sortable: true },
  { key: 'total_unpaid', label: 'Unpaid', sortable: true, align: 'right' },
  { key: 'balance', label: 'Total Balance', sortable: true, align: 'right' },
  { key: 'is_active', label: 'Status', align: 'center' }
]
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Breadcrumbs -->
    <nav class="flex mb-6 text-sm font-medium text-gray-600 dark:text-gray-400" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink to="/office/residents" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Residents</NuxtLink>
        </li>
        <li v-if="resident">
          <div class="flex items-center">
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span class="ml-1 md:ml-2 text-gray-900 dark:text-gray-100 font-bold">{{ resident.name }}</span>
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
      <h2 class="text-lg font-bold text-red-700 dark:text-red-400">Error loading resident</h2>
      <p class="text-sm text-red-600 dark:text-red-500 mb-6">{{ error.message }}</p>
      <UButton color="error" @click="goBack">Back to List</UButton>
    </div>

    <div v-else-if="resident" class="space-y-8">
      <div class="mb-4">
        <UButton
          icon="i-heroicons-arrow-left"
          label="Back to Residents"
          color="neutral"
          variant="ghost"
          @click="goBack"
          class="-ml-2.5 dark:text-gray-400 dark:hover:text-white"
        />
      </div>

      <div class="border-b border-gray-200 dark:border-gray-800 pb-8 flex justify-between items-end">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <UBadge size="sm" :color="statusColors[resident.tenancy_status] || 'neutral'" variant="subtle" class="font-bold">
              {{ resident.tenancy_status }}
            </UBadge>
            <span class="text-gray-400 dark:text-gray-600 font-mono text-sm">{{ resident.property_code }}</span>
          </div>
          <h1 class="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{{ resident.name }}</h1>
          <p class="text-xl text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-2">
            <template v-if="resident.unit_id">
              <NuxtLink 
                :to="`/assets/units/${resident.unit_id}`"
                class="font-bold text-primary-600 dark:text-primary-400 hover:underline underline-offset-4 flex items-center gap-1.5"
              >
                <UIcon name="i-heroicons-home" class="w-5 h-5" />
                Unit {{ resident.unit_name }}
              </NuxtLink>
            </template>
            <span v-else class="italic">No Unit Assigned</span>
            <span class="text-gray-300 dark:text-gray-700 mx-1">&middot;</span>
            <span>{{ resident.building_name }}</span>
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-8">
          <!-- Active Lease Summary -->
          <div v-if="activeLease" class="bg-primary-50 dark:bg-primary-900/10 p-8 rounded-3xl border border-primary-100 dark:border-primary-800/50 shadow-sm relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
               <UIcon name="i-heroicons-document-text" class="w-24 h-24" />
            </div>
            <h3 class="text-xl font-bold mb-6 text-primary-900 dark:text-primary-100 flex items-center gap-2">
              <UIcon name="i-heroicons-check-badge" class="w-6 h-6" />
              Active Lease Summary
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
              <div>
                <p class="text-[10px] font-black text-primary-600 dark:text-primary-500 uppercase tracking-widest mb-1">Monthly Rent</p>
                <p class="text-2xl font-black text-primary-900 dark:text-primary-100">${{ activeLease.rent_amount?.toLocaleString() }}</p>
              </div>
              <div>
                <p class="text-[10px] font-black text-primary-600 dark:text-primary-500 uppercase tracking-widest mb-1">Term</p>
                <p class="text-lg font-bold text-gray-900 dark:text-white">{{ activeLease.term_months }} Months</p>
              </div>
              <div>
                <p class="text-[10px] font-black text-primary-600 dark:text-primary-500 uppercase tracking-widest mb-1">Start Date</p>
                <p class="text-lg font-bold text-gray-900 dark:text-white">{{ new Date(activeLease.start_date).toLocaleDateString() }}</p>
              </div>
              <div>
                <p class="text-[10px] font-black text-primary-600 dark:text-primary-500 uppercase tracking-widest mb-1">End Date</p>
                <p class="text-lg font-bold text-gray-900 dark:text-white">{{ new Date(activeLease.end_date).toLocaleDateString() }}</p>
              </div>
            </div>
            <div class="mt-6 pt-6 border-t border-primary-100 dark:border-primary-800/50 flex justify-end">
               <UButton :to="`/office/leases/${activeLease.id}`" variant="link" color="primary" icon="i-heroicons-arrow-right" trailing>View Full Lease</UButton>
            </div>
          </div>

          <!-- Contact Information -->
          <div class="bg-white dark:bg-gray-900/80 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 class="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-user-circle" class="text-gray-400" />
              Contact Information
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div class="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <UIcon name="i-heroicons-envelope" class="w-6 h-6 text-primary-500 mt-1" />
                <div>
                  <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Email Address</p>
                  <p class="text-lg font-bold text-gray-900 dark:text-gray-100 break-all">{{ resident.email || 'No email' }}</p>
                </div>
              </div>
              <div class="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <UIcon name="i-heroicons-phone" class="w-6 h-6 text-primary-500 mt-1" />
                <div>
                  <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Phone Number</p>
                  <p class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ resident.phone || 'No phone' }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Payment History -->
          <div class="bg-white dark:bg-gray-900/80 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UIcon name="i-heroicons-credit-card" class="text-gray-400" />
                Payment History
              </h3>
              <UBadge v-if="resident.balance > 0" color="error" variant="soft" class="font-bold">
                Outstanding: ${{ resident.balance.toLocaleString() }}
              </UBadge>
            </div>
            
            <GenericDataTable
              :data="paymentHistory || []"
              :columns="paymentColumns"
              :loading="paymentStatus === 'pending'"
              row-key="id"
              striped
            >
              <template #cell-created_at="{ value }">
                <CellsDateCell :value="value" format="medium" />
              </template>
              <template #cell-total_unpaid="{ value }">
                <CellsCurrencyCell :value="value" :class="value > 0 ? 'text-red-600 font-bold' : 'text-gray-600'" />
              </template>
              <template #cell-balance="{ value }">
                <CellsCurrencyCell :value="value" class="font-mono text-sm" />
              </template>
              <template #cell-is_active="{ value }">
                <UBadge :color="value ? 'primary' : 'neutral'" size="xs" variant="soft">
                  {{ value ? 'Current' : 'Historical' }}
                </UBadge>
              </template>
            </GenericDataTable>

            <div v-if="!paymentHistory?.length && paymentStatus !== 'pending'" class="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
              <UIcon name="i-heroicons-document-check" class="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <p class="text-gray-500 dark:text-gray-400 font-medium">No delinquency records found for this resident.</p>
            </div>
          </div>
        </div>

        <!-- Sidebar Actions -->
        <div class="space-y-6">
          <div class="bg-gray-900 dark:bg-gray-800/80 rounded-3xl p-8 text-white shadow-xl shadow-gray-900/10">
            <h4 class="text-xs font-black uppercase tracking-widest opacity-60 mb-6 font-mono text-primary-400">Resident Meta</h4>
            <div class="space-y-4 text-sm">
              <div class="flex justify-between items-center py-2 border-b border-white/5">
                <span class="opacity-60">Resident ID</span>
                <span class="font-mono text-[10px]">{{ resident.id }}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-white/5">
                <span class="opacity-60">Tenancy ID</span>
                <span class="font-mono text-[10px]">{{ resident.tenancy_id }}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-white/5">
                <span class="opacity-60">Role</span>
                <UBadge color="white" variant="soft" size="xs">{{ resident.role }}</UBadge>
              </div>
            </div>

            <div class="mt-8 space-y-3">
               <h4 class="text-xs font-black uppercase tracking-widest opacity-60 mb-4 font-mono text-primary-400">Navigation</h4>
               <UButton
                  v-if="resident.building_id"
                  :to="`/assets/buildings/${resident.building_id}`"
                  block
                  color="white"
                  variant="ghost"
                  class="justify-start hover:bg-white/10 rounded-xl"
                  icon="i-heroicons-building-office-2"
                >
                  View Building
                </UButton>
                <UButton
                  v-if="resident.property_code"
                  :to="`/assets/properties/${resident.property_code}`"
                  block
                  color="white"
                  variant="ghost"
                  class="justify-start hover:bg-white/10 rounded-xl"
                  icon="i-heroicons-map"
                >
                  View Property
                </UButton>
            </div>
            
            <div class="mt-8 pt-8 border-t border-white/10">
              <p class="text-[10px] font-mono opacity-30 leading-relaxed italic">
                Data synced from Yardi Voyager<br>
                Latest update: {{ new Date().toLocaleDateString() }}
              </p>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-900/80 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
             <h4 class="text-sm font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h4>
             <div class="space-y-3">
                <UButton block label="Send Email" icon="i-heroicons-envelope" variant="outline" color="neutral" />
                <UButton block label="Log Interaction" icon="i-heroicons-chat-bubble-bottom-center-text" variant="outline" color="neutral" />
                <UButton block label="Manage Flags" icon="i-heroicons-flag" variant="outline" color="neutral" />
             </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
