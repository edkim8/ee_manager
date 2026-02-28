<script setup lang="ts">
import { computed } from 'vue'
import { useAppMode } from '../composables/useAppMode'

const { isWebMode, isTourMode, isAppMode, toggleMode, isMobileDevice, isTabletDevice } = useAppMode()

// Only show on mobile/tablet devices
const shouldShow = computed(() => isMobileDevice.value)

const icon = computed(() => {
  if (isTourMode.value || isAppMode.value) return 'i-heroicons-computer-desktop'
  // web mode — varies by device
  return isTabletDevice.value
    ? 'i-heroicons-presentation-chart-bar'
    : 'i-heroicons-device-phone-mobile'
})

const label = computed(() => {
  if (isTourMode.value || isAppMode.value) return 'Web Mode'
  return isTabletDevice.value ? 'Tour Mode' : 'App Mode'
})
</script>

<template>
  <div v-if="shouldShow"
    class="fixed z-[60] pointer-events-auto transition-all duration-500 right-20"
    :class="[
      (isAppMode || isTourMode) ? 'top-4 safe-top-position' : 'top-4 safe-top-position sm:top-auto sm:bottom-4'
    ]"
  >
    <UButton
      :icon="icon"
      color="amber"
      variant="solid"
      size="xl"
      class="rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all w-12 h-12 flex items-center justify-center border-2 border-amber-600 dark:border-amber-400"
      :title="label"
      @click="toggleMode"
    />
  </div>
</template>

<style scoped>
.shadow-2xl {
  box-shadow: 0 25px 50px -12px rgba(245, 158, 11, 0.4);
}

@media (max-width: 639px) {
  .safe-top-position {
    top: calc(env(safe-area-inset-top, 0px) + 1rem);
  }
}
</style>
