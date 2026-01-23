<script setup lang="ts">
/**
 * BadgeCell - UBadge wrapper for status/tag display
 * Provides consistent badge styling across tables.
 */
withDefaults(defineProps<{
  /** Badge text content */
  text: string
  /** Badge color theme */
  color?: string
  /** Badge variant style */
  variant?: 'solid' | 'outline' | 'soft' | 'subtle'
}>(), {
  color: 'neutral',
  variant: 'subtle'
})
</script>

<template>
  <UBadge :color="color" :variant="variant">{{ text }}</UBadge>
</template>
