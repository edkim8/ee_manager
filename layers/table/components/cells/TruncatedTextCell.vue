<script setup lang="ts">
/**
 * TruncatedTextCell - Text with overflow ellipsis and tooltip
 * Shows full text in tooltip when truncated.
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  /** Text content to display */
  value: string
  /** Maximum character length before truncation */
  maxLength?: number
}>(), {
  value: '',
  maxLength: 50
})

const truncated = computed(() => {
  if (!props.value) return ''
  if (props.value.length <= props.maxLength) return props.value
  return props.value.substring(0, props.maxLength) + '...'
})

const isTruncated = computed(() =>
  props.value && props.value.length > props.maxLength
)
</script>

<template>
  <UTooltip v-if="isTruncated" :text="value">
    <span>{{ truncated }}</span>
  </UTooltip>
  <span v-else>{{ value }}</span>
</template>
