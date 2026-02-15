<script setup lang="ts">
import { useImageActions } from '../composables/useImageActions'

const props = defineProps<{
  src: string
  alt?: string
  aspectRatio?: string
}>()

const { openImageModal, openImageInNewTab } = useImageActions()

const handleOpenLarge = () => {
  openImageModal(props.src, props.alt)
}

const handleOpenOriginal = () => {
  openImageInNewTab(props.src)
}
</script>

<template>
  <div 
    class="relative w-full rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-lg group cursor-pointer"
    :class="aspectRatio || 'aspect-video'"
    @click="handleOpenLarge"
  >
    <!-- Optimized Image -->
    <NuxtImg 
      :src="src" 
      :alt="alt || 'Gallery image'"
      format="webp"
      quality="80"
      loading="lazy"
      sizes="sm:100vw md:50vw lg:1200px"
      class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
      placeholder
    />
    
    <!-- Hover Overlay -->
    <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    
    <!-- Action Buttons -->
    <div class="absolute bottom-4 left-4 right-4 flex justify-between items-center transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
      <!-- Open Large (Bottom Left) -->
      <UButton
        icon="i-heroicons-magnifying-glass-plus"
        label="Open Large"
        color="white"
        variant="solid"
        size="xs"
        class="rounded-full shadow-xl font-bold bg-white/90 backdrop-blur-md text-gray-900 border-none hover:bg-white"
        @click.stop="handleOpenLarge"
      />
      
      <!-- Open Original (Bottom Right) -->
      <UButton
        icon="i-heroicons-arrow-top-right-on-square"
        label="Open Original"
        color="white"
        variant="solid"
        size="xs"
        class="rounded-full shadow-xl font-bold bg-white/90 backdrop-blur-md text-gray-900 border-none hover:bg-white"
        @click.stop="handleOpenOriginal"
      />
    </div>
  </div>
</template>
