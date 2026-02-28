<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLayoutWidth } from '../composables/useLayoutWidth'
import { useAppMode } from '../composables/useAppMode'

const { isWide } = useLayoutWidth()
const { setMode } = useAppMode()

// Show Tour Mode toggle on any touch device with a tablet-sized viewport.
// Uses pointer media query + maxTouchPoints so it works in Chrome Responsive
// simulation (where the UA string is not changed) as well as on real iPads.
const showTourToggle = ref(false)
onMounted(() => {
  const isTouch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
  showTourToggle.value = isTouch && window.innerWidth >= 768
})

const switchToTour = () => {
  setMode('tour')
  window.location.href = '/tour/dashboard'
}
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

    <!-- Phone mode toggle (UA-based, for real phones) -->
    <ClientOnly>
      <ModeToggle />
    </ClientOnly>

    <!-- Tablet tour toggle: touch device + tablet viewport, shown next to context helper -->
    <div v-if="showTourToggle" class="fixed bottom-4 right-20 z-[60] pointer-events-auto">
      <UButton
        icon="i-heroicons-presentation-chart-bar"
        color="amber"
        variant="solid"
        size="xl"
        class="rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all w-12 h-12 flex items-center justify-center border-2 border-amber-600 dark:border-amber-400"
        title="Switch to Tour Mode"
        @click="switchToTour"
      />
    </div>

    <!-- Debug: Screen Size Indicator -->
    <ScreenDebug />
  </div>
</template>
