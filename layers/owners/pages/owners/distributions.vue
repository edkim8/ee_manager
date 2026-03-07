<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAsyncData, useToast, definePageMeta } from '#imports'

definePageMeta({
  layout: 'dashboard',
  middleware: ['owners']
})

const toast = useToast()

// ─── Data ─────────────────────────────────────────────────────────────────────

const { data: events, status, refresh } = await useAsyncData('distribution-events', () =>
  $fetch('/api/owners/distribution-events'),
  { server: false }
)

const { data: properties } = await useAsyncData('properties-for-dist', () =>
  $fetch('/api/owners/properties'),
  { server: false }
)

const { data: allEntities } = await useAsyncData('entities-for-rollup', () =>
  $fetch('/api/owners/entities'),
  { server: false }
)

// ─── Duration filter ──────────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { label: 'All Time',         value: 'all' },
  { label: 'This Month',       value: 'this_month' },
  { label: 'This Quarter',     value: 'this_quarter' },
  { label: 'This Year',        value: 'this_year' },
  { label: 'Last Year',        value: 'last_year' },
  { label: 'Trailing 12 Mo',   value: 'trailing_12' },
]

const selectedDuration = ref('all')
const filterProperty   = ref('none')

function getDateBounds(dur: string): { start: string; end: string } | null {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const today = ymd(now)

  if (dur === 'this_month') {
    return { start: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, end: today }
  }
  if (dur === 'this_quarter') {
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    return { start: ymd(qStart), end: today }
  }
  if (dur === 'this_year') {
    return { start: `${now.getFullYear()}-01-01`, end: today }
  }
  if (dur === 'last_year') {
    const y = now.getFullYear() - 1
    return { start: `${y}-01-01`, end: `${y}-12-31` }
  }
  if (dur === 'trailing_12') {
    const d = new Date(now); d.setFullYear(d.getFullYear() - 1)
    return { start: ymd(d), end: today }
  }
  return null
}

const filteredEvents = computed(() => {
  let list = (events.value as any[] || [])

  if (filterProperty.value && filterProperty.value !== 'none') {
    list = list.filter((r: any) => r.property_id === filterProperty.value)
  }

  const bounds = getDateBounds(selectedDuration.value)
  if (bounds) {
    list = list.filter((r: any) =>
      r.distribution_date >= bounds.start && r.distribution_date <= bounds.end
    )
  }

  return list
})

const filteredTotal = computed(() =>
  filteredEvents.value.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0)
)

// ─── Create event modal ───────────────────────────────────────────────────────

const showCreateModal = ref(false)
const creating        = ref(false)

const DIST_TYPES = ['Operating', 'Refinance', 'Sale', 'Tax']

const emptyForm = () => ({
  property_id:       'none',
  title:             '',
  distribution_date: new Date().toISOString().slice(0, 10),
  total_amount:      0,
  type:              'none',
  notes:             '',
  entity_level:      false,
})
const createForm = ref(emptyForm())

async function submitCreate() {
  if (!createForm.value.property_id || createForm.value.property_id === 'none') {
    toast.add({ title: 'Validation', description: 'Select a property.', color: 'warning' }); return
  }
  if (!createForm.value.title.trim()) {
    toast.add({ title: 'Validation', description: 'Title is required.', color: 'warning' }); return
  }
  if (!createForm.value.distribution_date) {
    toast.add({ title: 'Validation', description: 'Distribution date is required.', color: 'warning' }); return
  }
  if (!createForm.value.total_amount || Number(createForm.value.total_amount) <= 0) {
    toast.add({ title: 'Validation', description: 'Total amount must be greater than 0.', color: 'warning' }); return
  }

  creating.value = true
  try {
    const res = await $fetch('/api/owners/distribution-events', {
      method: 'POST',
      body: {
        ...createForm.value,
        property_id: createForm.value.property_id,
        type: createForm.value.type === 'none' ? null : createForm.value.type,
      }
    }) as any
    toast.add({ title: 'Distribution Created', description: `${res.line_item_count} entities generated.`, color: 'success' })
    showCreateModal.value = false
    createForm.value = emptyForm()
    await refresh()
  } catch (err: any) {
    toast.add({ title: 'Error', description: err?.data?.statusMessage || 'Failed to create distribution.', color: 'error' })
  } finally {
    creating.value = false
  }
}

