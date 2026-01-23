<script setup lang="ts">
/**
 * DateCell - Formatted date display
 * Converts ISO date strings to readable format.
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  /** ISO date string (YYYY-MM-DD) or Date object */
  value: string | Date | null | undefined
  /** Output format: 'short' (MM/DD/YY) | 'medium' | 'long' */
  format?: 'short' | 'medium' | 'long'
}>(), {
  format: 'short'
})

const formatted = computed(() => {
  if (!props.value) return ''

  try {
    const date = typeof props.value === 'string' ? new Date(props.value) : props.value

    if (isNaN(date.getTime())) return 'Invalid Date'

    const options: Intl.DateTimeFormatOptions =
      props.format === 'long'
        ? { year: 'numeric', month: 'long', day: 'numeric' }
        : props.format === 'medium'
          ? { year: 'numeric', month: 'short', day: 'numeric' }
          : { year: '2-digit', month: '2-digit', day: '2-digit' }

    return new Intl.DateTimeFormat('en-US', options).format(date)
  } catch {
    return 'Invalid Date'
  }
})
</script>

<template>
  <span>{{ formatted }}</span>
</template>
