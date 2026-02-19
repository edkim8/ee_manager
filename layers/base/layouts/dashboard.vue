<script setup lang="ts">
import { useLayoutWidth } from '../composables/useLayoutWidth'

const { isWide } = useLayoutWidth()
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <AppNavigation />

    <main>
      <UContainer :class="isWide ? 'max-w-none px-8' : ''" class="py-6">
        <slot />
      </UContainer>
    </main>

    <footer class="border-t border-gray-200 dark:border-gray-800 py-4 mt-auto">
      <UContainer>
        <p class="text-center text-sm text-gray-500 dark:text-gray-400">
          EE Manager
        </p>
      </UContainer>
    </footer>

    <!-- Debug: Screen Size Indicator -->
    <ScreenDebug />
  </div>
</template>