// ─── Delete event ─────────────────────────────────────────────────────────────

const deleting = ref<string | null>(null)

async function deleteEvent(row: any) {
  // Complete → blocked at server and hidden in UI; guard here as safety net
  if (row.status === 'Complete') return

  if (row.status === 'Processing') {
    const confirmed = confirm(
      `⚠️ WARNING: "${row.title}" is in Processing — ${row.confirmed_count} of ${row.owner_count} transfers have already been confirmed.\n\n` +
      `Deleting this record will permanently remove the audit trail for those payments.\n\n` +
      `Are you sure you want to delete this distribution?`
    )
    if (!confirmed) return
  } else {
    if (!confirm(`Delete "${row.title}"? This will remove all ${row.owner_count} line items.`)) return
  }

  deleting.value = row.id
  try {
    await $fetch(`/api/owners/distribution-events/${row.id}`, { method: 'DELETE' })
    toast.add({ title: 'Deleted', description: `"${row.title}" removed.`, color: 'success' })
    await refresh()
  } catch (err: any) {
    toast.add({ title: 'Error', description: err?.data?.statusMessage || 'Delete failed.', color: 'error' })
  } finally {
    deleting.value = null
  }
}

// ─── Detail / line items modal ────────────────────────────────────────────────

const showDetailModal = ref(false)
const detailEvent     = ref<any>(null)
const detailItems     = ref<any[]>([])
const loadingDetail   = ref(false)
const savingItem      = ref<string | null>(null)

async function openDetail(row: any) {
  loadingDetail.value = true
  showDetailModal.value = true
  detailEvent.value = row
  try {
    const res = await $fetch(`/api/owners/distribution-events/${row.id}`) as any
    detailEvent.value = res
    detailItems.value = res.line_items || []
  } catch (err: any) {
    toast.add({ title: 'Error', description: 'Failed to load distribution details.', color: 'error' })
  } finally {
    loadingDetail.value = false
  }
}

async function toggleConfirmed(item: any) {
  const newConfirmed = !item.transfer_confirmed
  savingItem.value = item.id
  try {
    await $fetch(`/api/owners/distribution-line-items/${item.id}`, {
      method: 'PATCH',
      body: {
        transfer_confirmed: newConfirmed,
        transfer_date: newConfirmed && !item.transfer_date
          ? new Date().toISOString().slice(0, 10)
          : item.transfer_date,
      }
    })
    item.transfer_confirmed = newConfirmed
    if (newConfirmed && !item.transfer_date) {
      item.transfer_date = new Date().toISOString().slice(0, 10)
    }
    // Refresh event list in background so status badge updates
    refresh()
  } catch (err: any) {
    toast.add({ title: 'Error', description: 'Failed to update transfer status.', color: 'error' })
  } finally {
    savingItem.value = null
  }
}

async function saveTransferDate(item: any) {
  savingItem.value = item.id
  try {
    await $fetch(`/api/owners/distribution-line-items/${item.id}`, {
      method: 'PATCH',
      body: { transfer_date: item.transfer_date || null }
    })
  } catch (err: any) {
    toast.add({ title: 'Error', description: 'Failed to save transfer date.', color: 'error' })
  } finally {
    savingItem.value = null
  }
}

// ─── Rollup modal ─────────────────────────────────────────────────────────────

const showRollupModal  = ref(false)
const rolling          = ref(false)

const emptyRollup = () => ({
  source_entity_id:  'none',
  total_amount:      0,
  title:             '',
  distribution_date: new Date().toISOString().slice(0, 10),
  type:              'none',
  notes:             '',
})
const rollupForm = ref(emptyRollup())

// Pass-through entities: LP, LLC, Partnership, etc. — not Trust/Individual
const passThruEntityItems = computed(() =>
  (allEntities.value as any[] || [])
    .filter((e: any) => !['Trust', 'Individual'].includes(e.entity_type))
    .map((e: any) => ({ label: `${e.name} (${e.entity_type})`, value: e.id }))
)

