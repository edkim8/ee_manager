<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePropertyState } from '../../../base/composables/usePropertyState'
import { usePricingEngine } from '../../utils/pricing-engine'
import type { TableColumn } from '../../../table/types'
import type { Database } from '~/types/supabase'
import SimpleModal from '../../../base/components/SimpleModal.vue'

definePageMeta({
  layout: 'dashboard'
})

const supabase = useSupabaseClient<Database>()
const { activeProperty } = usePropertyState()
const toast = useToast()

// --- State ---
const isEditModalOpen = ref(false)
const selectedAmenity = ref<any>(null)
const isSaving = ref(false)

// --- Data Fetching ---
const { data: amenities, status, refresh } = await useAsyncData('amenities-library', async () => {
  if (!activeProperty.value) return []
  const { data, error } = await supabase
    .from('view_amenities_usage')
    .select('*')
    .eq('property_code', activeProperty.value)
    .order('yardi_name')
  
  if (error) throw error
  return data
}, { watch: [activeProperty] })

// --- Table Configuration ---
const columns: TableColumn[] = [
  { key: 'yardi_code', label: 'Code', sortable: true, width: '120px' },
  { key: 'yardi_name', label: 'Name', sortable: true },
  { key: 'yardi_amenity', label: 'Yardi Label', sortable: true },
  { key: 'type', label: 'Type', sortable: true, width: '100px' },
  { key: 'amount', label: 'Amount', sortable: true, width: '100px', align: 'right' },
  { key: 'active_units_count', label: 'Active Units', sortable: true, width: '120px', align: 'center' },
  { key: 'active', label: 'Status', sortable: true, width: '80px', align: 'center' },
  { key: 'actions', label: '', width: '50px', align: 'center' }
]

// --- Summary Stats ---
const stats = computed(() => {
  if (!amenities.value) return { totalUsage: 0, revenueImpact: 0, topAmenity: 'N/A' }
  
  const totalUsage = amenities.value.reduce((acc: number, a: any) => acc + (a.active_units_count || 0), 0)
  const revenueImpact = amenities.value.reduce((acc: number, a: any) => acc + (a.total_revenue_impact || 0), 0)
  
  const sorted = [...amenities.value].sort((a: any, b: any) => b.active_units_count - a.active_units_count)
  const topAmenity = sorted[0]?.active_units_count > 0 ? sorted[0].yardi_name : 'N/A'
  
  return { totalUsage, revenueImpact, topAmenity }
})

const typeColors: Record<string, string> = {
  'Fixed': 'primary',
  'Premium': 'success',
  'Discount': 'orange'
}

// --- Search ---
const searchQuery = ref('')
const filteredData = computed(() => {
  if (!amenities.value) return []
  if (!searchQuery.value) return amenities.value
  
  const q = searchQuery.value.toLowerCase()
  return amenities.value.filter((a: any) => 
    a.yardi_name?.toLowerCase().includes(q) || 
    a.yardi_code?.toLowerCase().includes(q) ||
    a.type?.toLowerCase().includes(q)
  )
})

// --- Actions ---
const handleOpenEdit = (amenity: any) => {
  selectedAmenity.value = { ...amenity }
  isEditModalOpen.value = true
}

const saveAmenity = async () => {
  if (!selectedAmenity.value) return
  isSaving.value = true
  
  const { error } = await supabase
    .from('amenities')
    .update({
      amount: selectedAmenity.value.amount,
      type: selectedAmenity.value.type,
      active: selectedAmenity.value.active,
      description: selectedAmenity.value.description
    })
    .eq('id', selectedAmenity.value.id)
  
  isSaving.value = false
  if (error) {
    toast.add({ title: 'Error saving amenity', color: 'red' })
  } else {
    toast.add({ title: 'Amenity updated successfully', color: 'green' })
    isEditModalOpen.value = false
    refresh()
  }
}
</script>

