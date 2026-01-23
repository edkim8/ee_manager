<script setup lang="ts">
/**
 * PercentCell - Formatted percentage display
 * Converts decimal (0.1) to percentage (10%).
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  /** Decimal value (0.1 = 10%) */
  value: number
  /** Number of decimal places */
  decimals?: number
}>(), {
  value: 0,
  decimals: 1
})

const formatted = computed(() => {
  const percentValue = props.value * 100
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: props.decimals,
    maximumFractionDigits: props.decimals
  }).format(percentValue)
})

const textClass = computed(() =>
  props.value < 0
    ? 'text-red-500 dark:text-red-400 font-semibold'
    : 'text-gray-900 dark:text-white'
)
</script>

<template>
  <span :class="textClass">{{ formatted }}%</span>
</template>
