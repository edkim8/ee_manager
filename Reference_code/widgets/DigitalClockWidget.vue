// app/components/widgets/DigitalClockWidget.vue

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

// A ref to hold the current time. It's initialized to the current time.
const currentTime = ref(new Date());

// A ref to hold the timer ID so we can clear it later.
const timerId = ref<NodeJS.Timeout | null>(null);

/**
 * Updates the current time. This function will be called every second.
 */
const updateTime = () => {
  currentTime.value = new Date();
};

// When the component is first added to the page, start the timer.
onMounted(() => {
  // Update the time every 1000 milliseconds (1 second).
  timerId.value = setInterval(updateTime, 1000);
});

// When the component is removed from the page, stop the timer to prevent memory leaks.
onUnmounted(() => {
  if (timerId.value) {
    clearInterval(timerId.value);
  }
});
</script>

<template>
  <div
    class="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg h-[400px] shadow-md w-[400px]"
  >
    <!-- 
      The time is formatted using Intl.DateTimeFormat for a locale-aware display.
      - `hour12: true` ensures AM/PM format.
      - `hour`, `minute`, `second` are set to '2-digit' for consistent padding (e.g., 09:05:03 PM).
    -->
    <div class="text-5xl font-mono font-bold text-gray-900 dark:text-white">
      {{
        new Intl.DateTimeFormat('en-US', {
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(currentTime)
      }}
    </div>
    <!-- 
      Display the date below the time for additional context.
    -->
    <div class="text-lg text-gray-500 dark:text-gray-400 mt-2">
      {{
        new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }).format(currentTime)
      }}
    </div>
  </div>
</template>
