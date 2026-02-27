<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAsyncData, useToast, definePageMeta } from '#imports'

definePageMeta({
  layout: 'dashboard',
  middleware: ['owners']
})

const toast = useToast()

// --- Data ---
const { data: rows, status, refresh } = await useAsyncData('entity-interests', () =>
  $fetch('/api/owners/entity-interests'),
  { server: false }
)

const { data: entities } = await useAsyncData('ownership-entities-for-interests', () =>
  $fetch('/api/owners/entities'),
  { server: false }
)

// --- Equity totals per owned entity (property entity) for validation ---
const equityByOwnedEntity = computed(() => {
  const map = new Map<string, number>()
  for (const r of (rows.value as any[] || [])) {
    map.set(r.owned_entity_id, (map.get(r.owned_entity_id) || 0) + Number(r.equity_pct))
  }
  return map
})

function equityTotalColor(ownedEntityId: string): string {
  const total = equityByOwnedEntity.value.get(ownedEntityId) || 0
  if (total === 100) return 'text-green-600 dark:text-green-400'
  if (total > 100)   return 'text-red-600 dark:text-red-400'
  return 'text-amber-600 dark:text-amber-400'
}

// --- Modal ---
const showModal  = ref(false)
const isCreating = ref(false)
const saving     = ref(false)
const deleting   = ref<string | null>(null)

const emptyForm = () => ({
  id:              '',
  owner_entity_id: '',
  owned_entity_id: '',
  equity_pct:      0,
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
    id:              row.id,
    owner_entity_id: row.owner_entity_id,
    owned_entity_id: row.owned_entity_id,
    equity_pct:      row.equity_pct,
    notes:           row.notes || '',
  }
  isCreating.value = false
  showModal.value  = true
}

