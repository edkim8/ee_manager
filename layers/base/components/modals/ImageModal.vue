<script setup lang="ts">
import { computed } from 'vue'
import SimpleModal from '../SimpleModal.vue'

const props = defineProps<{
  src?: string
  alt?: string
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})
</script>

<template>
  <SimpleModal 
    v-model="isOpen" 
    :title="alt || 'Image View'"
    width="w-full max-w-[95vw] md:min-w-[800px] md:w-auto"
    no-padding
  >
    <div class="relative flex items-center justify-center bg-gray-50 dark:bg-gray-950 overflow-hidden min-h-[400px]">
      <!-- Optimized Image -->
      <div class="relative z-[105] flex items-center justify-center p-0 w-full">
        <NuxtImg
          v-if="src"
          :src="src"
          :alt="alt || 'Enlarged view'"
          format="webp"
          quality="100"
          loading="eager"
          class="w-full md:w-auto md:min-w-[800px] max-w-full max-h-[80vh] object-contain shadow-sm animate-in zoom-in duration-300"
          placeholder
        />
        <div v-else class="p-24 text-gray-400 flex flex-col items-center gap-4">
          <UIcon name="i-heroicons-photo" class="w-16 h-16 opacity-50" />
          <p class="text-xl font-bold opacity-50 uppercase tracking-widest">Image Missing</p>
        </div>
      </div>
    </div>
  </SimpleModal>
</template>
