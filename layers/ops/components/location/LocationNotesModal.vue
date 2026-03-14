<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useNotes, type NoteWithAttachments, type NoteCategory } from '../../../base/composables/useNotes'
import SimpleModal from '../../../base/components/SimpleModal.vue'
import { usePropertyState } from '../../../base/composables/usePropertyState'

const props = defineProps<{
  modelValue: boolean
  locationId: string
  locationName?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { fetchNotes, addNote, addNoteAttachment, deleteNote, fetchCategories } = useNotes()

const { userContext } = usePropertyState()
const currentUserId = computed(() => userContext.value?.id ?? null)
const isSuperAdmin = computed(() => userContext.value?.access?.is_super_admin ?? false)

const canDeleteNote = (note: NoteWithAttachments) => {
  if (isSuperAdmin.value) return true
  if (!note.created_by) return false
  return note.created_by === currentUserId.value
}

// State
const notes = ref<NoteWithAttachments[]>([])
const isLoading = ref(false)
const showAddForm = ref(false)
const categoryOptions = ref<NoteCategory[]>([])

// New note form
const newNote = ref({
  text: '',
  category: 'general',
  cost: '' as string,
  vendor: '',
  files: [] as File[]
})

// Load category list from DB on mount
onMounted(async () => {
  categoryOptions.value = await fetchCategories('location')
  if (categoryOptions.value.length > 0) {
    newNote.value.category = categoryOptions.value[0].value
  }
})

// Load notes when modal opens
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) await loadNotes()
}, { immediate: true })

const loadNotes = async () => {
  if (!props.locationId) return
  isLoading.value = true
  try {
    notes.value = await fetchNotes(props.locationId, 'location')
  } catch (error) {
    console.error('Failed to load notes:', error)
  } finally {
    isLoading.value = false
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) newNote.value.files = Array.from(target.files)
}

const saveNote = async () => {
  if (!newNote.value.text.trim()) return

  isLoading.value = true
  try {
    const cost = newNote.value.cost !== '' ? parseFloat(newNote.value.cost) : null
    const note = await addNote(
      props.locationId, 'location', newNote.value.text, newNote.value.category,
      { cost: isNaN(cost) ? null : cost, vendor: newNote.value.vendor || null }
    )

    for (const file of newNote.value.files) {
      const fileType = file.type.startsWith('image/') ? 'image' : 'document'
      await addNoteAttachment(note.id, file, fileType)
    }

    newNote.value = { text: '', category: categoryOptions.value[0]?.value ?? 'general', cost: '', vendor: '', files: [] }
    showAddForm.value = false
    await loadNotes()
  } catch (error: any) {
    console.error('❌ Failed to save note:', error)
    alert(`Failed to save note: ${error.message || 'Unknown error'}`)
  } finally {
    isLoading.value = false
  }
}

const handleDelete = async (noteId: string) => {
  if (!confirm('Delete this note? This will also delete all attachments.')) return

  isLoading.value = true
  try {
    await deleteNote(noteId)
    await loadNotes()
  } catch (error: any) {
    console.error('Failed to delete note:', error)
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
    inspection:        'blue',
    repair_replacement: 'orange',
    incident:          'red',
    maintenance:       'green',
    update:            'purple',
  }
  return colors[category] || 'gray'
}

const getCategoryLabel = (category: string) =>
  categoryOptions.value.find(opt => opt.value === category)?.label || category
</script>

<template>
  <SimpleModal :model-value="modelValue" :title="`Notes - ${locationName || 'Location'}`" width="w-full max-w-3xl" @update:model-value="emit('update:modelValue', $event)">
    <div class="p-6">
      <!-- Add Note Button -->
      <div class="mb-6">
        <UButton v-if="!showAddForm" color="primary" icon="i-heroicons-plus" @click="showAddForm = true">
          Add Note
        </UButton>
      </div>

      <!-- Add Note Form -->
      <div v-if="showAddForm" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
        <h3 class="font-bold mb-4">New Note</h3>

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

        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Note</label>
          <textarea
            v-model="newNote.text"
            rows="4"
            placeholder="Enter note details..."
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
        </div>

        <!-- Cost + Vendor -->
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label class="block text-sm font-medium mb-2">Cost ($) <span class="text-gray-400 font-normal">optional</span></label>
            <UInput v-model="newNote.cost" type="number" min="0" step="0.01" placeholder="0.00" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Vendor / Contractor <span class="text-gray-400 font-normal">optional</span></label>
            <UInput v-model="newNote.vendor" placeholder="e.g. ABC HVAC Services" />
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Attachments (Photos/Documents)</label>
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx" class="w-full" @change="handleFileSelect">
          <p v-if="newNote.files.length > 0" class="text-sm text-gray-500 mt-2">
            {{ newNote.files.length }} file(s) selected
          </p>
        </div>

        <div class="flex gap-2">
          <UButton color="primary" :loading="isLoading" @click="saveNote">Save Note</UButton>
          <UButton color="gray" variant="soft" @click="showAddForm = false">Cancel</UButton>
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
              <span v-if="note.creator_name" class="text-xs text-gray-400">By: {{ note.creator_name }}</span>
            </div>
            <UButton
              v-if="canDeleteNote(note)"
              icon="i-heroicons-trash"
              color="red"
              variant="ghost"
              size="sm"
              @click="handleDelete(note.id)"
            />
          </div>

          <p class="text-sm text-gray-900 dark:text-white mb-3 whitespace-pre-wrap">{{ note.note_text }}</p>

          <!-- Cost / Vendor -->
          <div v-if="note.cost != null || note.vendor" class="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
            <span v-if="note.cost != null">
              💰 <span class="font-semibold text-gray-700 dark:text-gray-300">${{ Number(note.cost).toFixed(2) }}</span>
            </span>
            <span v-if="note.vendor">
              🏢 <span class="font-semibold text-gray-700 dark:text-gray-300">{{ note.vendor }}</span>
            </span>
          </div>

          <div v-if="note.attachments.length > 0" class="mt-3">
            <p class="text-xs font-medium text-gray-500 mb-2">Attachments:</p>
            <div class="grid grid-cols-4 gap-2">
              <div v-for="att in note.attachments" :key="att.id" class="relative">
                <a v-if="att.file_type === 'image'" :href="att.file_url" target="_blank" class="block">
                  <img :src="att.file_url" :alt="att.file_name" class="w-full h-20 object-contain rounded border border-gray-200">
                </a>
                <a v-else :href="att.file_url" target="_blank" class="flex items-center gap-2 p-2 border border-gray-200 rounded hover:bg-gray-50">
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
