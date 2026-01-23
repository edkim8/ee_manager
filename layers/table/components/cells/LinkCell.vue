<script setup lang="ts">
/**
 * LinkCell - RouterLink wrapper for table cells
 * Renders a styled NuxtLink with configurable color themes.
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  /** Display text for the link */
  value: string | number
  /** Route path or URL */
  to: string
  /** Color theme: 'primary' | 'blue' | 'gray' */
  color?: 'primary' | 'blue' | 'gray'
}>(), {
  color: 'primary'
})

const colorClasses: Record<string, string> = {
  primary: 'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300',
  blue: 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300',
  gray: 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
}

const linkClass = computed(() => [
  'cursor-pointer underline-offset-2 hover:underline font-medium transition-colors',
  colorClasses[props.color] || colorClasses.primary
])
</script>

<template>
  <NuxtLink :to="to" :class="linkClass" @click.stop>
    {{ value }}
  </NuxtLink>
</template>
