<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAsyncData, useToast, definePageMeta } from '#imports'
import { usePropertyState } from '../../../base/composables/usePropertyState'
import { allColumns, roleColumns, departmentColumns } from '../../../../configs/table-configs/ownership_entities-complete.generated'
import { filterColumnsByAccess } from '../../../table/composables/useTableColumns'

definePageMeta({
  layout: 'dashboard',
  middleware: ['owners']
})

const toast = useToast()
const { activeProperty, userContext } = usePropertyState()

// --- Data ---
const { data: entities, status, refresh } = await useAsyncData('ownership-entities', () =>
  $fetch('/api/owners/entities'),
  { server: false }
)

// --- Table columns ---
const columns = computed(() =>
  filterColumnsByAccess(allColumns, {
    userRole: activeProperty.value ? userContext.value?.access?.property_roles?.[activeProperty.value] : null,
    userDepartment: userContext.value?.profile?.department,
    isSuperAdmin: !!userContext.value?.access?.is_super_admin,
    filterGroup: 'all'
  })
)

// --- Search ---
const searchQuery = ref('')
const filteredData = computed(() => {
  const rows = (entities.value as any[]) || []
  if (!searchQuery.value) return rows
  const q = searchQuery.value.toLowerCase()
  return rows.filter((r: any) =>
    r.name?.toLowerCase().includes(q) ||
    r.legal_title?.toLowerCase().includes(q) ||
    r.entity_type?.toLowerCase().includes(q) ||
    r.tax_id?.toLowerCase().includes(q)
  )
})

// --- Edit / Create modal ---
const showEditModal = ref(false)
const isCreating = ref(false)
const saving = ref(false)

const emptyForm = () => ({
  id: '',
  name: '',
  legal_title: '',
  entity_type: '',
  tax_id: '',
  address_line1: '',
  address_line2: '',
  address_city: '',
  address_state: '',
  address_zip: '',
  distribution_gl: '',
  contribution_gl: '',
})

const form = ref(emptyForm())

const ENTITY_TYPES = ['LLC', 'Corporation', 'Individual', 'Partnership', 'REIT', 'Trust']

function openCreate() {
  form.value = emptyForm()
  isCreating.value = true
  showEditModal.value = true
}

function openEdit(row: any) {
  form.value = {
    id:                    row.id                    ?? '',
    name:                  row.name                  ?? '',
    legal_title:           row.legal_title           ?? '',
    entity_type:           row.entity_type           ?? '',
    tax_id:                row.tax_id                ?? '',
    address_line1:         row.address_line1         ?? '',
    address_line2:         row.address_line2         ?? '',
    address_city:          row.address_city          ?? '',
    address_state:         row.address_state         ?? '',
    address_zip:           row.address_zip           ?? '',
    distribution_gl:      row.distribution_gl       ?? '',
    contribution_gl:      row.contribution_gl       ?? '',
  }
  isCreating.value = false
  showEditModal.value = true
}

async function saveEntity() {
  if (!form.value.name.trim()) {
    toast.add({ title: 'Validation', description: 'Entity name is required.', color: 'warning' })
    return
  }
  saving.value = true
  try {
    if (isCreating.value) {
      await $fetch('/api/owners/entities', { method: 'POST', body: form.value })
      toast.add({ title: 'Created', description: `${form.value.name} added.`, color: 'success' })
    } else {
      await $fetch(`/api/owners/entities/${form.value.id}`, { method: 'PATCH', body: form.value })
      toast.add({ title: 'Saved', description: `${form.value.name} updated.`, color: 'success' })
    }
    showEditModal.value = false
    await refresh()
  } catch (err: any) {
    toast.add({ title: 'Error', description: err?.data?.statusMessage || 'Save failed.', color: 'error' })
  } finally {
    saving.value = false
  }
}

// --- Helpers ---
function formatAddress(row: any): string {
  const parts = [row.address_line1, row.address_line2, row.address_city, row.address_state, row.address_zip]
  return parts.filter(Boolean).join(', ') || '—'
}

