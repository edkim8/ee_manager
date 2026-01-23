<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: [String, Number],
    default: '',
  },
  to: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    default: 'primary',
  },
})

const linkClass = computed(() => {
  const colorClasses = {
    primary: 'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300',
    blue: 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300',
    gray: 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
  }
  
  return [
    'cursor-pointer underline-offset-2 hover:underline font-medium transition-colors',
    colorClasses[props.color as keyof typeof colorClasses] || colorClasses.primary
  ]
})
</script>

<template>
  <NuxtLink :to="to" :class="linkClass" @click.stop>
    {{ value }}
  </NuxtLink>
</template>