async function submitRollup() {
  if (!rollupForm.value.source_entity_id || rollupForm.value.source_entity_id === 'none') {
    toast.add({ title: 'Validation', description: 'Select an entity.', color: 'warning' }); return
  }
  if (!rollupForm.value.total_amount || Number(rollupForm.value.total_amount) <= 0) {
    toast.add({ title: 'Validation', description: 'Amount must be greater than 0.', color: 'warning' }); return
  }
  if (!rollupForm.value.title.trim()) {
    toast.add({ title: 'Validation', description: 'Title is required.', color: 'warning' }); return
  }
  if (!rollupForm.value.distribution_date) {
    toast.add({ title: 'Validation', description: 'Distribution date is required.', color: 'warning' }); return
  }

  rolling.value = true
  try {
    const res = await $fetch('/api/owners/distribution-events/rollup', {
      method: 'POST',
      body: {
        source_entity_id:  rollupForm.value.source_entity_id,
        total_amount:      rollupForm.value.total_amount,
        title:             rollupForm.value.title.trim(),
        distribution_date: rollupForm.value.distribution_date,
        type:              rollupForm.value.type === 'none' ? null : rollupForm.value.type,
        notes:             rollupForm.value.notes || null,
      }
    }) as any
    toast.add({ title: 'Distribution Created', description: `${res.line_item_count} partners · ${fmt(res.total_amount)} total`, color: 'success' })
    showRollupModal.value = false
    rollupForm.value = emptyRollup()
    await refresh()
  } catch (err: any) {
    toast.add({ title: 'Error', description: err?.data?.statusMessage || 'Failed to create entity distribution.', color: 'error' })
  } finally {
    rolling.value = false
  }
}

// ─── Detail computed ──────────────────────────────────────────────────────────

const detailTotals = computed(() => {
  const items = detailItems.value
  return {
    gross:    items.reduce((s, i) => s + Number(i.gross_amount),    0),
    withheld: items.reduce((s, i) => s + Number(i.withhold_amount), 0),
    net:      items.reduce((s, i) => s + Number(i.net_amount),      0),
    confirmed: items.filter((i) => i.transfer_confirmed).length,
    total:    items.length,
  }
})

