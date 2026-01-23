<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  row: Record<string, any>
  getRowItems: (row: Record<string, any>) => any[][]
}>()

const actionItems = computed(() => {
  if (typeof props.getRowItems === 'function') {
    return props.getRowItems(props.row)
  }
  return []
})
</script>

<template>
  <div class="text-center" @click.stop>
    <UDropdownMenu
      v-if="actionItems.length > 0"
      :items="actionItems"
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