function entityTypeBadgeColor(type: string): string {
  const map: Record<string, string> = {
    LLC: 'primary', Corporation: 'info', Individual: 'success',
    Partnership: 'warning', REIT: 'secondary',
  }
  return map[type] || 'neutral'
}
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-baseline gap-3">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Ownership Entities</h1>
        <span class="text-lg text-gray-500 font-medium">· {{ filteredData.length }} entities</span>
      </div>
      <UButton
        icon="i-heroicons-plus"
        label="Add Entity"
        color="primary"
        @click="openCreate"
      />
    </div>

    <ClientOnly>
      <GenericDataTable
        :data="filteredData"
        :columns="columns"
        :loading="status === 'pending'"
        row-key="id"
        enable-pagination
        :page-size="25"
        default-sort-field="name"
        striped
        enable-export
        export-filename="ownership-entities"
      >
        <template #toolbar>
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="Search entities..."
            class="w-64"
          />
        </template>

        <!-- Entity Name -->
        <template #cell-name="{ value }">
          <span class="font-semibold text-gray-900 dark:text-white">{{ value }}</span>
        </template>

        <!-- Legal Title -->
        <template #cell-legal_title="{ value }">
          <span v-if="value" class="text-sm text-gray-600 dark:text-gray-400 italic">{{ value }}</span>
          <span v-else class="text-gray-400">—</span>
        </template>

        <!-- Entity Type badge -->
        <template #cell-entity_type="{ value }">
          <UBadge v-if="value" :color="entityTypeBadgeColor(value)" variant="subtle" size="sm">
            {{ value }}
          </UBadge>
          <span v-else class="text-gray-400">—</span>
        </template>

        <!-- Tax ID -->
        <template #cell-tax_id="{ value }">
          <span v-if="value" class="font-mono text-xs text-gray-600 dark:text-gray-400">{{ value }}</span>
          <span v-else class="text-gray-400">—</span>
        </template>

        <!-- Address (combined) -->
        <template #cell-address="{ row }">
          <span class="text-sm text-gray-600 dark:text-gray-400">{{ formatAddress(row) }}</span>
        </template>

        <!-- Distribution GL -->
        <template #cell-distribution_gl="{ value }">
          <span v-if="value" class="font-mono text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
            {{ value }}
          </span>
          <span v-else class="text-gray-400">—</span>
        </template>

        <!-- Contribution GL -->
        <template #cell-contribution_gl="{ value }">
          <span v-if="value" class="font-mono text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
            {{ value }}
          </span>
          <span v-else class="text-gray-400">—</span>
        </template>

        <!-- Actions -->
        <template #cell-actions="{ row }">
          <UButton
            icon="i-heroicons-pencil-square"
            color="neutral"
            variant="ghost"
            size="sm"
            @click.stop="openEdit(row)"
          />
        </template>
      </GenericDataTable>
    </ClientOnly>

    <!-- Edit / Create Modal -->
    <SimpleModal
      v-model="showEditModal"
      :title="isCreating ? 'New Ownership Entity' : 'Edit Ownership Entity'"
      :description="isCreating ? '' : form.name"
      width="w-full max-w-2xl"
    >
      <form class="space-y-6" @submit.prevent="saveEntity">
        <!-- Name & Legal Title -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Entity Name" required>
            <UInput v-model="form.name" placeholder="e.g. Pacific Holdings LLC" class="w-full" />
          </UFormField>
          <UFormField label="Legal Title">
            <UInput v-model="form.legal_title" placeholder="Full legal name if different" class="w-full" />
          </UFormField>
        </div>

        <!-- Type & Tax ID -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Entity Type">
            <USelectMenu
              v-model="form.entity_type"
              :items="ENTITY_TYPES"
              placeholder="Select type"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Tax ID / EIN">
            <UInput v-model="form.tax_id" placeholder="XX-XXXXXXX" class="w-full" />
          </UFormField>
        </div>

        <!-- Address -->
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Address</p>
          <div class="space-y-3">
            <UFormField label="Line 1">
              <UInput v-model="form.address_line1" placeholder="123 Main St" class="w-full" />
            </UFormField>
            <UFormField label="Line 2">
              <UInput v-model="form.address_line2" placeholder="C/O Pacific Trust Co, Suite 400, Attn: ..." class="w-full" />
            </UFormField>
            <div class="grid grid-cols-3 gap-3">
              <UFormField label="City" class="col-span-1">
                <UInput v-model="form.address_city" placeholder="Los Angeles" class="w-full" />
              </UFormField>
              <UFormField label="State" class="col-span-1">
                <UInput v-model="form.address_state" placeholder="CA" maxlength="2" class="w-full" />
              </UFormField>
              <UFormField label="ZIP" class="col-span-1">
                <UInput v-model="form.address_zip" placeholder="90001" class="w-full" />
              </UFormField>
            </div>
          </div>
        </div>

        <!-- Yardi GL Codes -->
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Yardi GL Codes</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Distribution GL">
              <UInput v-model="form.distribution_gl" placeholder="e.g. 300-0000" maxlength="9" class="w-full font-mono" />
            </UFormField>
            <UFormField label="Contribution GL">
              <UInput v-model="form.contribution_gl" placeholder="e.g. 310-0000" maxlength="9" class="w-full font-mono" />
            </UFormField>
          </div>
        </div>

      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="showEditModal = false" />
          <UButton
            color="primary"
            :loading="saving"
            :label="isCreating ? 'Create Entity' : 'Save Changes'"
            icon="i-heroicons-check"
            @click="saveEntity"
          />
        </div>
      </template>
    </SimpleModal>
  </div>
</template>
