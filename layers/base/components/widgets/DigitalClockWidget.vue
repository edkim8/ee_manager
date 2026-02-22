<script setup lang="ts">
const currentTime = ref(new Date())
let timerId: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timerId = setInterval(() => { currentTime.value = new Date() }, 1000)
})

onUnmounted(() => {
  if (timerId) clearInterval(timerId)
})

const timeString = computed(() =>
  new Intl.DateTimeFormat('en-US', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(currentTime.value)
)

const dateString = computed(() =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(currentTime.value)
)
</script>

<template>
  <div class="flex flex-col items-center justify-center py-8 gap-3">
    <div class="text-5xl font-mono font-black text-gray-900 dark:text-white tracking-tighter tabular-nums">
      {{ timeString }}
    </div>
    <div class="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">
      {{ dateString }}
    </div>
  </div>
</template>
