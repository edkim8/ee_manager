<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSupabaseClient } from '#imports'

interface Props {
  selectedItems: any[]
  onClose: (saved: boolean) => void
}

const props = defineProps<Props>()
const supabase = useSupabaseClient()

// Status options
const statusActions = [
  {
    value: 'mark_pending',
    label: 'Mark as Pending',
    description: 'Reset status to pending (clear manual status)',
    icon: 'i-heroicons-clock',
    color: 'neutral'
  },
  {
    value: 'manual_accept',
    label: 'Manually Accept',
    description: 'Mark as manually accepted (resident verbally confirmed)',
    icon: 'i-heroicons-check-circle',
    color: 'success'
  },
  {
    value: 'manual_decline',
    label: 'Manually Decline',
    description: 'Mark as manually declined (resident gave notice)',
    icon: 'i-heroicons-x-circle',
    color: 'error'
  },
  {
    value: 'reset',
    label: 'Reset All',
    description: 'Clear all manual statuses (return to system-calculated)',
    icon: 'i-heroicons-arrow-path',
    color: 'warning'
  }
] as const

const selectedAction = ref<typeof statusActions[number]['value'] | null>(null)
const isProcessing = ref(false)
const errorMessage = ref<string | null>(null)

// Computed properties
const selectedCount = computed(() => props.selectedItems?.length || 0)

const canProceed = computed(() => {
  return selectedAction.value !== null && selectedCount.value > 0 && !isProcessing.value
})

const confirmationMessage = computed(() => {
  if (!selectedAction.value) return ''

  const action = statusActions.find(a => a.value === selectedAction.value)
  const itemText = selectedCount.value === 1 ? 'renewal' : 'renewals'

  return `${action?.label} for ${selectedCount.value} ${itemText}?`
})

// Handle status update
async function handleUpdateStatus() {
  if (!selectedAction.value || selectedCount.value === 0) return

  isProcessing.value = true
  errorMessage.value = null

  try {
    const itemIds = props.selectedItems.map(item => item.id)
    const today = new Date().toISOString().split('T')[0]

    let updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Determine what to update based on action
    switch (selectedAction.value) {
      case 'mark_pending':
        updateData.manual_status = null
        updateData.status = 'pending'
        updateData.manual_status_date = null
        break

      case 'manual_accept':
        updateData.manual_status = 'accepted'
        updateData.status = 'manually_accepted'
        updateData.manual_status_date = today
        break

      case 'manual_decline':
        updateData.manual_status = 'declined'
        updateData.status = 'manually_declined'
        updateData.manual_status_date = today
        break

      case 'reset':
        updateData.manual_status = null
        updateData.status = 'offered'  // Reset to default offered state
        updateData.manual_status_date = null
        updateData.yardi_confirmed = false
        break
    }

    // Update all selected items
    const { error } = await supabase
      .from('renewal_worksheet_items')
      .update(updateData)
      .in('id', itemIds)

    if (error) {
      console.error('[Update Status] Database error:', error)
      errorMessage.value = `Failed to update statuses: ${error.message}`
      return
    }


    // Close modal with success
    props.onClose(true)

  } catch (error: any) {
    console.error('[Update Status] Exception:', error)
    errorMessage.value = `Error: ${error.message}`
  } finally {
    isProcessing.value = false
  }
}

function handleCancel() {
  props.onClose(false)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header Info -->
    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-500 mt-0.5" />
        <div class="text-sm text-blue-700 dark:text-blue-300">
          <p class="font-medium mb-1">Batch Status Update</p>
          <p class="text-xs">
            Update renewal statuses before Yardi confirmation. Manual statuses allow you to track early signals
            (verbal commitments, notice given) before official Yardi sync confirms the final outcome.
          </p>
        </div>
      </div>
    </div>

    <!-- Selection Info -->
    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">Selected Items</div>
          <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ selectedCount }}</div>
        </div>
        <UIcon name="i-heroicons-clipboard-document-list" class="w-8 h-8 text-gray-400" />
      </div>
    </div>

    <!-- Action Selection -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Select Action
      </label>
      <div class="grid grid-cols-1 gap-3">
        <button
          v-for="action in statusActions"
          :key="action.value"
          type="button"
          class="flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left"
          :class="selectedAction === action.value
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
          @click="selectedAction = action.value"
        >
          <UIcon
            :name="action.icon"
            class="w-6 h-6 mt-0.5 flex-shrink-0"
            :class="selectedAction === action.value
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-400'"
          />
          <div class="flex-1">
            <div class="font-medium text-gray-900 dark:text-white">
              {{ action.label }}
            </div>
            <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {{ action.description }}
            </div>
          </div>
          <div v-if="selectedAction === action.value" class="flex-shrink-0">
            <UIcon name="i-heroicons-check-circle-solid" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
        </button>
      </div>
    </div>

    <!-- Confirmation Message -->
    <div v-if="selectedAction" class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
      <div class="flex items-start gap-2">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
        <div class="text-sm text-yellow-800 dark:text-yellow-200">
          <p class="font-medium">Confirm Action</p>
          <p class="text-xs mt-1">{{ confirmationMessage }}</p>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div class="flex items-start gap-2">
        <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
        <div class="text-sm text-red-800 dark:text-red-200">
          <p class="font-medium">Error</p>
          <p class="text-xs mt-1">{{ errorMessage }}</p>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
      <UButton
        variant="ghost"
        label="Cancel"
        :disabled="isProcessing"
        @click="handleCancel"
      />
      <UButton
        :label="isProcessing ? 'Processing...' : 'Update Status'"
        :disabled="!canProceed"
        :loading="isProcessing"
        @click="handleUpdateStatus"
      />
    </div>
  </div>
</template>
