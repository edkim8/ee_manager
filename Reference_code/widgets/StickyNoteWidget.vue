// app/components/widgets/StickyNoteWidget.vue

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';

// --- Configuration ---
const NOTE_CONTENT_KEY = 'stickyNoteContent';
const NOTE_COLOR_KEY = 'stickyNoteColor';

const colors = {
  yellow: 'bg-yellow-200 text-gray-800 border-yellow-300',
  pink: 'bg-pink-200 text-gray-800 border-pink-300',
  blue: 'bg-blue-200 text-gray-800 border-blue-300',
  green: 'bg-green-200 text-gray-800 border-green-300',
};
const defaultColor = 'yellow';

// --- Reactive State ---
const noteContent = ref('');
const selectedColor = ref(defaultColor);

// --- Computed Properties ---
// Determines the Tailwind CSS classes for the widget based on the selected color.
const widgetClasses = computed(() => {
  return (
    colors[selectedColor.value as keyof typeof colors] || colors[defaultColor]
  );
});

// --- Lifecycle Hooks & Watchers ---
// Load data from localStorage when the component is first mounted.
onMounted(() => {
  const savedContent = localStorage.getItem(NOTE_CONTENT_KEY);
  const savedColor = localStorage.getItem(NOTE_COLOR_KEY) || defaultColor;

  if (savedContent) {
    noteContent.value = savedContent;
  }
  selectedColor.value = savedColor;
});

// Watch for changes in the note content and automatically save to localStorage.
watch(noteContent, (newContent) => {
  localStorage.setItem(NOTE_CONTENT_KEY, newContent);
});

// Watch for changes in the selected color and save to localStorage.
watch(selectedColor, (newColor) => {
  localStorage.setItem(NOTE_COLOR_KEY, newColor);
});
</script>

<template>
  <div
    :class="widgetClasses"
    class="w-[400px] h-[400px] max-w-sm flex flex-col rounded-lg shadow-xl transition-colors duration-300 border"
  >
    <!-- Header with Color Palette and Drag Handle -->
    <div class="flex items-center justify-between p-2 border-b border-black/10">
      <div class="flex items-center gap-2">
        <!-- Loop through available colors to create the palette -->
        <button
          v-for="(classes, colorName) in colors"
          :key="colorName"
          :class="[
            classes.split(' ')[0], // e.g., bg-yellow-200
            'size-5 rounded-full border-2 focus:outline-none transition-transform transform hover:scale-110',
            selectedColor === colorName
              ? 'ring-2 ring-offset-1 ring-primary-500'
              : 'border-black/20',
          ]"
          :aria-label="`Change color to ${colorName}`"
          @click="selectedColor = colorName"
        />
      </div>
      <!-- This handle is for the drag-and-drop functionality of the parent page -->
      <div class="drag-handle cursor-move text-gray-500 hover:text-gray-700">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="9" cy="12" r="1"></circle>
          <circle cx="9" cy="5" r="1"></circle>
          <circle cx="9" cy="19" r="1"></circle>
          <circle cx="15" cy="12" r="1"></circle>
          <circle cx="15" cy="5" r="1"></circle>
          <circle cx="15" cy="19" r="1"></circle>
        </svg>
      </div>
    </div>

    <!-- Textarea for notes -->
    <textarea
      v-model="noteContent"
      class="font-['Kalam'] w-full h-full p-4 text-lg bg-transparent resize-none focus:outline-none focus:ring-0"
      placeholder="Write a note..."
    ></textarea>
  </div>
</template>

<style scoped>
/* Ensure Kalam font is available if used project-wide, or import it here. */
@import url('https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=swap');
</style>
