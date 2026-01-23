<script setup lang="ts">
/**
 * CheckboxCell - Read-only checkbox display
 * Shows checked/unchecked state for boolean values.
 */
withDefaults(defineProps<{
  /** Boolean value to display */
  value: boolean
}>(), {
  value: false
})
</script>

<template>
  <div class="flex items-center justify-center">
    <input
      type="checkbox"
      :checked="value"
      disabled
      class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-not-allowed"
    />
  </div>
</template>
