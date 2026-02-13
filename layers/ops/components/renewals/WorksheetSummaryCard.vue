<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  worksheet: any
}>()

// Helper: Calculate percentage
const calculatePercent = (numerator: number, denominator: number) => {
  if (!denominator || denominator === 0) return 0
  return Math.round((numerator / denominator) * 100)
}

// Format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(value || 0)
}

// Format date
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Status computed
const isDraft = computed(() => props.worksheet.status === 'draft')
const isFinal = computed(() => props.worksheet.status === 'final')
const isArchived = computed(() => props.worksheet.status === 'archived')

// Rent source breakdown for Standard renewals
const standardSourceBreakdown = computed(() => {
  const total = props.worksheet.standard_total || 0
  const ltlCount = props.worksheet.standard_ltl_count || 0
  const maxCount = props.worksheet.standard_max_count || 0
  const manualCount = props.worksheet.standard_manual_count || 0

  const ltlTotal = props.worksheet.standard_ltl_total || 0
  const maxTotal = props.worksheet.standard_max_total || 0
  const manualTotal = props.worksheet.standard_manual_total || 0

  const ltlCurrent = props.worksheet.standard_ltl_current || 0
  const maxCurrent = props.worksheet.standard_max_current || 0
  const manualCurrent = props.worksheet.standard_manual_current || 0

  return {
    title: `Standard Renewals (${total})`,
    sources: [
      {
        label: 'LTL %',
        count: ltlCount,
        total: ltlTotal,
        current: ltlCurrent,
        increase: ltlTotal - ltlCurrent,
        increasePercent: calculatePercent(ltlTotal - ltlCurrent, ltlCurrent)
      },
      {
        label: 'Max %',
        count: maxCount,
        total: maxTotal,
        current: maxCurrent,
        increase: maxTotal - maxCurrent,
        increasePercent: calculatePercent(maxTotal - maxCurrent, maxCurrent)
      },
      {
        label: 'Manual',
        count: manualCount,
        total: manualTotal,
        current: manualCurrent,
        increase: manualTotal - manualCurrent,
        increasePercent: calculatePercent(manualTotal - manualCurrent, manualCurrent)
      }
    ],
    totalOffered: ltlTotal + maxTotal + manualTotal,
    totalCurrent: ltlCurrent + maxCurrent + manualCurrent,
    totalIncrease: (ltlTotal + maxTotal + manualTotal) - (ltlCurrent + maxCurrent + manualCurrent),
    avgIncrease: calculatePercent(
      (ltlTotal + maxTotal + manualTotal) - (ltlCurrent + maxCurrent + manualCurrent),
      ltlCurrent + maxCurrent + manualCurrent
    )
  }
})

// Rent source breakdown for MTM renewals
const mtmSourceBreakdown = computed(() => {
  const total = props.worksheet.mtm_total || 0
  const mtmTotal = props.worksheet.mtm_total_rent || 0
  const mtmCurrent = props.worksheet.mtm_current_rent || 0

  return {
    title: `Month-to-Month (${total})`,
    totalOffered: mtmTotal,
    totalCurrent: mtmCurrent,
    totalIncrease: mtmTotal - mtmCurrent,
    avgIncrease: calculatePercent(mtmTotal - mtmCurrent, mtmCurrent)
  }
})

// Status breakdown
const statusBreakdown = computed(() => {
  const standardTotal = props.worksheet.standard_total || 0
  const mtmTotal = props.worksheet.mtm_total || 0

  return {
    standard: {
      pending: props.worksheet.standard_pending_count || 0,
      offered: props.worksheet.standard_offered_count || 0,
      manually_accepted: props.worksheet.standard_manually_accepted_count || 0,
      manually_declined: props.worksheet.standard_manually_declined_count || 0,
      accepted: props.worksheet.standard_accepted_count || 0,
      declined: props.worksheet.standard_declined_count || 0,
      total: standardTotal
    },
    mtm: {
      pending: props.worksheet.mtm_pending_count || 0,
      offered: props.worksheet.mtm_offered_count || 0,
      manually_accepted: props.worksheet.mtm_manually_accepted_count || 0,
      manually_declined: props.worksheet.mtm_manually_declined_count || 0,
      accepted: props.worksheet.mtm_accepted_count || 0,
      declined: props.worksheet.mtm_declined_count || 0,
      total: mtmTotal
    }
  }
})
</script>