async function save() {
  if (!form.value.owner_entity_id) { toast.add({ title: 'Validation', description: 'Select a personal entity (owner).', color: 'warning' }); return }
  if (!form.value.owned_entity_id) { toast.add({ title: 'Validation', description: 'Select a property entity (owned).', color: 'warning' }); return }
  if (form.value.owner_entity_id === form.value.owned_entity_id) { toast.add({ title: 'Validation', description: 'An entity cannot own itself.', color: 'warning' }); return }

  saving.value = true
  try {
    if (isCreating.value) {
      await $fetch('/api/owners/entity-interests', { method: 'POST', body: form.value })
      toast.add({ title: 'Created', description: 'Entity interest recorded.', color: 'success' })
    } else {
      await $fetch(`/api/owners/entity-interests/${form.value.id}`, { method: 'PATCH', body: form.value })
      toast.add({ title: 'Saved', description: 'Entity interest updated.', color: 'success' })
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
  deleting.value = row.id
  try {
    await $fetch(`/api/owners/entity-interests/${row.id}`, { method: 'DELETE' })
    toast.add({ title: 'Removed', description: `${row.owner_entity_name} removed from ${row.owned_entity_name}.`, color: 'success' })
    await refresh()
  } catch (err: any) {
    toast.add({ title: 'Error', description: err?.data?.statusMessage || 'Delete failed.', color: 'error' })
  } finally {
    deleting.value = null
  }
}

// --- Helpers ---
// Personal entities: Trust or Individual (Layer 2 — hold GL codes)
const personalEntityItems = computed(() =>
  (entities.value as any[] || [])
    .filter((e: any) => e.entity_type === 'Trust' || e.entity_type === 'Individual')
    .map((e: any) => ({ label: `${e.name}${e.entity_type ? ` (${e.entity_type})` : ''}`, value: e.id }))
)

// Property entities: LP, LLC, Corporation, Partnership, REIT (Layer 3 — no GL codes)
const propertyEntityItems = computed(() =>
  (entities.value as any[] || [])
    .filter((e: any) => !['Trust', 'Individual'].includes(e.entity_type))
    .map((e: any) => ({ label: `${e.name}${e.entity_type ? ` (${e.entity_type})` : ''}`, value: e.id }))
)

function entityTypeBadgeColor(type: string | null): string {
  const map: Record<string, string> = {
    'Trust':       'indigo',
    'Individual':  'violet',
    'LP':          'sky',
    'LLC':         'teal',
    'Corporation': 'blue',
    'Partnership': 'cyan',
    'REIT':        'orange',
  }
  return map[type || ''] || 'neutral'
}

// Group rows by owned entity for display
const groupedRows = computed(() => {
  const map = new Map<string, { owned_entity_name: string; owned_entity_id: string; owned_entity_type: string | null; rows: any[] }>()
  for (const r of (rows.value as any[] || [])) {
    if (!map.has(r.owned_entity_id)) {
      map.set(r.owned_entity_id, {
        owned_entity_id:   r.owned_entity_id,
        owned_entity_name: r.owned_entity_name,
        owned_entity_type: r.owned_entity_type,
        rows: []
      })
    }
    map.get(r.owned_entity_id)!.rows.push(r)
  }
  return Array.from(map.values()).sort((a, b) => a.owned_entity_name.localeCompare(b.owned_entity_name))
})
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-2 flex items-center justify-between">
      <div class="flex items-baseline gap-3">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Entity Interests</h1>
        <span class="text-lg text-gray-500 font-medium">· {{ (rows as any[])?.length || 0 }} records</span>
      </div>
      <UButton icon="i-heroicons-plus" label="Add Interest" color="primary" @click="openCreate" />
    </div>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
      Personal entities (Trust / Individual) and their ownership interest in property entities (LP / LLC / Corp).
    </p>

    <!-- Equity totals per property entity -->
    <div v-if="equityByOwnedEntity.size" class="mb-4 flex flex-wrap gap-3">
      <div
        v-for="[entityId, total] in equityByOwnedEntity"
        :key="entityId"
        class="flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800"
      >
        <span class="text-gray-600 dark:text-gray-400">
          {{ (rows as any[]).find((r: any) => r.owned_entity_id === entityId)?.owned_entity_name }}
        </span>
        <span :class="equityTotalColor(entityId)">{{ total.toFixed(4) }}%</span>
        <UIcon v-if="total === 100"  name="i-heroicons-check-circle"       class="w-4 h-4 text-green-500" />
        <UIcon v-else-if="total > 100" name="i-heroicons-exclamation-circle" class="w-4 h-4 text-red-500" />
        <UIcon v-else                name="i-heroicons-clock"               class="w-4 h-4 text-amber-500" />
      </div>
    </div>

    <!-- Grouped by property entity -->
    <ClientOnly>
      <div v-if="status !== 'pending' && groupedRows.length" class="space-y-6">
        <div v-for="group in groupedRows" :key="group.owned_entity_id">
          <!-- Property Entity Header -->
          <div class="flex items-center gap-2 mb-2">
            <UBadge
              :color="entityTypeBadgeColor(group.owned_entity_type)"
              variant="subtle"
              size="sm"
            >
              {{ group.owned_entity_type || 'Entity' }}
            </UBadge>
            <span class="font-bold text-gray-800 dark:text-gray-100">{{ group.owned_entity_name }}</span>
            <span class="text-sm font-medium" :class="equityTotalColor(group.owned_entity_id)">
              {{ equityByOwnedEntity.get(group.owned_entity_id)?.toFixed(4) }}% total
            </span>
          </div>

          <!-- Owners of this entity -->
          <table class="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <thead>
              <tr class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th class="text-left py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Personal Entity (Owner)</th>
                <th class="text-center py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Type</th>
                <th class="text-right py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Equity %</th>
                <th class="text-left py-2 px-3 font-semibold text-gray-600 dark:text-gray-400 max-md:hidden">Notes</th>
                <th class="py-2 px-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in group.rows"
                :key="row.id"
                class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td class="py-2 px-3 font-medium text-gray-900 dark:text-white">{{ row.owner_entity_name }}</td>
                <td class="py-2 px-3 text-center">
                  <UBadge
                    v-if="row.owner_entity_type"
                    :color="entityTypeBadgeColor(row.owner_entity_type)"
                    variant="subtle"
                    size="sm"
                  >
                    {{ row.owner_entity_type }}
                  </UBadge>
                  <span v-else class="text-gray-400">—</span>
                </td>
                <td class="py-2 px-3 text-right font-mono font-semibold" :class="equityTotalColor(row.owned_entity_id)">
                  {{ Number(row.equity_pct).toFixed(4) }}%
                </td>
                <td class="py-2 px-3 text-sm text-gray-500 italic max-md:hidden">
                  {{ row.notes || '—' }}
                </td>
                <td class="py-2 px-3">
                  <div class="flex items-center gap-1 justify-end">
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
                      :loading="deleting === row.id"
                      @click.stop="remove(row)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else-if="status === 'pending'" class="flex items-center justify-center py-16">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
      </div>

      <div v-else class="text-center py-12 text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
        No entity interests recorded yet. Add interests to define who owns each property entity.
      </div>
    </ClientOnly>

    <!-- Add / Edit Modal -->
    <SimpleModal
      v-model="showModal"
      :title="isCreating ? 'Add Entity Interest' : 'Edit Entity Interest'"
      description="Record a personal entity's ownership interest in a property entity."
      width="w-full max-w-lg"
    >
      <form class="space-y-5" @submit.prevent="save">

        <!-- Personal Entity (owner) -->
        <UFormField label="Personal Entity (Owner)" required>
          <USelectMenu
            v-model="form.owner_entity_id"
            :items="personalEntityItems"
            value-key="value"
            placeholder="Select Trust or Individual entity"
            :disabled="!isCreating"
            class="w-full"
          />
          <template #hint>
            <span class="text-xs text-gray-400">Trust or Individual — the entity that holds GL codes</span>
          </template>
        </UFormField>

        <!-- Property Entity (owned) -->
        <UFormField label="Property Entity (Owned)" required>
          <USelectMenu
            v-model="form.owned_entity_id"
            :items="propertyEntityItems"
            value-key="value"
            placeholder="Select LP, LLC, or Corp entity"
            :disabled="!isCreating"
            class="w-full"
          />
          <template #hint>
            <span class="text-xs text-gray-400">LP / LLC / Corp — the entity that owns the property</span>
          </template>
        </UFormField>

        <!-- Equity % -->
        <UFormField label="Equity %" required>
          <UInput
            v-model.number="form.equity_pct"
            type="number"
            step="0.0001"
            min="0"
            max="100"
            placeholder="e.g. 12.0000"
            class="w-full"
          />
        </UFormField>

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
            :label="isCreating ? 'Add Interest' : 'Save Changes'"
            icon="i-heroicons-check"
            @click="save"
          />
        </div>
      </template>
    </SimpleModal>
  </div>
</template>
