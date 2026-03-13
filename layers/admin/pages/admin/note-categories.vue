<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHead } from '#imports'

definePageMeta({
  layout: 'dashboard',
  middleware: ['admin'],
})

useHead({ title: 'Note Category Manager' })

// ── Types ─────────────────────────────────────────────────────────────────────

interface CategoryRow {
  value: string
  label: string
  count: number
  isOrphaned: boolean
}

interface ConfigSection {
  record_type: string
  displayName: string
  categories: string[]
  rows: CategoryRow[]
}

// ── State ─────────────────────────────────────────────────────────────────────

const sections   = ref<ConfigSection[]>([])
const loading    = ref(false)
const saveError  = ref('')

// Add category
const addingFor     = ref<string | null>(null)
const addInput      = ref('')
const addSaving     = ref(false)

// Rename modal
const renameModal = ref({
  open:        false,
  recordType:  '',
  oldValue:    '',
  newValue:    '',
  count:       0,
  updateNotes: true,
  saving:      false,
  error:       '',
})

// Delete modal
const deleteModal = ref({
  open:        false,
  recordType:  '',
  value:       '',
  label:       '',
  count:       0,
  deleteNotes: false,
  saving:      false,
  error:       '',
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const toLabel = (value: string) =>
  value.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const toDisplayName = (recordType: string) =>
  recordType.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

// ── Data loading ──────────────────────────────────────────────────────────────

const loadData = async () => {
  loading.value = true
  saveError.value = ''
  try {
    const { configs, usage } = await $fetch<{
      configs: { record_type: string; categories: string[]; updated_at: string }[]
      usage: Record<string, Record<string, number>>
    }>('/api/note-categories')

    sections.value = configs.map(cfg => {
      const typeUsage = usage[cfg.record_type] ?? {}
      const knownValues = new Set(cfg.categories)

      // Known categories (from config), in config order
      const knownRows: CategoryRow[] = cfg.categories.map(v => ({
        value:      v,
        label:      toLabel(v),
        count:      typeUsage[v] ?? 0,
        isOrphaned: false,
      }))

      // Orphaned categories (in notes but not in config)
      const orphanedRows: CategoryRow[] = Object.entries(typeUsage)
        .filter(([v]) => !knownValues.has(v))
        .map(([v, count]) => ({
          value:      v,
          label:      toLabel(v),
          count,
          isOrphaned: true,
        }))

      return {
        record_type: cfg.record_type,
        displayName: toDisplayName(cfg.record_type),
        categories:  cfg.categories,
        rows:        [...knownRows, ...orphanedRows],
      }
    })
  } catch (err: any) {
    saveError.value = err.data?.message || err.message || 'Failed to load'
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

// ── Add category ──────────────────────────────────────────────────────────────

const openAdd = (recordType: string) => {
  addingFor.value = recordType
  addInput.value = ''
}

const cancelAdd = () => {
  addingFor.value = null
  addInput.value = ''
}

const saveAdd = async () => {
  const recordType = addingFor.value
  if (!recordType || !addInput.value.trim()) return

  // Normalise: lowercase, spaces → underscores
  const newValue = addInput.value.trim().toLowerCase().replace(/\s+/g, '_')
  const section  = sections.value.find(s => s.record_type === recordType)
  if (!section) return

  if (section.categories.includes(newValue)) {
    saveError.value = `'${newValue}' already exists in this list`
    return
  }

  addSaving.value = true
  saveError.value = ''
  try {
    await $fetch(`/api/note-categories/${recordType}`, {
      method: 'PUT',
      body: { categories: [...section.categories, newValue] },
    })
    addingFor.value = null
    addInput.value  = ''
    await loadData()
  } catch (err: any) {
    saveError.value = err.data?.message || err.message || 'Failed to save'
  } finally {
    addSaving.value = false
  }
}

// ── Rename ────────────────────────────────────────────────────────────────────

const openRename = (recordType: string, row: CategoryRow) => {
  renameModal.value = {
    open:        true,
    recordType,
    oldValue:    row.value,
    newValue:    row.value,
    count:       row.count,
    updateNotes: true,
    saving:      false,
    error:       '',
  }
}

const closeRename = () => { renameModal.value.open = false }

const saveRename = async () => {
  const { recordType, oldValue, newValue, updateNotes } = renameModal.value
  const normalised = newValue.trim().toLowerCase().replace(/\s+/g, '_')

  if (!normalised || normalised === oldValue) {
    renameModal.value.error = 'Please enter a different name'
    return
  }

  renameModal.value.saving = true
  renameModal.value.error  = ''
  try {
    const { notesUpdated } = await $fetch<{ ok: boolean; notesUpdated: number }>(
      `/api/note-categories/${recordType}/rename`,
      { method: 'POST', body: { from: oldValue, to: normalised, updateNotes } }
    )
    closeRename()
    await loadData()
    if (updateNotes && notesUpdated > 0) {
      // Toast-style message — using a simple ref since toast composable may not be available
      saveError.value = '' // clear any error
    }
  } catch (err: any) {
    renameModal.value.error = err.data?.message || err.message || 'Failed to rename'
  } finally {
    renameModal.value.saving = false
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

const openDelete = (recordType: string, row: CategoryRow) => {
  deleteModal.value = {
    open:        true,
    recordType,
    value:       row.value,
    label:       row.label,
    count:       row.count,
    deleteNotes: false,
    saving:      false,
    error:       '',
  }
}

const closeDelete = () => { deleteModal.value.open = false }

const confirmDelete = async () => {
  const { recordType, value, deleteNotes } = deleteModal.value
  deleteModal.value.saving = true
  deleteModal.value.error  = ''
  try {
    await $fetch(`/api/note-categories/${recordType}/delete-category`, {
      method: 'POST',
      body: { value, deleteNotes },
    })
    closeDelete()
    await loadData()
  } catch (err: any) {
    deleteModal.value.error = err.data?.message || err.message || 'Failed to delete'
  } finally {
    deleteModal.value.saving = false
  }
}

// ── Reorder (move up / move down) ────────────────────────────────────────────

const moveCategory = async (recordType: string, fromIndex: number, direction: 'up' | 'down') => {
  const section = sections.value.find(s => s.record_type === recordType)
  if (!section) return

  const cats    = [...section.categories]
  const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
  if (toIndex < 0 || toIndex >= cats.length) return

  ;[cats[fromIndex], cats[toIndex]] = [cats[toIndex], cats[fromIndex]]

  try {
    await $fetch(`/api/note-categories/${recordType}`, {
      method: 'PUT',
      body: { categories: cats },
    })
    await loadData()
  } catch (err: any) {
    saveError.value = err.data?.message || err.message || 'Failed to reorder'
  }
}

// ── Add new record type ───────────────────────────────────────────────────────

const newRecordType = ref({ open: false, value: '', saving: false, error: '' })

const openNewRecordType = () => {
  newRecordType.value = { open: true, value: '', saving: false, error: '' }
}

const saveNewRecordType = async () => {
  const raw = newRecordType.value.value.trim().toLowerCase().replace(/\s+/g, '_')
  if (!raw) { newRecordType.value.error = 'Name is required'; return }

  if (sections.value.some(s => s.record_type === raw)) {
    newRecordType.value.error = `'${raw}' already exists`
    return
  }

  newRecordType.value.saving = true
  newRecordType.value.error  = ''
  try {
    await $fetch(`/api/note-categories/${raw}`, {
      method: 'PUT',
      body: { categories: ['general'] },
    })
    newRecordType.value.open = false
    await loadData()
  } catch (err: any) {
    newRecordType.value.error = err.data?.message || err.message || 'Failed to save'
  } finally {
    newRecordType.value.saving = false
  }
}

// ── Rename new value normalised preview ──────────────────────────────────────
const renameNormalisedPreview = computed(() => {
  const v = renameModal.value.newValue.trim().toLowerCase().replace(/\s+/g, '_')
  return v !== renameModal.value.newValue.trim() ? v : ''
})
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8 space-y-8">

    <!-- Page header -->
    <div>
      <h1 class="text-2xl font-black text-gray-900 dark:text-white">Note Category Manager</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Manage note categories for each module. Changes take effect immediately.
      </p>
    </div>

    <!-- Global error -->
    <UAlert v-if="saveError" color="red" variant="soft" icon="i-heroicons-exclamation-triangle" :description="saveError" />

    <!-- Loading -->
    <div v-if="loading" class="space-y-6">
      <USkeleton v-for="i in 2" :key="i" class="h-48 rounded-2xl" />
    </div>

    <!-- Sections -->
    <div v-else class="space-y-6">
      <div
        v-for="section in sections"
        :key="section.record_type"
        class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm"
      >
        <!-- Section header -->
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 class="text-base font-black text-gray-900 dark:text-white">{{ section.displayName }}</h2>
            <p class="text-xs text-gray-400 mt-0.5 font-mono">record_type: {{ section.record_type }}</p>
          </div>
          <UBadge color="gray" variant="subtle">{{ section.rows.filter(r => !r.isOrphaned).length }} categories</UBadge>
        </div>

        <!-- Category table -->
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              <th class="text-left px-6 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Category</th>
              <th class="text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 w-24">Notes</th>
              <th class="text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 w-24">Order</th>
              <th class="px-6 py-2 w-40"></th>
            </tr>
          </thead>
          <tbody>
            <!-- Known categories -->
            <tr
              v-for="(row, idx) in section.rows.filter(r => !r.isOrphaned)"
              :key="row.value"
              class="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30"
            >
              <td class="px-6 py-3">
                <div class="font-semibold text-gray-900 dark:text-white">{{ row.label }}</div>
                <div class="text-xs font-mono text-gray-400">{{ row.value }}</div>
              </td>
              <td class="px-4 py-3">
                <UBadge :color="row.count > 0 ? 'blue' : 'gray'" variant="subtle" size="sm">
                  {{ row.count }}
                </UBadge>
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-1">
                  <UButton
                    icon="i-heroicons-chevron-up"
                    size="xs"
                    variant="ghost"
                    color="gray"
                    :disabled="idx === 0"
                    @click="moveCategory(section.record_type, idx, 'up')"
                  />
                  <UButton
                    icon="i-heroicons-chevron-down"
                    size="xs"
                    variant="ghost"
                    color="gray"
                    :disabled="idx === section.rows.filter(r => !r.isOrphaned).length - 1"
                    @click="moveCategory(section.record_type, idx, 'down')"
                  />
                </div>
              </td>
              <td class="px-6 py-3">
                <div class="flex gap-2 justify-end">
                  <UButton
                    icon="i-heroicons-pencil-square"
                    size="xs"
                    variant="soft"
                    color="gray"
                    @click="openRename(section.record_type, row)"
                  >
                    Rename
                  </UButton>
                  <UButton
                    icon="i-heroicons-trash"
                    size="xs"
                    variant="soft"
                    color="red"
                    @click="openDelete(section.record_type, row)"
                  >
                    Delete
                  </UButton>
                </div>
              </td>
            </tr>

            <!-- Orphaned categories (in notes but not in config) -->
            <tr v-if="section.rows.some(r => r.isOrphaned)">
              <td colspan="4" class="px-6 pt-4 pb-1">
                <div class="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4" />
                  <span class="text-xs font-black uppercase tracking-widest">Orphaned — exist in notes but not in this list</span>
                </div>
              </td>
            </tr>
            <tr
              v-for="row in section.rows.filter(r => r.isOrphaned)"
              :key="'orphan-' + row.value"
              class="border-b border-gray-50 dark:border-gray-800/50 bg-amber-50/40 dark:bg-amber-900/10"
            >
              <td class="px-6 py-3">
                <div class="font-semibold text-amber-800 dark:text-amber-200">{{ row.label }}</div>
                <div class="text-xs font-mono text-amber-500">{{ row.value }}</div>
              </td>
              <td class="px-4 py-3">
                <UBadge color="amber" variant="subtle" size="sm">{{ row.count }}</UBadge>
              </td>
              <td class="px-4 py-3 text-gray-300">—</td>
              <td class="px-6 py-3">
                <div class="flex gap-2 justify-end">
                  <UButton
                    icon="i-heroicons-arrow-path"
                    size="xs"
                    variant="soft"
                    color="amber"
                    @click="openRename(section.record_type, row)"
                  >
                    Reassign
                  </UButton>
                  <UButton
                    icon="i-heroicons-trash"
                    size="xs"
                    variant="soft"
                    color="red"
                    @click="openDelete(section.record_type, row)"
                  >
                    Delete
                  </UButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Add category row -->
        <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
          <div v-if="addingFor === section.record_type" class="flex items-center gap-3">
            <UInput
              v-model="addInput"
              placeholder="new_category_name"
              size="sm"
              class="flex-1 max-w-xs font-mono"
              autofocus
              @keyup.enter="saveAdd"
              @keyup.escape="cancelAdd"
            />
            <p class="text-xs text-gray-400">Spaces become underscores. Will be lowercased.</p>
            <div class="flex gap-2 ml-auto">
              <UButton size="sm" color="primary" :loading="addSaving" @click="saveAdd">Add</UButton>
              <UButton size="sm" variant="ghost" color="gray" @click="cancelAdd">Cancel</UButton>
            </div>
          </div>
          <UButton
            v-else
            icon="i-heroicons-plus"
            size="sm"
            variant="ghost"
            color="primary"
            @click="openAdd(section.record_type)"
          >
            Add Category
          </UButton>
        </div>
      </div>
    </div>

    <!-- ── Add new record type ──────────────────────────────────────────────── -->
    <div class="bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-6">
      <div v-if="!newRecordType.open" class="flex items-center justify-between">
        <div>
          <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">Add a new module</p>
          <p class="text-xs text-gray-400 mt-0.5">
            When you wire <span class="font-mono">useNotes</span> into a new module, create its category config here.
          </p>
        </div>
        <UButton icon="i-heroicons-plus" variant="soft" color="primary" @click="openNewRecordType">
          Add Record Type
        </UButton>
      </div>

      <div v-else class="space-y-4">
        <div>
          <p class="text-sm font-semibold text-gray-900 dark:text-white mb-1">New record type name</p>
          <p class="text-xs text-gray-400 mb-3">
            Use the same value you pass as <span class="font-mono">recordType</span> in
            <span class="font-mono">useNotes()</span> — e.g. <span class="font-mono">work_order</span>.
            Spaces become underscores. Will be lowercased.
          </p>
          <div class="flex items-center gap-3">
            <UInput
              v-model="newRecordType.value"
              placeholder="work_order"
              class="font-mono max-w-xs"
              autofocus
              @keyup.enter="saveNewRecordType"
              @keyup.escape="newRecordType.open = false"
            />
            <p v-if="newRecordType.value.trim()" class="text-xs text-gray-400">
              Saved as: <span class="font-mono font-semibold">{{ newRecordType.value.trim().toLowerCase().replace(/\s+/g, '_') }}</span>
              · starts with <span class="font-mono">['general']</span> — add more categories after creation
            </p>
          </div>
        </div>
        <UAlert v-if="newRecordType.error" color="red" variant="soft" :description="newRecordType.error" />
        <div class="flex gap-3">
          <UButton color="primary" :loading="newRecordType.saving" @click="saveNewRecordType">
            Create Record Type
          </UButton>
          <UButton variant="ghost" color="gray" :disabled="newRecordType.saving" @click="newRecordType.open = false">
            Cancel
          </UButton>
        </div>
      </div>
    </div>

    <!-- ── Rename Modal ─────────────────────────────────────────────────────── -->
    <UModal v-model="renameModal.open" :prevent-close="renameModal.saving">
      <div class="p-6 space-y-4">
        <div>
          <h3 class="text-lg font-black text-gray-900 dark:text-white">
            {{ renameModal.count > 0 ? 'Rename Category' : 'Rename Category' }}
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            Renaming <span class="font-mono font-bold">{{ renameModal.oldValue }}</span>
          </p>
        </div>

        <!-- New name input -->
        <div>
          <label class="block text-sm font-semibold mb-1">New name</label>
          <UInput
            v-model="renameModal.newValue"
            placeholder="new_name"
            class="font-mono"
            autofocus
          />
          <p v-if="renameNormalisedPreview" class="text-xs text-gray-400 mt-1">
            Will be saved as: <span class="font-mono font-semibold">{{ renameNormalisedPreview }}</span>
          </p>
        </div>

        <!-- Warning when notes exist -->
        <div
          v-if="renameModal.count > 0"
          class="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 space-y-3"
        >
          <div class="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 shrink-0" />
            <p class="text-sm font-semibold">
              {{ renameModal.count }} {{ renameModal.count === 1 ? 'note uses' : 'notes use' }}
              this category
            </p>
          </div>
          <p class="text-sm text-amber-700 dark:text-amber-300">What should happen to those notes?</p>
          <div class="space-y-2">
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                v-model="renameModal.updateNotes"
                type="radio"
                :value="true"
                class="mt-0.5"
              >
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">
                  Update all {{ renameModal.count }} notes to the new category
                </p>
                <p class="text-xs text-gray-500">Recommended — keeps your data consistent</p>
              </div>
            </label>
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                v-model="renameModal.updateNotes"
                type="radio"
                :value="false"
                class="mt-0.5"
              >
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">
                  Leave existing notes as-is
                </p>
                <p class="text-xs text-gray-500">
                  Those notes will show the raw value
                  <span class="font-mono">{{ renameModal.oldValue }}</span>
                  in the UI (orphaned)
                </p>
              </div>
            </label>
          </div>
        </div>

        <UAlert v-if="renameModal.error" color="red" variant="soft" :description="renameModal.error" />

        <div class="flex gap-3 pt-2">
          <UButton color="primary" :loading="renameModal.saving" @click="saveRename">
            Save Rename
          </UButton>
          <UButton variant="ghost" color="gray" :disabled="renameModal.saving" @click="closeRename">
            Cancel
          </UButton>
        </div>
      </div>
    </UModal>

    <!-- ── Delete Modal ─────────────────────────────────────────────────────── -->
    <UModal v-model="deleteModal.open" :prevent-close="deleteModal.saving">
      <div class="p-6 space-y-4">
        <div>
          <h3 class="text-lg font-black text-gray-900 dark:text-white">Delete Category</h3>
          <p class="text-sm text-gray-500 mt-1">
            Removing <span class="font-mono font-bold">{{ deleteModal.value }}</span>
            from the <span class="font-semibold">{{ deleteModal.recordType }}</span> list
          </p>
        </div>

        <!-- Simple confirm when no notes use it -->
        <div
          v-if="deleteModal.count === 0"
          class="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4"
        >
          <p class="text-sm text-gray-600 dark:text-gray-300">
            No notes currently use this category. It will be removed from the list immediately.
          </p>
        </div>

        <!-- Warning when notes exist -->
        <div
          v-else
          class="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 space-y-3"
        >
          <div class="flex items-center gap-2 text-red-700 dark:text-red-300">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 shrink-0" />
            <p class="text-sm font-semibold">
              {{ deleteModal.count }} {{ deleteModal.count === 1 ? 'note uses' : 'notes use' }}
              this category
            </p>
          </div>
          <p class="text-sm text-red-700 dark:text-red-300">What should happen to those notes?</p>
          <div class="space-y-2">
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                v-model="deleteModal.deleteNotes"
                type="radio"
                :value="false"
                class="mt-0.5"
              >
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">
                  Keep the {{ deleteModal.count }} notes (leave orphaned)
                </p>
                <p class="text-xs text-gray-500">
                  Notes remain but will show the raw value
                  <span class="font-mono">{{ deleteModal.value }}</span> in the UI
                </p>
              </div>
            </label>
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                v-model="deleteModal.deleteNotes"
                type="radio"
                :value="true"
                class="mt-0.5"
              >
              <div>
                <p class="text-sm font-semibold text-red-700 dark:text-red-400">
                  Permanently delete all {{ deleteModal.count }} notes
                </p>
                <p class="text-xs text-gray-500">
                  This cannot be undone. All note text and attachments will be removed.
                </p>
              </div>
            </label>
          </div>
        </div>

        <UAlert v-if="deleteModal.error" color="red" variant="soft" :description="deleteModal.error" />

        <div class="flex gap-3 pt-2">
          <UButton
            :color="deleteModal.deleteNotes ? 'red' : 'orange'"
            :loading="deleteModal.saving"
            icon="i-heroicons-trash"
            @click="confirmDelete"
          >
            {{ deleteModal.deleteNotes ? `Delete Category + ${deleteModal.count} Notes` : 'Delete Category' }}
          </UButton>
          <UButton variant="ghost" color="gray" :disabled="deleteModal.saving" @click="closeDelete">
            Cancel
          </UButton>
        </div>
      </div>
    </UModal>

  </div>
</template>
