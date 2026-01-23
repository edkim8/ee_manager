<script setup lang="ts">
/**
 * OptionsCell - Action dropdown menu for row operations
 * Renders a "..." button that opens a dropdown with actions.
 */
import { computed } from 'vue'

const props = defineProps<{
  /** The row data object */
  row: Record<string, any>
  /** Function that returns dropdown items for this row */
  getItems: (row: Record<string, any>) => any[][]
}>()

const items = computed(() => {
  if (typeof props.getItems === 'function') {
    return props.getItems(props.row)
  }
  return []
})
</script>

<template>
  <div class="text-center" @click.stop>
    <UDropdownMenu
      v-if="items.length > 0"
      :items="items"
      :popper="{ placement: 'bottom-end' }"
    >
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-ellipsis-horizontal-20-solid"
        :padded="false"
        aria-label="More options"
      />
    </UDropdownMenu>
  </div>
</template>
