<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAsyncData, useToast, definePageMeta } from '#imports'

definePageMeta({
  layout: 'dashboard',
  middleware: ['owners']
})

const toast = useToast()

// ─── All recipient entities ────────────────────────────────────────────────────

const { data: allEntities, status: entitiesStatus } = await useAsyncData(
  'statement-entities',
  () => $fetch('/api/owners/distribution-statements/entities'),
  { server: false }
)

// ─── Selected entity + statement data ─────────────────────────────────────────

const selectedEntityId = ref<string | null>(null)
const statement        = ref<any>(null)
const loadingStatement = ref(false)

const entityItems = computed(() => [
  { label: 'Select an entity…', value: null },
  ...(allEntities.value as any[] || []).map((e: any) => ({
    label:   e.name,
    value:   e.id,
    profile: e.profile_name,
  }))
])

const selectedEntity = computed(() =>
  (allEntities.value as any[] || []).find((e: any) => e.id === selectedEntityId.value) || null
)

watch(selectedEntityId, async (id) => {
  if (!id) { statement.value = null; return }
  loadingStatement.value = true
  try {
    statement.value = await $fetch(`/api/owners/distribution-statements?entity_id=${id}`)
  } catch (err: any) {
    toast.add({ title: 'Error', description: err?.data?.statusMessage || 'Failed to load statement.', color: 'error' })
    statement.value = null
  } finally {
    loadingStatement.value = false
  }
})

// ─── Grouping by quarter ───────────────────────────────────────────────────────

const ORDINALS = ['1st', '2nd', '3rd', '4th']

function quarterOf(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const q = Math.floor(d.getMonth() / 3)       // 0-3
  return {
    key:     `${d.getFullYear()}-Q${q + 1}`,   // sortable: "2026-Q1"
    label:   `${ORDINALS[q]} Quarter ${d.getFullYear()}`,
  }
}

const groupedItems = computed(() => {
  const items: any[] = statement.value?.items || []
  if (!items.length) return []

  const groups = new Map<string, { label: string; items: any[] }>()

  for (const item of items) {
    const { key, label } = quarterOf(item.distribution_date)
    if (!groups.has(key)) groups.set(key, { label, items: [] })
    groups.get(key)!.items.push(item)
  }

  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))   // newest quarter first
    .map(([, group]) => {
      const sorted = [...group.items].sort((a, b) => {
        // Sort within quarter: by date desc, then by property_code / entity name
        if (a.distribution_date !== b.distribution_date)
          return b.distribution_date.localeCompare(a.distribution_date)
        const aLabel = a.source_entity_name || a.property_code || ''
        const bLabel = b.source_entity_name || b.property_code || ''
        return aLabel.localeCompare(bLabel)
      })
      return {
        label:    group.label,
        items:    sorted,
        subtotal: {
          gross:    sorted.reduce((s, i) => s + Number(i.gross_amount),    0),
          withheld: sorted.reduce((s, i) => s + Number(i.withhold_amount), 0),
          net:      sorted.reduce((s, i) => s + Number(i.net_amount),      0),
        },
      }
    })
})

// ─── PDF download ──────────────────────────────────────────────────────────────

const downloadingPdf = ref(false)

async function downloadPdf() {
  if (!selectedEntityId.value) return
  downloadingPdf.value = true
  try {
    const res = await $fetch('/api/owners/distribution-statements/pdf', {
      method: 'POST',
      body: { entity_id: selectedEntityId.value },
      responseType: 'blob',
    }) as Blob
    const url  = URL.createObjectURL(res)
    const link = document.createElement('a')
    link.href     = url
    link.download = `${(selectedEntity.value?.name || 'Statement').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-')}-Statement.pdf`
    link.click()
    URL.revokeObjectURL(url)
  } catch (err: any) {
    toast.add({ title: 'Error', description: err?.data?.statusMessage || 'PDF generation failed.', color: 'error' })
  } finally {
    downloadingPdf.value = false
  }
}

// ─── Email confirmation ────────────────────────────────────────────────────────

const sendingEmail   = ref(false)
const showEmailModal = ref(false)

const emailEntities = computed(() =>
  (allEntities.value as any[] || []).filter(
    (e: any) => e.profile_id === statement.value?.profile_id
  )
)

function openEmailModal() {
  if (!statement.value?.profile_id) {
    toast.add({ title: 'No profile', description: 'This entity has no associated profile to email.', color: 'warning' })
    return
  }
  if (!statement.value?.profile_email) {
    toast.add({ title: 'No email', description: `${statement.value.profile_name || 'The associated profile'} has no email address configured.`, color: 'warning' })
    return
  }
  showEmailModal.value = true
}

