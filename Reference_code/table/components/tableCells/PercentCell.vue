<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: Number,
    default: 0,
  },
  decimals: {
    type: Number,
    default: 1,
  },
})

const formattedPercent = computed(() => {
  // Convert decimal to percentage (0.1 -> 10%)
  const percentValue = props.value * 100
  
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: props.decimals,
    maximumFractionDigits: props.decimals,
  }).format(percentValue)
})

const percentClass = computed(() => {
  if (props.value < 0) {
    return 'text-red-500 dark:text-red-400 font-semibold'
  }
  return 'text-gray-900 dark:text-white'
})
</script>

<template>
  <div :class="percentClass">
    {{ formattedPercent }}%
  </div>
</template>
