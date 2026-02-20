<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

const screenWidth = ref(0)
const screenHeight = ref(0)
const isExpanded = ref(true)

const updateSize = () => {
  screenWidth.value = window.innerWidth
  screenHeight.value = window.innerHeight
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
  localStorage.setItem('ee-debug-expanded', String(isExpanded.value))
}

onMounted(() => {
  updateSize()
  window.addEventListener('resize', updateSize)
  
  // Load preference from localStorage
  const saved = localStorage.getItem('ee-debug-expanded')
  if (saved !== null) {
    isExpanded.value = saved === 'true'
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateSize)
})

const breakpoint = computed(() => {
  const w = screenWidth.value
  if (w < 640) return 'xs (< 640px)'
  if (w < 768) return 'sm (640-768px)'
  if (w < 1024) return 'md (768-1024px)'
  if (w < 1280) return 'lg (1024-1280px)'
  if (w < 1536) return 'xl (1280-1536px)'
  return '2xl (≥ 1536px)'
})

const expectedColumns = computed(() => {
  const w = screenWidth.value
  const cols = ['P1 (always)']
  if (w >= 768) cols.push('P2 (md+)')
  if (w >= 1024) cols.push('P3 (lg+)')
  if (w >= 1280) cols.push('P4 (xl+)')
  if (w >= 1536) cols.push('P5 (2xl+)')
  return cols
})
</script>

<template>
  <div 
    class="fixed bottom-4 right-4 z-50 transition-all duration-300 pointer-events-auto"
    :class="[
      isExpanded 
        ? 'bg-gray-900/95 text-white p-4 rounded-lg shadow-2xl border-2 border-blue-500 max-w-xs' 
        : 'bg-transparent'
    ]"
  >
    <!-- Toggle Button (Floating when collapsed, header when expanded) -->
    <div 
      class="flex items-center justify-between gap-4"
      :class="{ 'mb-2': isExpanded }"
    >
      <div v-if="isExpanded" class="font-bold text-sm text-blue-400">🔍 Screen Debug</div>
      
      <UButton
        :icon="isExpanded ? 'i-heroicons-chevron-down' : 'i-heroicons-adjustments-horizontal'"
        color="primary"
        variant="solid"
        size="xs"
        class="shadow-xl"
        :class="{ 'p-2 rounded-full h-10 w-10': !isExpanded }"
        @click="toggleExpanded"
      />
    </div>

    <!-- Content Panel -->
    <div v-if="isExpanded" class="space-y-1 font-mono text-xs">
      <div class="flex justify-between gap-4">
        <span class="text-gray-400">Width:</span>
        <span class="font-bold text-green-400">{{ screenWidth }}px</span>
      </div>

      <div class="flex justify-between gap-4">
        <span class="text-gray-400">Height:</span>
        <span class="font-bold text-green-400">{{ screenHeight }}px</span>
      </div>

      <div class="border-t border-gray-700 my-2"></div>

      <div class="flex justify-between gap-4">
        <span class="text-gray-400">Breakpoint:</span>
        <span class="font-bold text-yellow-400">{{ breakpoint }}</span>
      </div>

      <div class="border-t border-gray-700 my-2"></div>

      <div>
        <div class="text-gray-400 mb-1">Expected Columns:</div>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="col in expectedColumns"
            :key="col"
            class="bg-blue-600 px-2 py-0.5 rounded text-[10px]"
          >
            {{ col }}
          </span>
        </div>
      </div>

      <div class="border-t border-gray-700 my-2"></div>

      <div class="text-[10px] text-gray-500">
        Tailwind Breakpoints:<br>
        md: 768px | lg: 1024px<br>
        xl: 1280px | 2xl: 1536px
      </div>

      <div class="border-t border-gray-700 my-2"></div>

      <div class="text-[10px]">
        <div class="text-gray-400 mb-1">Class Test:</div>
        <div class="space-y-0.5">
          <div class="max-md:hidden bg-red-500 px-1 rounded">P2 (max-md:hidden)</div>
          <div class="max-lg:hidden bg-orange-500 px-1 rounded">P3 (max-lg:hidden)</div>
          <div class="max-xl:hidden bg-yellow-500 px-1 rounded">P4 (max-xl:hidden)</div>
          <div class="max-2xl:hidden bg-green-500 px-1 rounded">P5 (max-2xl:hidden)</div>
        </div>
      </div>
    </div>
  </div>
</template>
