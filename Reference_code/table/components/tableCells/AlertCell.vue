<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  alerts: {
    type: [Array, String] as PropType<string[] | string | null>,
    default: null,
  },
  showSuccess: {
    type: Boolean,
    default: true,
  },
  iconSize: {
    type: String,
    default: 'base',
  },
})

const hasAlerts = computed(() => {
  if (!props.alerts) return false
  return Array.isArray(props.alerts) ? props.alerts.length > 0 : !!props.alerts
})

const alertMessages = computed(() => {
  if (!props.alerts) return []
  return Array.isArray(props.alerts) ? props.alerts : [props.alerts]
})

const tooltipText = computed(() => {
  return alertMessages.value.join('\n')
})

const alertIconClasses = computed(() => {
  return ['text-red-500', `text-${props.iconSize}`]
})

const noAlertIconClasses = computed(() => {
  return ['text-green-500', `text-${props.iconSize}`]
})
</script>

<template>
  <div class="flex items-center justify-center">
    <UTooltip
      v-if="hasAlerts"
      :text="tooltipText"
      :popper="{ placement: 'top' }"
    >
      <UIcon
        name="i-heroicons-exclamation-triangle-20-solid"
        :class="alertIconClasses"
      />
    </UTooltip>
    <UTooltip v-else-if="showSuccess" text="All checks passed">
      <UIcon
        name="i-heroicons-check-circle-20-solid"
        :class="noAlertIconClasses"
      />
    </UTooltip>
  </div>
</template>
