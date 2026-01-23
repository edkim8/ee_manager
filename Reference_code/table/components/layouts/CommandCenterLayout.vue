<template>
  <div class="h-screen w-full bg-gray-100 dark:bg-gray-900 overflow-hidden">
    <div class="grid grid-cols-2 grid-rows-2 h-full w-full gap-1 p-1">
      
      <!-- Quadrant 1: Top Left -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden relative">
        <slot name="quad1">
          <div class="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-600">
            Quadrant 1
          </div>
        </slot>
      </div>

      <!-- Quadrant 2: Top Right -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden relative">
        <slot name="quad2">
           <div class="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-600">
            Quadrant 2
          </div>
        </slot>
      </div>

      <!-- Quadrant 3: Bottom Left -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden relative">
        <slot name="quad3">
           <div class="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-600">
            Quadrant 3
          </div>
        </slot>
      </div>

      <!-- Quadrant 4: Bottom Right -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden relative">
        <slot name="quad4">
           <div class="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-600">
            Quadrant 4
          </div>
        </slot>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
// No script logic needed for pure layout
</script>
