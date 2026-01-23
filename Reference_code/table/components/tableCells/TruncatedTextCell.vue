<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: String,
    default: '',
  },
  maxLength: {
    type: Number,
    default: 50,
  },
})

const truncatedText = computed(() => {
  if (!props.value) return ''
  if (props.value.length <= props.maxLength) return props.value
  return props.value.substring(0, props.maxLength) + '...'
})
</script>

<template>
  <UTooltip v-if="value && value.length > maxLength" :text="value">
    <span>{{ truncatedText }}</span>
  </UTooltip>
  <span v-else>{{ value }}</span>
</template>
