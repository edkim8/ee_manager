<script setup lang="ts">
import { computed } from 'vue'

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
  <UModal v-model="isOpen" fullscreen>
    <div class="h-full w-full bg-black/95 relative flex items-center justify-center p-4">
      <!-- Close Button -->
      <UButton
        color="white"
        variant="ghost"
        icon="i-heroicons-x-mark"
        size="xl"
        class="absolute top-4 right-4 z-50 rounded-full hover:bg-white/10"
        @click="isOpen = false"
      />

      <!-- Image -->
      <div class="max-w-7xl max-h-full w-full h-full flex items-center justify-center overflow-auto p-4 md:p-12">
        <NuxtImg
          v-if="src"
          :src="src"
          :alt="alt || 'Enlarged view'"
          class="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
          placeholder
        />
        <div v-else class="text-white flex flex-col items-center gap-4">
          <UIcon name="i-heroicons-photo" class="w-16 h-16 opacity-50" />
          <p class="text-xl font-bold opacity-50 uppercase tracking-widest">Image Missing</p>
        </div>
      </div>

      <!-- Backdrop Click to Close (optional overlay) -->
      <div 
        class="absolute inset-0 z-0" 
        @click="isOpen = false"
      />
    </div>
  </UModal>
</template>
