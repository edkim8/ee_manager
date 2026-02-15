<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  title?: string
  description?: string
  width?: string
  seamless?: boolean
  noPadding?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const close = () => {
  emit('update:modelValue', false)
}

const handleOverlayClick = (e: MouseEvent) => {
  // Close only if clicking the overlay itself, not the modal content
  if (e.target === e.currentTarget) {
    close()
  }
}

// Prevent body scroll when modal is open
watch(() => props.modelValue, (isOpen) => {
  if (import.meta.client) {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }
})
</script>

<template>
  <Transition name="modal">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
      @click="handleOverlayClick"
    >
      <div
        v-if="!seamless"
        :class="[
          'bg-white dark:bg-gray-900 rounded-3xl shadow-2xl',
          'max-h-[90vh] overflow-hidden flex flex-col',
          width || 'w-full max-w-4xl'
        ]"
        @click.stop
      >
        <!-- Header -->
        <div v-if="title" class="px-8 py-6 border-b border-gray-100 dark:border-gray-800">
          <div class="flex items-center justify-between mb-1">
            <h2 class="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{{ title }}</h2>
            <button
              type="button"
              class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              @click="close"
            >
              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p v-if="description" class="text-xs text-gray-500 font-medium">{{ description }}</p>
        </div>

        <!-- Content -->
        <div 
          :class="[
            'overflow-y-auto flex-1',
            noPadding ? 'p-0' : 'p-8'
          ]"
        >
          <slot />
        </div>

        <!-- Footer -->
        <div v-if="$slots.footer" class="px-8 py-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <slot name="footer" />
        </div>
      </div>

      <!-- Seamless content (no card wrapper) -->
      <div v-else class="relative w-full h-full flex items-center justify-center" @click.stop>
         <slot />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .bg-white,
.modal-enter-active .dark\:bg-gray-900,
.modal-leave-active .bg-white,
.modal-leave-active .dark\:bg-gray-900 {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .bg-white,
.modal-enter-from .dark\:bg-gray-900,
.modal-leave-to .bg-white,
.modal-leave-to .dark\:bg-gray-900 {
  transform: scale(0.95);
  opacity: 0;
}
</style>