const has592Items = computed(() =>
  detailItems.value.some((i) => Number(i.withhold_pct) > 0)
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

const propertyFilterItems = computed(() => [
  { label: 'All Properties', value: 'none' },
  ...(properties.value as any[] || []).map((p: any) => ({ label: `${p.code} — ${p.name}`, value: p.id }))
])

const propertyCreateItems = computed(() =>
  (properties.value as any[] || []).map((p: any) => ({ label: `${p.code} — ${p.name}`, value: p.id }))
)

// Auto-set entity_level when property selection changes
watch(() => createForm.value.property_id, (id) => {
  const prop = (properties.value as any[] || []).find((p: any) => p.id === id)
  if (prop) createForm.value.entity_level = !!prop.entity_level_distribution
})

const propertyForcesEntityLevel = computed(() => {
  const prop = (properties.value as any[] || []).find((p: any) => p.id === createForm.value.property_id)
  return !!prop?.entity_level_distribution
})

function fmt(val: any): string {
  const n = Number(val)
  if (isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function statusColor(s: string): string {
  return s === 'Complete' ? 'success' : s === 'Processing' ? 'warning' : 'neutral'
}

function typeColor(t: string | null): string {
  const m: Record<string, string> = { Operating: 'teal', Refinance: 'blue', Sale: 'violet', Tax: 'amber' }
  return m[t || ''] || 'neutral'
}
</script>

<template>
  <div class="p-6">

    <!-- Header -->
    <div class="mb-2 flex items-center justify-between">
      <div class="flex items-baseline gap-3">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Distributions</h1>
        <span class="text-lg text-gray-500 font-medium">· {{ filteredEvents.length }} events</span>
      </div>
      <div class="flex items-center gap-2">
        <UButton icon="i-heroicons-building-library" label="Entity Distribution" color="neutral" variant="outline" @click="showRollupModal = true" />
        <UButton icon="i-heroicons-plus" label="New Distribution" color="primary" @click="showCreateModal = true" />
      </div>
    </div>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
      Track owner distributions by property and event. Transfer confirmations and withholding (CA Form 592) tracked per owner.
    </p>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <USelectMenu
        v-model="selectedDuration"
        :items="DURATION_OPTIONS"
        value-key="value"
        class="w-44"
      />
      <USelectMenu
        v-model="filterProperty"
        :items="propertyFilterItems"
        value-key="value"
        class="w-52"
      />
      <UButton
        icon="i-heroicons-document-text"
        label="Owner Statements"
        color="neutral"
        variant="ghost"
        size="sm"
        to="/owners/statements"
      />
      <div v-if="filteredEvents.length" class="ml-auto text-sm font-semibold text-gray-700 dark:text-gray-300">
        Total: <span class="font-mono text-gray-900 dark:text-white">{{ fmt(filteredTotal) }}</span>
      </div>
    </div>

    <!-- Events Table -->
    <ClientOnly>
      <GenericDataTable
        :data="filteredEvents"
        :loading="status === 'pending'"
        :columns="[
          { key: 'distribution_date', label: 'Dist. Date',  sortable: true,  width: '115px' },
          { key: 'property_code',     label: 'Property',    sortable: true,  width: '100px' },
          { key: 'title',             label: 'Title',       sortable: true,  width: '220px' },
          { key: 'total_amount',      label: 'Total',       sortable: true,  width: '130px', align: 'right' },
          { key: 'type',              label: 'Type',        sortable: true,  width: '110px', align: 'center' },
          { key: 'status',            label: 'Status',      sortable: true,  width: '110px', align: 'center' },
          { key: 'owners',            label: 'Owners',      sortable: false, width: '90px',  align: 'center', class: 'max-md:hidden', headerClass: 'max-md:hidden' },
          { key: 'actions',           label: '',            sortable: false, width: '90px',  align: 'center' },
        ]"
        row-key="id"
        enable-pagination
        :page-size="25"
        default-sort-field="distribution_date"
        default-sort-direction="desc"
        striped
        enable-export
        export-filename="distributions"
      >
        <template #cell-distribution_date="{ value }">
          <span class="font-mono text-sm">{{ value }}</span>
        </template>

        <template #cell-property_code="{ value, row }">
          <UBadge v-if="value" color="neutral" variant="subtle" size="sm">{{ value }}</UBadge>
          <UBadge v-else-if="row.source_entity_name" color="violet" variant="subtle" size="sm">{{ row.source_entity_name }}</UBadge>
          <span v-else class="text-gray-400">—</span>
        </template>

        <template #cell-title="{ value, row }">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-gray-900 dark:text-white">{{ value }}</span>
            <UBadge v-if="row.entity_level" color="indigo" variant="subtle" size="xs">Entity</UBadge>
            <UBadge v-else-if="row.rollup_event_ids?.length" color="violet" variant="subtle" size="xs">Rollup</UBadge>
          </div>
        </template>

        <template #cell-total_amount="{ value }">
          <span class="font-mono font-semibold">{{ fmt(value) }}</span>
        </template>

        <template #cell-type="{ value }">
          <UBadge v-if="value" :color="typeColor(value)" variant="subtle" size="sm">{{ value }}</UBadge>
          <span v-else class="text-gray-400">—</span>
        </template>

        <template #cell-status="{ value }">
          <UBadge :color="statusColor(value)" variant="subtle" size="sm">{{ value }}</UBadge>
        </template>

        <template #cell-owners="{ row }">
          <span class="text-sm">
            <span class="font-semibold text-green-600 dark:text-green-400">{{ row.confirmed_count }}</span>
            <span class="text-gray-400">/{{ row.owner_count }}</span>
          </span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex items-center gap-1 justify-center">
            <UButton
              icon="i-heroicons-eye"
              color="primary"
              variant="ghost"
              size="sm"
              @click.stop="openDetail(row)"
            />
            <UButton
              v-if="row.status !== 'Complete'"
              icon="i-heroicons-trash"
              :color="row.status === 'Processing' ? 'warning' : 'error'"
              variant="ghost"
              size="sm"
              :loading="deleting === row.id"
              @click.stop="deleteEvent(row)"
            />
            <UTooltip v-else text="Complete distributions cannot be deleted">
              <UButton
                icon="i-heroicons-lock-closed"
                color="neutral"
                variant="ghost"
                size="sm"
                disabled
              />
            </UTooltip>
          </div>
        </template>
      </GenericDataTable>
    </ClientOnly>

    <!-- ── Create Modal ──────────────────────────────────────────────────────── -->
    <SimpleModal
      v-model="showCreateModal"
      title="New Distribution"
      description="Select a property to auto-generate owner line items from the ownership chain."
      width="w-full max-w-xl"
    >
      <form class="space-y-5" @submit.prevent="submitCreate">

        <UFormField label="Property" required>
          <USelectMenu
            v-model="createForm.property_id"
            :items="propertyCreateItems"
            value-key="value"
            placeholder="Select property"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Title" required>
          <UInput
            v-model="createForm.title"
            placeholder="e.g. Q1 2026 Operating Distribution"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Distribution Date" required>
            <UInput v-model="createForm.distribution_date" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Total Amount (USD)" required>
            <UInput
              v-model.number="createForm.total_amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 150000.00"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField label="Type">
          <USelectMenu
            v-model="createForm.type"
            :items="[{ label: 'None', value: 'none' }, ...DIST_TYPES.map(t => ({ label: t, value: t }))]"
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Notes">
          <UTextarea v-model="createForm.notes" placeholder="Optional notes" :rows="2" class="w-full" />
        </UFormField>

        <!-- Entity-level indicator / toggle -->
        <div
          class="flex items-start gap-3 p-3 rounded-lg border select-none"
          :class="[
            createForm.entity_level
              ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/20'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800',
            propertyForcesEntityLevel ? 'cursor-default opacity-90' : 'cursor-pointer'
          ]"
          @click="!propertyForcesEntityLevel && (createForm.entity_level = !createForm.entity_level)"
        >
          <USwitch v-model="createForm.entity_level" size="sm" class="mt-0.5 shrink-0" :disabled="propertyForcesEntityLevel" />
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <p class="text-sm font-semibold" :class="createForm.entity_level ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'">
                Entity-level distribution
              </p>
              <UBadge v-if="propertyForcesEntityLevel" color="indigo" variant="subtle" size="xs">Required for OB</UBadge>
            </div>
            <p class="text-xs mt-0.5" :class="createForm.entity_level ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400'">
              <template v-if="createForm.entity_level">
                Distributes directly to property entities (SBLP 85% + CLL-Southborder 15%). Each receives their share — no traversal to individual partners.
              </template>
              <template v-else>
                Distributes through to personal entity partners (Trusts / Individuals).
              </template>
            </p>
          </div>
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="showCreateModal = false" />
          <UButton
            color="primary"
            :loading="creating"
            label="Generate Distribution"
            icon="i-heroicons-bolt"
            @click="submitCreate"
          />
        </div>
      </template>
    </SimpleModal>

    <!-- ── Detail Modal (line items) ─────────────────────────────────────────── -->
    <SimpleModal
      v-model="showDetailModal"
      :title="detailEvent?.title || 'Distribution Detail'"
      width="w-full max-w-7xl"
    >
      <!-- Loading -->
      <div v-if="loadingDetail" class="flex items-center justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
      </div>

      <template v-else>
        <!-- Event header strip -->
        <div class="flex flex-wrap gap-4 mb-5 px-1 text-sm">
          <div>
            <span class="text-xs font-semibold uppercase tracking-widest text-gray-400">
              {{ detailEvent?.source_entity_name ? 'Entity' : 'Property' }}
            </span>
            <p class="font-semibold text-gray-900 dark:text-white mt-0.5">
              <template v-if="detailEvent?.source_entity_name">
                <UBadge color="violet" variant="subtle" size="sm" class="mr-1">Entity</UBadge>
                {{ detailEvent.source_entity_name }}
              </template>
              <template v-else>
                <UBadge color="neutral" variant="subtle" size="sm" class="mr-1">{{ detailEvent?.property_code }}</UBadge>
                {{ detailEvent?.property_name }}
              </template>
            </p>
          </div>
          <div>
            <span class="text-xs font-semibold uppercase tracking-widest text-gray-400">Dist. Date</span>
            <p class="font-mono mt-0.5">{{ detailEvent?.distribution_date }}</p>
          </div>
          <div>
            <span class="text-xs font-semibold uppercase tracking-widest text-gray-400">Total Amount</span>
            <p class="font-mono font-bold text-gray-900 dark:text-white mt-0.5">{{ fmt(detailEvent?.total_amount) }}</p>
          </div>
          <div>
            <span class="text-xs font-semibold uppercase tracking-widest text-gray-400">Status</span>
            <div class="mt-0.5">
              <UBadge :color="statusColor(detailEvent?.status)" variant="subtle" size="sm">
                {{ detailEvent?.status }}
              </UBadge>
            </div>
          </div>
          <div>
            <span class="text-xs font-semibold uppercase tracking-widest text-gray-400">Confirmed</span>
            <p class="mt-0.5 font-semibold">
              <span class="text-green-600 dark:text-green-400">{{ detailTotals.confirmed }}</span>
              <span class="text-gray-400"> / {{ detailTotals.total }}</span>
            </p>
          </div>
        </div>

        <!-- Rollup source banner -->
        <div v-if="detailEvent?.rollup_event_ids?.length" class="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 text-sm text-violet-700 dark:text-violet-300">
          <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 shrink-0" />
          <span>Rollup of <strong>{{ detailEvent.rollup_event_ids.length }}</strong> source event{{ detailEvent.rollup_event_ids.length > 1 ? 's' : '' }}</span>
        </div>

        <!-- Entity-level banner -->
        <div v-else-if="detailEvent?.entity_level" class="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 text-sm text-indigo-700 dark:text-indigo-300">
          <UIcon name="i-heroicons-building-office" class="w-4 h-4 shrink-0" />
          <span>Entity-level distribution — funds sent to entities directly. Partners receive their share in a quarterly rollup.</span>
        </div>

        <!-- Line items table -->
        <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold uppercase tracking-widest text-gray-400">
                <th class="text-left px-3 py-2.5">Entity</th>
                <th class="text-left px-3 py-2.5">GL</th>
                <th class="text-right px-3 py-2.5">Equity %</th>
                <th class="text-right px-3 py-2.5">Gross</th>
                <th class="text-right px-3 py-2.5">Withhold %</th>
                <th class="text-right px-3 py-2.5">Withheld</th>
                <th class="text-right px-3 py-2.5 font-bold text-gray-600 dark:text-gray-300">Net</th>
                <th class="text-center px-3 py-2.5">Confirmed</th>
                <th class="text-left px-3 py-2.5">Transfer Date</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in detailItems"
                :key="item.id"
                :class="[
                  'border-b border-gray-100 dark:border-gray-800 transition-colors',
                  Number(item.withhold_pct) > 0
                    ? 'bg-amber-50/50 dark:bg-amber-900/10'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                ]"
              >
                <!-- Owner -->
                <td class="px-3 py-2.5 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                  {{ item.owner_name }}
                </td>

                <!-- GL -->
                <td class="px-3 py-2.5">
                  <span v-if="item.distribution_gl" class="font-mono text-xs text-gray-500">{{ item.distribution_gl }}</span>
                  <span v-else class="text-gray-400">—</span>
                </td>

                <!-- Equity % -->
                <td class="px-3 py-2.5 text-right font-mono text-xs">
                  {{ Number(item.equity_pct).toFixed(4) }}%
                </td>

                <!-- Gross -->
                <td class="px-3 py-2.5 text-right font-mono">{{ fmt(item.gross_amount) }}</td>

                <!-- Withhold % -->
                <td class="px-3 py-2.5 text-right">
                  <span v-if="Number(item.withhold_pct) > 0" class="font-mono text-xs text-amber-600 dark:text-amber-400 font-semibold">
                    {{ Number(item.withhold_pct).toFixed(1) }}%
                  </span>
                  <span v-else class="text-gray-400">—</span>
                </td>

                <!-- Withheld -->
                <td class="px-3 py-2.5 text-right font-mono">
                  <span v-if="Number(item.withhold_amount) > 0" class="text-amber-600 dark:text-amber-400">
                    {{ fmt(item.withhold_amount) }}
                  </span>
                  <span v-else class="text-gray-400">—</span>
                </td>

                <!-- Net -->
                <td class="px-3 py-2.5 text-right font-mono font-bold text-gray-900 dark:text-white">
                  {{ fmt(item.net_amount) }}
                </td>

                <!-- Confirmed toggle -->
                <td class="px-3 py-2.5 text-center">
                  <UButton
                    :icon="item.transfer_confirmed ? 'i-heroicons-check-circle-solid' : 'i-heroicons-clock'"
                    :color="item.transfer_confirmed ? 'success' : 'neutral'"
                    variant="ghost"
                    size="sm"
                    :loading="savingItem === item.id"
                    @click="toggleConfirmed(item)"
                  />
                </td>

                <!-- Transfer date -->
                <td class="px-3 py-2.5">
                  <UInput
                    v-model="item.transfer_date"
                    type="date"
                    size="sm"
                    class="w-36"
                    @change="saveTransferDate(item)"
                  />
                </td>
              </tr>
            </tbody>

            <!-- Totals footer -->
            <tfoot>
              <tr class="bg-gray-100 dark:bg-gray-800 border-t-2 border-gray-300 dark:border-gray-600 font-bold text-sm">
                <td class="px-3 py-2.5 text-gray-600 dark:text-gray-300" colspan="3">Totals</td>
                <td class="px-3 py-2.5 text-right font-mono">{{ fmt(detailTotals.gross) }}</td>
                <td class="px-3 py-2.5"></td>
                <td class="px-3 py-2.5 text-right font-mono text-amber-600 dark:text-amber-400">
                  {{ detailTotals.withheld > 0 ? fmt(detailTotals.withheld) : '—' }}
                </td>
                <td class="px-3 py-2.5 text-right font-mono text-gray-900 dark:text-white">{{ fmt(detailTotals.net) }}</td>
                <td class="px-3 py-2.5 text-center text-green-600 dark:text-green-400">
                  {{ detailTotals.confirmed }}/{{ detailTotals.total }}
                </td>
                <td class="px-3 py-2.5"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- CA Form 592 notice -->
        <div v-if="has592Items" class="mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
          <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div class="text-sm text-amber-800 dark:text-amber-200">
            <span class="font-semibold">CA Form 592 required</span> — this distribution includes
            <strong>{{ fmt(detailTotals.withheld) }}</strong> in withheld amounts for
            {{ detailItems.filter(i => Number(i.withhold_pct) > 0).length }} non-resident owner(s).
            File Form 592 with the FTB for the applicable tax period.
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end">
          <UButton color="neutral" variant="ghost" label="Close" @click="showDetailModal = false" />
        </div>
      </template>
    </SimpleModal>

    <!-- ── Entity Distribution Modal (e.g. SBLP quarterly) ─────────────────── -->
    <SimpleModal
      v-model="showRollupModal"
      title="Entity Distribution"
      description="Distribute from a pass-through entity (e.g. SBLP) to its partners. Amount is independent — set it after accounting for any entity-level expenses."
      width="w-full max-w-lg"
    >
      <form class="space-y-5" @submit.prevent="submitRollup">

        <UFormField label="Entity" required>
          <USelectMenu
            v-model="rollupForm.source_entity_id"
            :items="[{ label: 'Select entity…', value: 'none' }, ...passThruEntityItems]"
            value-key="value"
            class="w-full"
          />
          <template #hint>
            <span class="text-xs text-gray-400">Partners are auto-generated from Entity Interests</span>
          </template>
        </UFormField>

        <UFormField label="Title" required>
          <UInput
            v-model="rollupForm.title"
            placeholder="e.g. Q1 2026 SBLP Distribution"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Distribution Date" required>
            <UInput v-model="rollupForm.distribution_date" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Total Amount (USD)" required>
            <UInput
              v-model.number="rollupForm.total_amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 580000.00"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField label="Type">
          <USelectMenu
            v-model="rollupForm.type"
            :items="[{ label: 'None', value: 'none' }, ...DIST_TYPES.map(t => ({ label: t, value: t }))]"
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Notes">
          <UTextarea v-model="rollupForm.notes" placeholder="Optional notes" :rows="2" class="w-full" />
        </UFormField>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="showRollupModal = false" />
          <UButton
            color="violet"
            :loading="rolling"
            label="Generate Distribution"
            icon="i-heroicons-bolt"
            @click="submitRollup"
          />
        </div>
      </template>
    </SimpleModal>

  </div>
</template>