<template>
  <div class="p-6">
    <div class="mb-8 flex justify-between items-end">
      <div>
        <h1 class="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Amenities Library</h1>
        <p class="text-sm text-gray-500 mt-1">Manage global amenities, reconciliation rules, and default pricing.</p>
      </div>
      <div class="flex gap-4">
        <UButton
          to="/amenities/history"
          icon="i-heroicons-clock"
          color="neutral"
          variant="outline"
          label="View Audit History"
        />
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-white dark:bg-gray-900/80 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Total Unit Pickups</p>
        <div class="flex items-end gap-2">
          <span class="text-3xl font-black text-gray-900 dark:text-white">{{ stats.totalUsage }}</span>
          <span class="text-xs text-gray-500 mb-1.5 font-medium">active instances</span>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-900/80 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Monthly Revenue Offset</p>
        <div class="flex items-end gap-2">
          <span class="text-3xl font-black text-primary-600 dark:text-primary-400">${{ stats.revenueImpact.toLocaleString() }}</span>
          <UIcon name="i-heroicons-arrow-trending-up" class="w-5 h-5 text-primary-500 mb-2" />
        </div>
      </div>
      <div class="bg-white dark:bg-gray-900/80 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Most Frequent Amenity</p>
        <div class="flex items-center gap-3">
          <span class="text-lg font-bold text-gray-900 dark:text-white truncate">{{ stats.topAmenity }}</span>
        </div>
      </div>
    </div>

    <GenericDataTable
      :data="filteredData"
      :columns="columns"
      :loading="status === 'pending'"
      row-key="id"
      enable-pagination
      :page-size="20"
      default-sort-field="yardi_name"
      striped
    >
      <template #toolbar>
        <div class="flex items-center gap-4">
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="Search amenities..."
            class="w-64"
          />
        </div>
      </template>

      <!-- Type Badge -->
      <template #cell-type="{ value }">
        <UBadge :color="typeColors[value] || 'neutral'" variant="subtle" size="xs">
          {{ value }}
        </UBadge>
      </template>

      <!-- Amount Currency -->
      <template #cell-amount="{ value }">
        <span :class="value < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'" class="font-mono font-medium">
          {{ value < 0 ? '-' : '' }}${{ Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
        </span>
      </template>

      <!-- Active Units Count -->
      <template #cell-active_units_count="{ value }">
        <span class="font-bold" :class="value > 0 ? 'text-primary-500' : 'text-gray-400'">
          {{ value }}
        </span>
      </template>

      <!-- Active Status -->
      <template #cell-active="{ value }">
        <UIcon 
            :name="value ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" 
            :class="value ? 'text-green-500' : 'text-gray-400'"
            class="w-5 h-5"
        />
      </template>

      <!-- Actions -->
      <template #cell-actions="{ row }">
        <UButton
          icon="i-heroicons-pencil-square"
          color="gray"
          variant="ghost"
          size="xs"
          @click="handleOpenEdit(row)"
        />
      </template>
    </GenericDataTable>

    <!-- Edit Modal -->
    <SimpleModal 
      v-model="isEditModalOpen" 
      :title="`Edit Amenity: ${selectedAmenity?.yardi_name}`"
      width="max-w-lg"
    >
        <div class="space-y-4 py-2">
          <UFormField label="Amount" help="Default monthly amount for this amenity.">
            <UInput v-model="selectedAmenity.amount" type="number" step="0.01" icon="i-heroicons-banknotes" />
          </UFormField>

          <UFormField label="Type">
            <USelectMenu
                v-model="selectedAmenity.type"
                :items="['Fixed', 'Premium', 'Discount']"
            />
          </UFormField>

          <UFormField label="Description">
            <UTextarea v-model="selectedAmenity.description" placeholder="Internal notes..." />
          </UFormField>

          <UFormField label="Status">
            <div class="flex items-center gap-3">
              <UToggle v-model="selectedAmenity.active" />
              <span class="text-sm text-gray-500 font-medium">{{ selectedAmenity.active ? 'Active' : 'Inactive' }}</span>
            </div>
          </UFormField>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="isEditModalOpen = false">Cancel</UButton>
            <UButton color="primary" :loading="isSaving" @click="saveAmenity">Save Changes</UButton>
          </div>
        </template>
    </SimpleModal>
  </div>
</template>
