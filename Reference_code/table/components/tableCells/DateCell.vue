<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: String,
    default: null,
  },
})

const formattedDate = computed(() => {
  if (!props.value) return ''
  const [year, month, day] = props.value.split('-')
  if (!year || !month || !day) return 'Invalid Date'
  return `${month}/${day}/${year.slice(-2)}`
})
</script>

<template>
  <div>
    {{ formattedDate }}
  </div>
</template>