async function confirmSendEmail() {
  sendingEmail.value = true
  try {
    const res = await $fetch('/api/owners/distribution-statements/email', {
      method: 'POST',
      body: { profile_id: statement.value.profile_id },
    }) as any
    showEmailModal.value = false
    toast.add({
      title: 'Email Sent',
      description: `${res.entity_count} statement${res.entity_count !== 1 ? 's' : ''} sent to ${res.recipient}.`,
      color: 'success',
    })
  } catch (err: any) {
    toast.add({ title: 'Error', description: err?.data?.statusMessage || 'Email failed.', color: 'error' })
  } finally {
    sendingEmail.value = false
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: any): string {
  const n = Number(val)
  if (isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function typeColor(t: string | null): string {
  const m: Record<string, string> = { Operating: 'teal', Refinance: 'blue', Sale: 'violet', Tax: 'amber' }
  return m[t || ''] || 'neutral'
}
</script>

<template>
  <div class="p-6">

    <!-- Header -->
    <div class="mb-5">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Owner Statements</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Full distribution history per entity, grouped by quarter. Select an entity to view, download as PDF, or email to the associated owner.
      </p>
    </div>

    <!-- Entity selector + actions -->
    <div class="flex flex-wrap items-end gap-4 mb-6">
      <div class="flex-1 min-w-64 max-w-sm">
        <label class="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Entity</label>
        <USelectMenu
          v-model="selectedEntityId"
          :items="entityItems"
          value-key="value"
          :loading="entitiesStatus === 'pending'"
          placeholder="Select an entity…"
          searchable
          searchable-placeholder="Search entities…"
          class="w-full"
        />
        <p v-if="selectedEntity?.profile" class="mt-1 text-xs text-gray-500">
          Contact: {{ selectedEntity.profile }}
          <span v-if="selectedEntity.profile_email" class="text-gray-400">&nbsp;·&nbsp;{{ selectedEntity.profile_email }}</span>
        </p>
      </div>

      <template v-if="statement && !loadingStatement">
        <UButton
          icon="i-heroicons-document-arrow-down"
          label="Download PDF"
          color="primary"
          variant="outline"
          :loading="downloadingPdf"
          @click="downloadPdf"
        />
        <UButton
          v-if="statement.profile_email"
          icon="i-heroicons-envelope"
          :label="`Email to ${statement.profile_name}`"
          color="primary"
          :loading="sendingEmail"
          @click="openEmailModal"
        />
        <UTooltip v-else-if="statement.profile_id" text="No email address for this profile">
          <UButton icon="i-heroicons-envelope" label="Email" color="neutral" variant="outline" disabled />
        </UTooltip>
      </template>
    </div>

    <!-- Loading -->
    <div v-if="loadingStatement" class="flex items-center justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400 mr-2" />
      <span class="text-gray-400 text-sm">Loading statement…</span>
    </div>

    <!-- Empty state: no entity selected -->
    <div v-else-if="!selectedEntityId" class="mt-12 text-center text-gray-400">
      <UIcon name="i-heroicons-document-text" class="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p class="text-sm">Select an entity above to view its full distribution history.</p>
    </div>

    <!-- No distributions yet -->
    <div v-else-if="statement && !statement.items?.length" class="mt-12 text-center text-gray-400">
      <p class="text-sm">No distributions found for this entity.</p>
    </div>

    <!-- Statement: grouped by quarter -->
    <template v-else-if="groupedItems.length">

      <!-- Grand total strip -->
      <div class="flex flex-wrap gap-6 px-5 py-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 mb-6">
        <div>
          <p class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Total Gross</p>
          <p class="text-base font-mono font-bold text-gray-900 dark:text-white">{{ fmt(statement.totals.gross) }}</p>
        </div>
        <div v-if="statement.totals.withheld > 0">
          <p class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Withheld (592)</p>
          <p class="text-base font-mono font-bold text-amber-600 dark:text-amber-400">{{ fmt(statement.totals.withheld) }}</p>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Total Net Received</p>
          <p class="text-base font-mono font-bold text-primary-600 dark:text-primary-400">{{ fmt(statement.totals.net) }}</p>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Total Distributions</p>
          <p class="text-base font-bold text-gray-900 dark:text-white">{{ statement.totals.count }}</p>
        </div>
      </div>

      <!-- One section per quarter -->
      <div v-for="group in groupedItems" :key="group.label" class="mb-8">

        <!-- Quarter title -->
        <div class="flex items-center gap-3 mb-3">
          <h2 class="text-base font-bold text-gray-800 dark:text-gray-100">
            {{ group.label }} Distributions
            <span class="font-normal text-gray-500 dark:text-gray-400"> for </span>
            {{ statement.entity_name }}
          </h2>
          <div class="flex-1 border-t border-gray-200 dark:border-gray-700" />
          <span class="text-sm font-mono font-semibold text-gray-700 dark:text-gray-300">
            {{ fmt(group.subtotal.net) }}
          </span>
        </div>

        <!-- Quarter table -->
        <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold uppercase tracking-widest text-gray-400">
                <th class="text-left px-4 py-2.5">Property / Entity</th>
                <th class="text-left px-4 py-2.5">Event</th>
                <th class="text-right px-4 py-2.5">Total Dist.</th>
                <th class="text-right px-4 py-2.5">Equity %</th>
                <th class="text-right px-4 py-2.5">Distribution</th>
                <th v-if="group.subtotal.withheld > 0" class="text-right px-4 py-2.5">Withheld</th>
                <th class="text-left px-4 py-2.5">Transaction Date</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in group.items"
                :key="item.id"
                :class="[
                  'border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors',
                  Number(item.withhold_pct) > 0 ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''
                ]"
              >
                <!-- Property / Entity -->
                <td class="px-4 py-2.5">
                  <UBadge v-if="item.source_entity_name" color="violet" variant="subtle" size="sm">
                    {{ item.source_entity_name }}
                  </UBadge>
                  <UBadge v-else-if="item.property_code" color="neutral" variant="subtle" size="sm">
                    {{ item.property_code }}
                  </UBadge>
                  <span v-else class="text-gray-400">—</span>
                  <p v-if="item.property_name" class="text-xs text-gray-400 mt-0.5">{{ item.property_name }}</p>
                </td>

                <!-- Event -->
                <td class="px-4 py-2.5">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-gray-900 dark:text-white">{{ item.event_title }}</span>
                    <UBadge v-if="item.event_type" :color="typeColor(item.event_type)" variant="subtle" size="xs">
                      {{ item.event_type }}
                    </UBadge>
                  </div>
                  <p class="text-xs font-mono text-gray-400 mt-0.5">{{ item.distribution_date }}</p>
                </td>

                <!-- Total Property Distribution -->
                <td class="px-4 py-2.5 text-right font-mono text-gray-500">
                  {{ fmt(item.event_total_amount) }}
                </td>

                <!-- Equity % -->
                <td class="px-4 py-2.5 text-right font-mono text-xs text-gray-600 dark:text-gray-400">
                  {{ Number(item.equity_pct).toFixed(4) }}%
                </td>

                <!-- Distribution (net) -->
                <td class="px-4 py-2.5 text-right font-mono font-semibold text-gray-900 dark:text-white">
                  {{ fmt(item.net_amount) }}
                </td>

                <!-- Withheld (only if quarter has any) -->
                <td v-if="group.subtotal.withheld > 0" class="px-4 py-2.5 text-right font-mono">
                  <span v-if="Number(item.withhold_amount) > 0" class="text-amber-600 dark:text-amber-400">
                    {{ fmt(item.withhold_amount) }}
                  </span>
                  <span v-else class="text-gray-300 dark:text-gray-600">—</span>
                </td>

                <!-- Transaction Date -->
                <td class="px-4 py-2.5 font-mono text-sm">
                  <span v-if="item.transfer_date" class="text-gray-700 dark:text-gray-300">
                    {{ item.transfer_date }}
                  </span>
                  <span v-else class="text-gray-400">Pending</span>
                </td>
              </tr>
            </tbody>

            <!-- Quarter subtotal -->
            <tfoot>
              <tr class="bg-gray-100 dark:bg-gray-800/80 border-t-2 border-gray-300 dark:border-gray-600 font-bold">
                <td class="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider" colspan="2">
                  {{ group.label }} Subtotal
                </td>
                <td class="px-4 py-2.5" />
                <td class="px-4 py-2.5" />
                <td class="px-4 py-2.5 text-right font-mono text-gray-900 dark:text-white">
                  {{ fmt(group.subtotal.net) }}
                </td>
                <td v-if="group.subtotal.withheld > 0" class="px-4 py-2.5 text-right font-mono text-amber-600 dark:text-amber-400">
                  {{ fmt(group.subtotal.withheld) }}
                </td>
                <td class="px-4 py-2.5" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- 592 notice -->
      <div v-if="statement.totals.withheld > 0" class="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
        <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div class="text-sm text-amber-800 dark:text-amber-200">
          <span class="font-semibold">CA Form 592</span> — Total withheld across all distributions:
          <strong>{{ fmt(statement.totals.withheld) }}</strong>. File Form 592 with the FTB for each applicable tax year.
        </div>
      </div>

    </template>

    <!-- ── Email Confirmation Modal ─────────────────────────────────────────── -->
    <SimpleModal
      v-model="showEmailModal"
      title="Send Distribution Statements"
      width="w-full max-w-md"
    >
      <div class="space-y-4">
        <div class="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
          <UIcon name="i-heroicons-envelope" class="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div class="text-sm text-blue-800 dark:text-blue-200">
            <p class="font-semibold">Sending to: {{ statement?.profile_email }}</p>
            <p class="mt-0.5 text-blue-600 dark:text-blue-300">{{ statement?.profile_name }}</p>
          </div>
        </div>

        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
            One PDF statement will be generated and attached for each entity:
          </p>
          <ul class="space-y-1">
            <li
              v-for="entity in emailEntities"
              :key="entity.id"
              class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <UIcon name="i-heroicons-document-text" class="w-4 h-4 text-gray-400 shrink-0" />
              {{ entity.name }}
            </li>
          </ul>
        </div>

        <p class="text-xs text-gray-400">
          Each PDF covers all distributions since inception for that entity, grouped by quarter.
        </p>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="ghost" label="Cancel" :disabled="sendingEmail" @click="showEmailModal = false" />
          <UButton
            color="primary"
            icon="i-heroicons-paper-airplane"
            label="Send Email"
            :loading="sendingEmail"
            @click="confirmSendEmail"
          />
        </div>
      </template>
    </SimpleModal>

  </div>
</template>
