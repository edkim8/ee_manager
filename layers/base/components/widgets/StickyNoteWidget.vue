<script setup lang="ts">
const NOTE_CONTENT_KEY = 'ee-widget-stickyNote-content'
const NOTE_COLOR_KEY = 'ee-widget-stickyNote-color'

const colorMap: Record<string, { bg: string; border: string; text: string }> = {
  yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-700', text: 'text-gray-800 dark:text-yellow-100' },
  pink:   { bg: 'bg-pink-50 dark:bg-pink-900/20',   border: 'border-pink-200 dark:border-pink-700',   text: 'text-gray-800 dark:text-pink-100' },
  blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200 dark:border-blue-700',   text: 'text-gray-800 dark:text-blue-100' },
  green:  { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-700', text: 'text-gray-800 dark:text-green-100' },
}

const dotColors: Record<string, string> = {
  yellow: 'bg-yellow-300',
  pink:   'bg-pink-300',
  blue:   'bg-blue-300',
  green:  'bg-green-300',
}

const noteContent = ref('')
const selectedColor = ref('yellow')

onMounted(() => {
  noteContent.value = localStorage.getItem(NOTE_CONTENT_KEY) || ''
  selectedColor.value = localStorage.getItem(NOTE_COLOR_KEY) || 'yellow'
})

watch(noteContent, val => localStorage.setItem(NOTE_CONTENT_KEY, val))
watch(selectedColor, val => localStorage.setItem(NOTE_COLOR_KEY, val))

const currentColors = computed(() => colorMap[selectedColor.value] || colorMap.yellow)
</script>

<template>
  <div
    :class="[currentColors.bg, currentColors.border, currentColors.text, 'flex flex-col rounded-xl border transition-colors duration-300 -m-4 h-full min-h-[220px]']"
  >
    <!-- Color palette row -->
    <div class="flex items-center gap-2 p-3 border-b border-black/5 dark:border-white/5">
      <button
        v-for="(_, colorName) in colorMap"
        :key="colorName"
        :class="[
          dotColors[colorName],
          'w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none',
          selectedColor === colorName ? 'ring-2 ring-offset-1 ring-primary-500 border-transparent' : 'border-black/10 dark:border-white/10',
        ]"
        :aria-label="`Switch to ${colorName}`"
        @click="selectedColor = colorName"
      />
      <span class="ml-auto text-[9px] font-black uppercase tracking-widest opacity-40">Note</span>
    </div>

    <!-- Textarea -->
    <textarea
      v-model="noteContent"
      class="flex-1 w-full p-4 text-sm bg-transparent resize-none focus:outline-none focus:ring-0 placeholder-current placeholder-opacity-40 font-medium leading-relaxed"
      placeholder="Write a note..."
    />
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=swap');
textarea { font-family: 'Kalam', cursive; }
</style>
