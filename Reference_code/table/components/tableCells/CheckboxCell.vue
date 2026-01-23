<script setup lang="ts">
defineProps({
  value: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <div class="flex items-center justify-center">
    <input
      type="checkbox"
      :checked="value"
      disabled
      class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
    />
  </div>
</template>
