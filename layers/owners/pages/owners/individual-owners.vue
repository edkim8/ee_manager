<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAsyncData, useToast, definePageMeta } from '#imports'
import { usePropertyState } from '../../../base/composables/usePropertyState'

definePageMeta({
  layout: 'dashboard',
  middleware: ['owners']
})

const toast = useToast()
const { activeProperty, userContext } = usePropertyState()

const isSuperAdmin = computed(() => !!userContext.value?.access?.is_super_admin)

// --- Data ---
const { data: rows, status, refresh } = await useAsyncData('individual-owners', () =>
  $fetch('/api/owners/individual-owners'),
  { server: false }
)

const { data: profiles } = await useAsyncData('owner-profiles-list', () =>
  $fetch('/api/owners/profiles'),
  { server: false }
)

const { data: entities } = await useAsyncData('owner-entities-list', () =>
  $fetch('/api/owners/entities'),
  { server: false }
)

// --- Search ---
const searchQuery = ref('')
const filteredData = computed(() => {
  const list = (rows.value as any[]) || []
  if (!searchQuery.value) return list
  const q = searchQuery.value.toLowerCase()
  return list.filter((r: any) =>
    r.profile_name?.toLowerCase().includes(q) ||
    r.profile_email?.toLowerCase().includes(q) ||
    r.entity_name?.toLowerCase().includes(q) ||
    r.role?.toLowerCase().includes(q)
  )
})

// --- Modal ---
const showModal  = ref(false)
const isCreating = ref(false)
const saving     = ref(false)
const deleting   = ref<string | null>(null)

const ROLES = ['General Partner', 'Limited Partner', 'Member', 'Trustee']

const emptyForm = () => ({
  profile_id:      '',
  owner_id:        '',
  equity_pct:      0,
  role:            '',
  distribution_gl: '',
  contribution_gl: '',
  notes:           '',
})

const form = ref(emptyForm())

function openCreate() {
  form.value = emptyForm()
  isCreating.value = true
  showModal.value  = true
}

function openEdit(row: any) {
  form.value = {
    profile_id:      row.profile_id,
    owner_id:        row.owner_id,
    equity_pct:      row.equity_pct,
    role:            row.role || '',
    distribution_gl: row.distribution_gl || '',
    contribution_gl: row.contribution_gl || '',
    notes:           row.notes || '',
  }
  isCreating.value = false
  showModal.value  = true
}

