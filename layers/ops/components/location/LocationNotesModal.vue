<script setup lang="ts">
import { ref, watch } from 'vue'
import { useLocationNotes, type NoteWithAttachments } from '../../composables/useLocationNotes'
import SimpleModal from '../../../base/components/SimpleModal.vue'

const props = defineProps<{
  modelValue: boolean
  locationId: string
  locationName?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { fetchLocationNotes, addLocationNote, addNoteAttachment, deleteLocationNote } = useLocationNotes()

// State
const notes = ref<NoteWithAttachments[]>([])
const isLoading = ref(false)
const showAddForm = ref(false)

// New note form
const newNote = ref({
  text: '',
  category: 'general' as 'inspection' | 'repair_replacement' | 'incident' | 'maintenance' | 'update',
  files: [] as File[]
})

const categoryOptions = [
  { label: 'Inspection', value: 'inspection' },
  { label: 'Repair/Replacement', value: 'repair_replacement' },
  { label: 'Incident', value: 'incident' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Update', value: 'update' }
]

// Load notes when modal opens
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    await loadNotes()
  }
}, { immediate: true })

const loadNotes = async () => {
  if (!props.locationId) return

  isLoading.value = true
  try {
    notes.value = await fetchLocationNotes(props.locationId)
  } catch (error) {
    console.error('Failed to load notes:', error)
  } finally {
    isLoading.value = false
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    newNote.value.files = Array.from(target.files)
  }
}

const saveNote = async () => {
  console.group('💾 Saving note')
  console.log('Note text:', newNote.value.text)
  console.log('Category:', newNote.value.category)
  console.log('Files:', newNote.value.files.length)
  console.log('Location ID:', props.locationId)

  if (!newNote.value.text.trim()) {
    console.warn('⚠️ Note text is empty')
    console.groupEnd()
    return
  }

  isLoading.value = true
  try {
    // Add note
    console.log('Step 1: Adding note to database...')
    const note = await addLocationNote(
      props.locationId,
      newNote.value.text,
      newNote.value.category
    )
    console.log('✅ Note added:', note.id)

    // Upload attachments
    if (newNote.value.files.length > 0) {
      console.log('Step 2: Uploading attachments...')
      for (const file of newNote.value.files) {
        const fileType = file.type.startsWith('image/') ? 'image' : 'document'
        console.log(`Uploading ${fileType}:`, file.name)
        await addNoteAttachment(note.id, file, fileType)
      }
      console.log('✅ All attachments uploaded')
    }

    // Reset form
    newNote.value = {
      text: '',
      category: 'inspection',
      files: []
    }
    showAddForm.value = false

    // Reload notes
    console.log('Step 3: Reloading notes...')
    await loadNotes()
    console.log('✅ Notes reloaded')
    console.groupEnd()
  } catch (error: any) {
    console.error('❌ Failed to save note:', error)
    console.groupEnd()
    alert(`Failed to save note: ${error.message || 'Unknown error'}`)
  } finally {
    isLoading.value = false
  }
}

const handleDelete = async (noteId: string, note: NoteWithAttachments) => {
  if (!confirm('Delete this note? This will also delete all attachments.')) return

  isLoading.value = true
  try {
    await deleteLocationNote(noteId)
    await loadNotes()
  } catch (error: any) {
    console.error('Failed to delete note:', error)

    // Check if it's a permission error
    if (error.message?.includes('policy') || error.code === '42501') {
      alert('Cannot delete this note. Only the creator can delete their own notes.')
    } else {
      alert('Failed to delete note. Please try again.')
    }
  } finally {
    isLoading.value = false
  }
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    inspection: 'blue',
    repair_replacement: 'orange',
    incident: 'red',
    maintenance: 'green',
    update: 'purple'
  }
  return colors[category] || 'gray'
}

const getCategoryLabel = (category: string) => {
  return categoryOptions.find(opt => opt.value === category)?.label || category
}
</script>

<template>
  <SimpleModal :model-value="modelValue" :title="`Notes - ${locationName || 'Location'}`" width="w-full max-w-3xl" @update:model-value="emit('update:modelValue', $event)">
    <div class="p-6">
      <!-- Add Note Button -->
      <div class="mb-6">
        <UButton
          v-if="!showAddForm"
          color="primary"
          icon="i-heroicons-plus"
          @click="showAddForm = true"
        >
          Add Note
        </UButton>
      </div>

      <!-- Add Note Form -->
      <div v-if="showAddForm" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
        <h3 class="font-bold mb-4">New Note</h3>

        <!-- Category -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Category</label>
          <select
            v-model="newNote.category"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          >
            <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Note Text -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Note</label>
          <textarea
            v-model="newNote.text"
            rows="4"
            placeholder="Enter note details..."
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
        </div>

        <!-- File Attachments -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Attachments (Photos/Documents)</label>
          <input
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            class="w-full"
            @change="handleFileSelect"
          >
          <p v-if="newNote.files.length > 0" class="text-sm text-gray-500 mt-2">
            {{ newNote.files.length }} file(s) selected
          </p>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <UButton color="primary" :loading="isLoading" @click="saveNote">
            Save Note
          </UButton>
          <UButton color="gray" variant="soft" @click="showAddForm = false">
            Cancel
          </UButton>
        </div>
      </div>

      <!-- Notes List -->
      <div v-if="isLoading && notes.length === 0" class="text-center py-8">
        <p class="text-gray-500">Loading notes...</p>
      </div>

      <div v-else-if="notes.length === 0" class="text-center py-8">
        <p class="text-gray-500">No notes yet. Add your first note above!</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="note in notes"
          :key="note.id"
          class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
        >
          <!-- Header -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <UBadge :color="getCategoryColor(note.category)" variant="subtle">
                  {{ getCategoryLabel(note.category) }}
                </UBadge>
                <span class="text-xs text-gray-500">
                  {{ new Date(note.created_at).toLocaleDateString() }} at {{ new Date(note.created_at).toLocaleTimeString() }}
                </span>
              </div>
              <span v-if="note.created_by" class="text-xs text-gray-400">
                By: {{ note.created_by.substring(0, 8) }}...
              </span>
            </div>
            <UButton
              icon="i-heroicons-trash"
              color="red"
              variant="ghost"
              size="sm"
              @click="handleDelete(note.id, note)"
            />
          </div>

          <!-- Note Text -->
          <p class="text-sm text-gray-900 dark:text-white mb-3 whitespace-pre-wrap">
            {{ note.note_text }}
          </p>

          <!-- Attachments -->
          <div v-if="note.attachments.length > 0" class="mt-3">
            <p class="text-xs font-medium text-gray-500 mb-2">Attachments:</p>
            <div class="grid grid-cols-4 gap-2">
              <div
                v-for="att in note.attachments"
                :key="att.id"
                class="relative"
              >
                <a
                  v-if="att.file_type === 'image'"
                  :href="att.file_url"
                  target="_blank"
                  class="block"
                >
                  <img
                    :src="att.file_url"
                    :alt="att.file_name"
                    class="w-full h-20 object-cover rounded border border-gray-200"
                  >
                </a>
                <a
                  v-else
                  :href="att.file_url"
                  target="_blank"
                  class="flex items-center gap-2 p-2 border border-gray-200 rounded hover:bg-gray-50"
                >
                  <UIcon name="i-heroicons-document" class="w-4 h-4" />
                  <span class="text-xs truncate">{{ att.file_name }}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </SimpleModal>
</template>
