<script setup lang="ts">
import { ref, computed } from 'vue'

interface Tab {
  value: string
  label: string
  icon?: string
}

const props = defineProps<{
  modelValue: string
  items: Tab[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const activeTab = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Tab Headers -->
    <div class="border-b border-gray-200 dark:border-gray-700">
      <div class="flex gap-1">
        <button
          v-for="tab in items"
          :key="tab.value"
          type="button"
          :class="[
            'px-4 py-3 text-sm font-medium transition-colors relative',
            activeTab === tab.value
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          ]"
          @click="activeTab = tab.value"
        >
          <div class="flex items-center gap-2">
            <svg v-if="tab.icon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <!-- Icon would go here, for now just text -->
            </svg>
            <span>{{ tab.label }}</span>
          </div>

          <!-- Active indicator -->
          <div
            v-if="activeTab === tab.value"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
          />
        </button>
      </div>
    </div>

    <!-- Tab Content -->
    <div>
      <slot :name="activeTab" />
    </div>
  </div>
</template>
