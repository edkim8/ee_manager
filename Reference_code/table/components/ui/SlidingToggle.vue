<script setup lang="ts">
import { computed } from 'vue'
/**
 * A premium sliding toggle component.
 * Features a smooth animated background transition between options.
 */

interface Option {
  label: string
  value: any
}

const props = withDefaults(defineProps<{
  modelValue: any
  options: Option[]
  itemWidth?: number
}>(), {
  itemWidth: 100
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()

const selectedIndex = computed(() => {
  return props.options.findIndex(opt => opt.value === props.modelValue)
})

const handleSelect = (value: any) => {
  emit('update:modelValue', value)
}
</script>

<template>
  <div 
    class="relative bg-gray-100 dark:bg-gray-800 p-1 rounded-full flex items-center shadow-inner border border-gray-200 dark:border-gray-700 h-10 overflow-hidden"
    :style="{ width: `${(options.length * itemWidth) + 8}px` }"
  >
    <!-- Sliding Background -->
    <div 
      v-if="selectedIndex !== -1"
      class="absolute h-8 bg-white dark:bg-gray-700 rounded-full shadow transition-all duration-300 ease-out"
      :style="{
        width: `${itemWidth}px`,
        transform: `translateX(${selectedIndex * itemWidth}px)`
      }"
    ></div>
    
    <!-- Option Buttons -->
    <button 
      v-for="opt in options" 
      :key="String(opt.value)"
      type="button"
      @click="handleSelect(opt.value)"
      class="relative z-10 h-8 text-xs font-bold rounded-full transition-colors duration-200 flex items-center justify-center"
      :style="{ width: `${itemWidth}px` }"
      :class="modelValue === opt.value 
        ? 'text-primary-600 dark:text-primary-400' 
        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
/* No extra styles needed beyond Tailwind */
</style>
