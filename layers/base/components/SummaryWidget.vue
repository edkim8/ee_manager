<script setup lang="ts">
defineProps<{
  title: string
  icon?: string
  iconColor?: string
  loading?: boolean
}>()
</script>

<template>
  <div class="group relative flex flex-col h-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-800/50 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-white/10 dark:border-gray-800/30">
      <div class="flex items-center gap-3">
        <div v-if="icon" :class="['p-2 rounded-lg bg-opacity-10', iconColor || 'bg-primary-500 text-primary-500']">
          <UIcon :name="icon" class="w-5 h-5" />
        </div>
        <h3 class="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-xs">
          {{ title }}
        </h3>
      </div>
      
      <div class="flex items-center gap-2">
        <slot name="header-actions" />
        <UButton
          icon="i-heroicons-arrows-pointing-out"
          color="white"
          variant="ghost"
          size="xs"
          class="drag-handle cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Move widget"
        />
      </div>
    </div>

    <!-- Content -->
    <div class="flex-grow p-4 relative min-h-[120px]">
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-white/20 dark:bg-black/10 backdrop-blur-sm z-20 rounded-b-2xl">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-primary-500" />
      </div>
      <slot />
    </div>

    <!-- Footer -->
    <div v-if="$slots.footer" class="p-3 bg-white/20 dark:bg-black/20 rounded-b-2xl border-t border-white/10 dark:border-gray-800/30">
      <slot name="footer" />
    </div>

    <!-- Selection Bloom -->
    <div class="absolute -inset-px rounded-2xl border-2 border-primary-500/0 group-hover:border-primary-500/30 pointer-events-none transition-colors duration-500" />
  </div>
</template>

<style scoped>
.drag-handle {
  touch-action: none;
}
</style>