<template>
  <UCard
    :class="{
      'bg-primary-50 dark:bg-primary-900/20': worksheet.is_fully_approved,
      'bg-gray-100 dark:bg-gray-800/50': isArchived
    }"
  >
    <!-- Header -->
    <template #header>
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <h3 class="font-semibold text-lg">{{ worksheet.name }}</h3>
            <UBadge
              v-if="isDraft"
              size="md"
              color="yellow"
              variant="subtle"
            >
              Draft
            </UBadge>
            <UBadge
              v-else-if="isFinal"
              size="md"
              color="primary"
              variant="subtle"
            >
              Final
            </UBadge>
            <UBadge
              v-else-if="isArchived"
              size="md"
              color="gray"
              variant="subtle"
            >
              Archived
            </UBadge>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ formatDate(worksheet.start_date) }} - {{ formatDate(worksheet.end_date) }}
          </p>
        </div>
        <div>
          <slot name="actions" />
        </div>
      </div>
    </template>

    <!-- Summary Content -->
    <div class="space-y-6">
      <!-- Rent Source Breakdown (Draft Only) -->
      <div v-if="isDraft" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Standard Renewals -->
        <div class="border rounded-lg p-4 dark:border-gray-700">
          <h4 class="font-semibold text-sm mb-3">{{ standardSourceBreakdown.title }}</h4>
          <div class="space-y-2 text-sm">
            <div
              v-for="source in standardSourceBreakdown.sources"
              :key="source.label"
              class="flex justify-between items-center"
            >
              <span class="text-gray-600 dark:text-gray-400">{{ source.label }}</span>
              <div class="text-right">
                <span class="font-medium">{{ source.count }}</span>
                <span class="text-xs text-gray-500 ml-2">
                  ({{ formatCurrency(source.increase) }}, {{ source.increasePercent }}%)
                </span>
              </div>
            </div>
            <div class="border-t pt-2 mt-2 flex justify-between font-semibold dark:border-gray-700">
              <span>Total:</span>
              <div class="text-right">
                <div>{{ formatCurrency(standardSourceBreakdown.totalOffered) }}</div>
                <div class="text-xs text-green-600 dark:text-green-400">
                  +{{ formatCurrency(standardSourceBreakdown.totalIncrease) }}
                  ({{ standardSourceBreakdown.avgIncrease }}%)
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- MTM Renewals -->
        <div class="border rounded-lg p-4 dark:border-gray-700">
          <h4 class="font-semibold text-sm mb-3">{{ mtmSourceBreakdown.title }}</h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">MTM Fee Applied</span>
              <span class="font-medium">{{ formatCurrency(worksheet.mtm_fee || 0) }}</span>
            </div>
            <div class="border-t pt-2 mt-2 flex justify-between font-semibold dark:border-gray-700">
              <span>Total:</span>
              <div class="text-right">
                <div>{{ formatCurrency(mtmSourceBreakdown.totalOffered) }}</div>
                <div class="text-xs text-green-600 dark:text-green-400">
                  +{{ formatCurrency(mtmSourceBreakdown.totalIncrease) }}
                  ({{ mtmSourceBreakdown.avgIncrease }}%)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Status Breakdown -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Standard Status -->
        <div class="border rounded-lg p-4 dark:border-gray-700">
          <h4 class="font-semibold text-sm mb-3">Standard Status ({{ statusBreakdown.standard.total }})</h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Pending</span>
              <span class="font-medium">{{ statusBreakdown.standard.pending }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Offered</span>
              <span class="font-medium">{{ statusBreakdown.standard.offered }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-yellow-600 dark:text-yellow-400">Manually Accepted</span>
              <span class="font-medium">{{ statusBreakdown.standard.manually_accepted }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-green-600 dark:text-green-400">✓ Accepted (Yardi)</span>
              <span class="font-medium">{{ statusBreakdown.standard.accepted }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-red-600 dark:text-red-400">Declined</span>
              <span class="font-medium">
                {{ statusBreakdown.standard.manually_declined + statusBreakdown.standard.declined }}
              </span>
            </div>
          </div>
        </div>

        <!-- MTM Status -->
        <div class="border rounded-lg p-4 dark:border-gray-700">
          <h4 class="font-semibold text-sm mb-3">MTM Status ({{ statusBreakdown.mtm.total }})</h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Pending</span>
              <span class="font-medium">{{ statusBreakdown.mtm.pending }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Offered</span>
              <span class="font-medium">{{ statusBreakdown.mtm.offered }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-yellow-600 dark:text-yellow-400">Manually Accepted</span>
              <span class="font-medium">{{ statusBreakdown.mtm.manually_accepted }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-green-600 dark:text-green-400">✓ Accepted (Yardi)</span>
              <span class="font-medium">{{ statusBreakdown.mtm.accepted }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-red-600 dark:text-red-400">Declined</span>
              <span class="font-medium">
                {{ statusBreakdown.mtm.manually_declined + statusBreakdown.mtm.declined }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