async function save() {
  if (!form.value.profile_id) { toast.add({ title: 'Validation', description: 'Select an owner.', color: 'warning' }); return }
  if (!form.value.owner_id)   { toast.add({ title: 'Validation', description: 'Select an entity.', color: 'warning' }); return }

  saving.value = true
  try {
    if (isCreating.value) {
      await $fetch('/api/owners/individual-owners', { method: 'POST', body: form.value })
      toast.add({ title: 'Created', description: 'Owner mapped to entity.', color: 'success' })
    } else {
      await $fetch(`/api/owners/individual-owners/${form.value.profile_id}/${form.value.owner_id}`, {
        method: 'PATCH',
        body: form.value,
      })
      toast.add({ title: 'Saved', description: 'Owner record updated.', color: 'success' })
    }
    showModal.value = false
    await refresh()
  } catch (err: any) {
    toast.add({ title: 'Error', description: err?.data?.statusMessage || 'Save failed.', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function remove(row: any) {
  deleting.value = `${row.profile_id}:${row.owner_id}`
  try {
    await $fetch(`/api/owners/individual-owners/${row.profile_id}/${row.owner_id}`, { method: 'DELETE' })
    toast.add({ title: 'Removed', description: `${row.profile_name} removed from ${row.entity_name}.`, color: 'success' })
    await refresh()
  } catch (err: any) {
    toast.add({ title: 'Error', description: err?.data?.statusMessage || 'Delete failed.', color: 'error' })
  } finally {
    deleting.value = null
  }
}

// --- Helpers ---
const profileItems = computed(() =>
  (profiles.value as any[] || []).map((p: any) => ({ label: `${p.name} — ${p.email}`, value: p.id }))
)

const entityItems = computed(() =>
  (entities.value as any[] || []).map((e: any) => ({ label: e.name, value: e.id }))
)

function roleBadgeColor(role: string): string {
  const map: Record<string, string> = {
    'General Partner':  'error',
    'Limited Partner':  'primary',
    'Member':           'info',
    'Trustee':          'warning',
  }
  return map[role] || 'neutral'
}
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-baseline gap-3">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Individual Owners</h1>
        <span class="text-lg text-gray-500 font-medium">· {{ filteredData.length }} records</span>
      </div>
      <UButton icon="i-heroicons-plus" label="Add Owner" color="primary" @click="openCreate" />
    </div>

    <ClientOnly>
      <GenericDataTable
        :data="filteredData"
        :loading="status === 'pending'"
        :columns="[
          { key: 'profile_name', label: 'Owner',       sortable: true,  width: '180px' },
          { key: 'entity_name',  label: 'Entity',      sortable: true,  width: '160px' },
          { key: 'role',         label: 'Role',        sortable: true,  width: '130px', align: 'center' },
          { key: 'equity_pct',   label: 'Equity %',    sortable: true,  width: '90px',  align: 'right' },
          { key: 'distribution_gl', label: 'Dist GL',  sortable: false, width: '100px', align: 'center', class: 'max-md:hidden', headerClass: 'max-md:hidden' },
          { key: 'contribution_gl', label: 'Contrib GL', sortable: false, width: '100px', align: 'center', class: 'max-md:hidden', headerClass: 'max-md:hidden' },
          { key: 'notes',        label: 'Notes',       sortable: false, width: '200px', class: 'max-lg:hidden', headerClass: 'max-lg:hidden' },
          { key: 'actions',      label: '',            sortable: false, width: '80px',  align: 'center' },
        ]"
        row-key="profile_id"
        default-sort-field="profile_name"
        striped
        enable-export
        export-filename="individual-owners"
      >
        <template #toolbar>
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="Search owners..."
            class="w-64"
          />
        </template>

        <!-- Owner -->
        <template #cell-profile_name="{ value, row }">
          <div>
            <span class="font-semibold text-gray-900 dark:text-white">{{ value }}</span>
            <span v-if="row.profile_email" class="ml-2 text-xs text-gray-400">{{ row.profile_email }}</span>
          </div>
        </template>

        <!-- Entity -->
        <template #cell-entity_name="{ value, row }">
          <div class="flex items-center gap-1.5">
            <span class="font-medium">{{ value }}</span>
            <span v-if="row.entity_type" class="text-xs text-gray-400">({{ row.entity_type }})</span>
          </div>
        </template>

        <!-- Role -->
        <template #cell-role="{ value }">
          <UBadge v-if="value" :color="roleBadgeColor(value)" variant="subtle" size="sm">
            {{ value }}
          </UBadge>
          <span v-else class="text-gray-400">—</span>
        </template>

        <!-- Equity % -->
        <template #cell-equity_pct="{ value }">
          <span class="font-mono text-sm">{{ Number(value).toFixed(2) }}%</span>
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

        <!-- Notes -->
        <template #cell-notes="{ value }">
          <span v-if="value" class="text-sm text-gray-500 italic">{{ value }}</span>
          <span v-else class="text-gray-400">—</span>
        </template>

        <!-- Actions -->
        <template #cell-actions="{ row }">
          <div class="flex items-center gap-1">
            <UButton
              icon="i-heroicons-pencil-square"
              color="neutral"
              variant="ghost"
              size="sm"
              @click.stop="openEdit(row)"
            />
            <UButton
              icon="i-heroicons-trash"
              color="error"
              variant="ghost"
              size="sm"
              :loading="deleting === `${row.profile_id}:${row.owner_id}`"
              @click.stop="remove(row)"
            />
          </div>
        </template>
      </GenericDataTable>
    </ClientOnly>

    <!-- Add / Edit Modal -->
    <SimpleModal
      v-model="showModal"
      :title="isCreating ? 'Add Owner Mapping' : 'Edit Owner Mapping'"
      :description="isCreating ? '' : form.profile_id ? (rows as any[])?.find(r => r.profile_id === form.profile_id)?.profile_name : ''"
      width="w-full max-w-lg"
    >
      <form class="space-y-5" @submit.prevent="save">
        <!-- Owner (profile) -->
        <UFormField label="Owner" required>
          <USelectMenu
            v-model="form.profile_id"
            :items="profileItems"
            value-key="value"
            placeholder="Select person"
            :disabled="!isCreating"
            class="w-full"
          />
        </UFormField>

        <!-- Entity -->
        <UFormField label="Ownership Entity" required>
          <USelectMenu
            v-model="form.owner_id"
            :items="entityItems"
            value-key="value"
            placeholder="Select entity"
            :disabled="!isCreating"
            class="w-full"
          />
        </UFormField>

        <!-- Role & Equity -->
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Role">
            <USelectMenu
              v-model="form.role"
              :items="ROLES"
              placeholder="Select role"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Equity %">
            <UInput
              v-model.number="form.equity_pct"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="e.g. 85.00"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- GL Codes -->
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Yardi GL Codes</p>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Distribution GL">
              <UInput
                v-model="form.distribution_gl"
                placeholder="e.g. 300-0000"
                maxlength="9"
                class="w-full font-mono"
              />
            </UFormField>
            <UFormField label="Contribution GL">
              <UInput
                v-model="form.contribution_gl"
                placeholder="e.g. 310-0000"
                maxlength="9"
                class="w-full font-mono"
              />
            </UFormField>
          </div>
          <p class="mt-2 text-xs text-gray-400">Only required for owners who receive distributions (e.g. TIC owners).</p>
        </div>

        <!-- Notes -->
        <UFormField label="Notes">
          <UInput
            v-model="form.notes"
            placeholder="Optional notes"
            class="w-full"
          />
        </UFormField>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="showModal = false" />
          <UButton
            color="primary"
            :loading="saving"
            :label="isCreating ? 'Add Owner' : 'Save Changes'"
            icon="i-heroicons-check"
            @click="save"
          />
        </div>
      </template>
    </SimpleModal>
  </div>
</template>
