<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface LocationOption {
  id: string
  name: string
}

interface Props {
  modelValue: string
  options: LocationOption[]
  label: string
  placeholder?: string
  required?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select...',
  required: false
})

const emit = defineEmits<Emits>()

const showModal = ref(false)
const searchTerm = ref('')

// --- Recent Selections (localStorage) ---
const RECENT_KEY = computed(() => `recent_selections:${props.label}`)
const MAX_RECENTS = 5

const recentSelections = ref<LocationOption[]>([])

const loadRecents = () => {
  try {
    const stored = localStorage.getItem(RECENT_KEY.value)
    recentSelections.value = stored ? JSON.parse(stored) : []
  } catch {
    recentSelections.value = []
  }
}

const saveRecent = (option: LocationOption) => {
  try {
    const existing = recentSelections.value.filter(r => r.id !== option.id)
    const updated = [option, ...existing].slice(0, MAX_RECENTS)
    recentSelections.value = updated
    localStorage.setItem(RECENT_KEY.value, JSON.stringify(updated))
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

// Selected option display
const selectedOption = computed(() => {
  return props.options.find(opt => opt.id === props.modelValue)
})

// Filtered options based on search (exclude recent IDs to avoid duplication)
const recentIds = computed(() => new Set(recentSelections.value.map(r => r.id)))

const filteredOptions = computed(() => {
  const base = searchTerm.value
    ? props.options.filter(opt => opt.name.toLowerCase().includes(searchTerm.value.toLowerCase()))
    : props.options

  // When searching, show all matches (no deduplication with recents)
  if (searchTerm.value) return base

  // When not searching, exclude items already in recents section
  return base.filter(opt => !recentIds.value.has(opt.id))
})

const showRecents = computed(() => !searchTerm.value && recentSelections.value.length > 0)

const selectOption = (option: LocationOption) => {
  saveRecent(option)
  emit('update:modelValue', option.id)
  showModal.value = false
  searchTerm.value = ''
}

const openModal = () => {
  loadRecents()
  showModal.value = true
  searchTerm.value = ''
}

const closeModal = () => {
  showModal.value = false
  searchTerm.value = ''
}

// Clear selection
const clearSelection = () => {
  emit('update:modelValue', '')
  showModal.value = false
}
</script>

<template>
  <div class="location-selector">
    <label class="block text-sm font-medium mb-1">
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>

    <!-- Selected Value Display / Trigger Button -->
    <button
      type="button"
      @click="openModal"
      class="w-full px-4 py-3 border-2 rounded-lg text-left flex items-center justify-between
             bg-white dark:bg-gray-900 dark:border-gray-700
             hover:border-blue-500 dark:hover:border-blue-500 transition-colors
             focus:outline-none focus:ring-2 focus:ring-blue-500"
      :class="!selectedOption && 'text-gray-400 dark:text-gray-500'"
    >
      <span class="flex-1 truncate">
        {{ selectedOption ? selectedOption.name : placeholder }}
      </span>
      <span class="text-gray-400 ml-2">▼</span>
    </button>

    <p v-if="options.length === 0" class="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
      No options available
    </p>

    <!-- Modal Selector -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4"
        @click.self="closeModal"
      >
        <div
          class="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg w-full sm:max-w-lg max-h-[80vh] sm:max-h-[600px] flex flex-col animate-slide-up"
        >
          <!-- Header -->
          <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 class="font-semibold text-lg">{{ label }}</h3>
            <button
              type="button"
              @click="closeModal"
              class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-2 -mr-2"
            >
              ✕
            </button>
          </div>

          <!-- Search Input -->
          <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Search..."
              autofocus
              class="w-full px-4 py-3 border-2 rounded-lg dark:bg-gray-900 dark:border-gray-700
                     focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            />
            <p class="text-xs text-gray-500 mt-2">
              Showing {{ filteredOptions.length }} of {{ options.length }} options
            </p>
          </div>

          <!-- Options List -->
          <div class="flex-1 overflow-y-auto">

            <!-- Recent Selections Section -->
            <template v-if="showRecents">
              <div class="px-4 pt-3 pb-1">
                <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Recent</p>
              </div>
              <button
                v-for="option in recentSelections"
                :key="`recent-${option.id}`"
                type="button"
                @click="selectOption(option)"
                class="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20
                       border-b border-gray-100 dark:border-gray-800 transition-colors
                       flex items-center justify-between group"
                :class="option.id === modelValue && 'bg-blue-100 dark:bg-blue-900/30'"
              >
                <div class="flex items-center gap-2">
                  <span class="text-gray-400 text-xs">↩</span>
                  <span class="font-medium">{{ option.name }}</span>
                </div>
                <span
                  v-if="option.id === modelValue"
                  class="text-blue-600 dark:text-blue-400"
                >
                  ✓
                </span>
              </button>

              <div class="px-4 pt-3 pb-1">
                <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">All Options</p>
              </div>
            </template>

            <!-- Main Options -->
            <div v-if="filteredOptions.length === 0 && !showRecents" class="p-8 text-center text-gray-500">
              No results found
            </div>

            <button
              v-for="option in filteredOptions"
              :key="option.id"
              type="button"
              @click="selectOption(option)"
              class="w-full px-4 py-4 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20
                     border-b border-gray-100 dark:border-gray-800 transition-colors
                     flex items-center justify-between group"
              :class="option.id === modelValue && 'bg-blue-100 dark:bg-blue-900/30'"
            >
              <span class="font-medium">{{ option.name }}</span>
              <span
                v-if="option.id === modelValue"
                class="text-blue-600 dark:text-blue-400"
              >
                ✓
              </span>
            </button>
          </div>

          <!-- Footer Actions -->
          <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <button
              v-if="modelValue && !required"
              type="button"
              @click="clearSelection"
              class="flex-1 px-4 py-3 border-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700
                     font-medium transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              @click="closeModal"
              class="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                     font-medium transition-colors"
            >
              {{ modelValue ? 'Done' : 'Cancel' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}

/* Mobile-first responsive styles */
@media (max-width: 640px) {
  .location-selector button {
    min-height: 48px; /* Larger touch target on mobile */
  }
}
</style>
