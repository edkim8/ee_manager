<script setup lang="ts">
/**
 * CurrencyCell - Formatted currency display
 * Uses Intl.NumberFormat for locale-aware currency formatting.
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  /** Numeric value to format */
  value: number | null | undefined
  /** Currency code (default: USD) */
  currency?: string
  /** Show error styling for negative/problem values */
  isError?: boolean
}>(), {
  currency: 'USD',
  isError: false
})

const formatted = computed(() => {
  const amount = props.value ?? 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: props.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
})

const textClass = computed(() =>
  props.isError
    ? 'text-red-500 dark:text-red-400 font-bold'
    : 'text-gray-900 dark:text-white'
)
</script>

<template>
  <span :class="textClass">{{ formatted }}</span>
</template>
