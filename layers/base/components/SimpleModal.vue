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
      class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/40 backdrop-blur-sm"
      @click="handleOverlayClick"
    >
      <div
        v-if="!seamless"
        :class="[
          'bg-white dark:bg-gray-900 rounded-t-[2rem] sm:rounded-3xl shadow-2xl',
          'max-h-[92vh] sm:max-h-[90vh] w-full overflow-hidden flex flex-col animate-slide-up sm:animate-none',
          width || 'sm:max-w-4xl'
        ]"
        @click.stop
      >
        <!-- Mobile Handle -->
        <div class="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div class="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>

        <!-- Header -->
        <div v-if="title" class="px-6 sm:px-8 py-4 sm:py-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div class="flex items-center justify-between mb-1">
            <h2 class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">{{ title }}</h2>
            <button
              type="button"
              class="p-2 -mr-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              @click="close"
              aria-label="Close modal"
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
            noPadding ? 'p-0' : 'p-6 sm:p-8'
          ]"
        >
          <slot />
        </div>

        <!-- Footer -->
        <div v-if="$slots.footer" class="px-6 sm:px-8 py-4 sm:py-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 shrink-0">
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
  transition: opacity 0.3s ease;
}

/* Desktop scale animation */
@media (min-width: 640px) {
  .modal-enter-active .bg-white,
  .modal-enter-active .dark\:bg-gray-900,
  .modal-leave-active .bg-white,
  .modal-leave-active .dark\:bg-gray-900 {
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
  }
}

/* Mobile slide animation */
@media (max-width: 639px) {
  .modal-enter-active .bg-white,
  .modal-enter-active .dark\:bg-gray-900,
  .modal-leave-active .bg-white,
  .modal-leave-active .dark\:bg-gray-900 {
    transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* State changes for animations */
@media (min-width: 640px) {
  .modal-enter-from .bg-white,
  .modal-enter-from .dark\:bg-gray-900,
  .modal-leave-to .bg-white,
  .modal-leave-to .dark\:bg-gray-900 {
    transform: scale(0.95);
    opacity: 0;
  }
}

@media (max-width: 639px) {
  .modal-enter-from .bg-white,
  .modal-enter-from .dark\:bg-gray-900,
  .modal-leave-to .bg-white,
  .modal-leave-to .dark\:bg-gray-900 {
    transform: translateY(100%);
  }
}
</style>
