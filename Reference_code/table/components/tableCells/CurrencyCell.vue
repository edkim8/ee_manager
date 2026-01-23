<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: Number as () => number | null | undefined,
    default: null,
  },
  isError: {
    type: Boolean,
    default: false,
  },
})

const formattedAmount = computed(() => {
  const amount = props.value ?? 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
})

const amountClass = computed(() => {
  if (props.isError) {
    return 'text-red-500 dark:text-red-400 font-bold'
  }
  return 'text-gray-900 dark:text-white'
})
</script>

<template>
  <span :class="amountClass">
    {{ formattedAmount }}
  </span>
</template>
