<script setup lang="ts">
/**
 * AlertCell - Status indicator with tooltip for alerts/warnings
 * Shows warning icon if alerts exist, checkmark if clear.
 */
import { computed, type PropType } from 'vue'

const props = withDefaults(defineProps<{
  /** Alert messages (string or array of strings) */
  alerts: string | string[] | null | undefined
  /** Show success checkmark when no alerts */
  showSuccess?: boolean
  /** Icon size class */
  iconSize?: string
}>(), {
  showSuccess: true,
  iconSize: 'text-base'
})

const hasAlerts = computed(() => {
  if (!props.alerts) return false
  return Array.isArray(props.alerts) ? props.alerts.length > 0 : !!props.alerts
})

const messages = computed(() => {
  if (!props.alerts) return []
  return Array.isArray(props.alerts) ? props.alerts : [props.alerts]
})

const tooltipText = computed(() => messages.value.join('\n'))
</script>

<template>
  <div class="flex items-center justify-center">
    <UTooltip v-if="hasAlerts" :text="tooltipText">
      <UIcon
        name="i-heroicons-exclamation-triangle-20-solid"
        :class="['text-red-500', iconSize]"
      />
    </UTooltip>
    <UTooltip v-else-if="showSuccess" text="All checks passed">
      <UIcon
        name="i-heroicons-check-circle-20-solid"
        :class="['text-green-500', iconSize]"
      />
    </UTooltip>
  </div>
</template>
