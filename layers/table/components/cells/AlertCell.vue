<script setup lang="ts">
import { computed, type PropType } from 'vue'

const props = defineProps({
  alerts: {
    type: [Array, String] as PropType<string[] | string | null>,
    default: null,
  },
  infoAlerts: {
    type: [Array, String] as PropType<string[] | string | null>,
    default: null,
  },
  status: {
    type: String as PropType<'synced' | 'error' | 'info'>,
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

const hasCriticalAlerts = computed(() => {
  if (!props.alerts) return false
  return Array.isArray(props.alerts) ? props.alerts.length > 0 : !!props.alerts
})

const hasInfoAlerts = computed(() => {
  if (!props.infoAlerts) return false
  return Array.isArray(props.infoAlerts) ? props.infoAlerts.length > 0 : !!props.infoAlerts
})

const alertMessages = computed(() => {
  const critical = Array.isArray(props.alerts) ? props.alerts : (props.alerts ? [props.alerts] : [])
  const info = Array.isArray(props.infoAlerts) ? props.infoAlerts : (props.infoAlerts ? [props.infoAlerts] : [])
  return [...critical, ...info]
})

const tooltipText = computed(() => {
  return alertMessages.value.join('\n')
})

const displayStatus = computed(() => {
  if (props.status) return props.status
  if (hasCriticalAlerts.value) return 'error'
  if (hasInfoAlerts.value) return 'info'
  return 'synced'
})

const iconName = computed(() => {
  switch (displayStatus.value) {
    case 'error':
      return 'i-heroicons-exclamation-triangle-20-solid'
    case 'info':
      return 'i-heroicons-information-circle-20-solid'
    case 'synced':
    default:
      return 'i-heroicons-check-circle-20-solid'
  }
})

const iconClasses = computed(() => {
  const colorClass = displayStatus.value === 'error' ? 'text-red-500' :
                     displayStatus.value === 'info' ? 'text-blue-500' :
                     'text-green-500'
  return [colorClass, `text-${props.iconSize}`]
})
</script>

<template>
  <div class="flex items-center justify-center">
    <UTooltip
      v-if="displayStatus === 'error'"
      :text="tooltipText"
      :popper="{ placement: 'top' }"
    >
      <UIcon
        :name="iconName"
        :class="iconClasses"
      />
    </UTooltip>
    <UTooltip
      v-else-if="displayStatus === 'info'"
      :text="tooltipText"
      :popper="{ placement: 'top' }"
    >
      <UIcon
        :name="iconName"
        :class="iconClasses"
      />
    </UTooltip>
    <UTooltip v-else-if="showSuccess" text="Synced: Calculated rent matches Yardi">
      <UIcon
        :name="iconName"
        :class="iconClasses"
      />
    </UTooltip>
  </div>
</template>
