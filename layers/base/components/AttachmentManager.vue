<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAttachments, type Attachment } from '../composables/useAttachments'
import { useImageActions } from '../composables/useImageActions'

const props = defineProps<{
  recordId: string
  recordType: string
  title?: string
}>()

const attachments = ref<Attachment[]>([])
const isLoading = ref(true)
const isUploading = ref(false)
const uploadProgress = ref(0)
const isDrawerOpen = ref(false)

const { fetchAttachments, addAttachment, deleteAttachment } = useAttachments()
const { openImageInNewTab, openImageModal } = useImageActions()

// Fetch attachments on mount
const loadAttachments = async () => {
  try {
    isLoading.value = true
    attachments.value = await fetchAttachments(props.recordId, props.recordType)
  } catch (error) {
    console.error('Failed to load attachments:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(loadAttachments)

// Handle File Selection
const fileInput = ref<HTMLInputElement | null>(null)
const galleryInput = ref<HTMLInputElement | null>(null)
const captureInput = ref<HTMLInputElement | null>(null)

const triggerFileUpload = () => {
  fileInput.value?.click()
  isDrawerOpen.value = false
}
const triggerGallery = () => {
  galleryInput.value?.click()
  isDrawerOpen.value = false
}
const triggerCamera = () => {
  captureInput.value?.click()
  isDrawerOpen.value = false
}

const handleFileChange = async (event: Event, type: 'image' | 'document') => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  const files = Array.from(input.files)
  try {
    isUploading.value = true
    uploadProgress.value = 10
    
    // Process all files
    for (const file of files) {
      const newAttachment = await addAttachment(props.recordId, props.recordType, file, type)
      attachments.value = [newAttachment, ...attachments.value]
    }
    
    // Reset inputs
    input.value = ''
  } catch (error) {
    console.error('Upload failed:', error)
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
  }
}

const handleDelete = async (attachment: Attachment) => {
  if (!confirm('Are you sure you want to delete this attachment?')) return
  
  try {
    await deleteAttachment(attachment)
    attachments.value = attachments.value.filter(a => a.id !== attachment.id)
  } catch (error) {
    console.error('Delete failed:', error)
  }
}

const handleOpenLarge = (attachment: Attachment) => {
  if (attachment.file_type === 'image') {
    openImageModal(attachment.file_url, attachment.file_name)
  } else {
    openImageInNewTab(attachment.file_url)
  }
}

const getFileIcon = (mimeType: string | null) => {
  if (!mimeType) return 'i-heroicons-document'
  if (mimeType.includes('pdf')) return 'i-heroicons-document-text'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'i-heroicons-table-cells'
  return 'i-heroicons-document'
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header Section -->
    <div class="flex items-center justify-between px-2 pt-2 flex-wrap gap-y-2">
      <h3 class="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
        <UIcon name="i-heroicons-paper-clip" class="text-gray-400" />
        {{ title || 'Files & Photos' }}
      </h3>
      
      <!-- Desktop Actions -->
      <div class="hidden md:flex flex-wrap gap-2 justify-end flex-1 ml-2">
        <UButton
          icon="i-heroicons-camera"
          color="warning"
          variant="solid"
          size="xs"
          class="rounded-full shadow-sm font-bold bg-warning-500/90 dark:bg-warning-500/90 backdrop-blur-md text-white border-2 border-warning-600/50"
          label="Camera"
          @click="triggerCamera"
        />

        <UButton
          icon="i-heroicons-photo"
          color="white"
          variant="solid"
          size="xs"
          class="rounded-full shadow-sm font-bold bg-white/90 dark:bg-gray-800/90 backdrop-blur-md text-gray-900 dark:text-white border-none"
          label="Gallery"
          @click="triggerGallery"
        />
        
        <UButton
          icon="i-heroicons-plus"
          color="white"
          variant="solid"
          size="xs"
          class="rounded-full shadow-sm font-bold bg-white/90 dark:bg-gray-800/90 backdrop-blur-md text-gray-900 dark:text-white border-none"
          label="File"
          @click="triggerFileUpload"
        />
      </div>

      <!-- Mobile Add Toggle -->
      <div class="md:hidden">
        <UButton
          :icon="isDrawerOpen ? 'i-heroicons-x-mark' : 'i-heroicons-plus-circle'"
          color="warning"
          variant="outline"
          size="sm"
          class="rounded-full font-black uppercase text-[10px] tracking-widest border-2"
          @click="isDrawerOpen = !isDrawerOpen"
        >
          Add
        </UButton>
      </div>
    </div>

    <!-- Hidden Inputs -->
    <input ref="fileInput" type="file" multiple class="hidden" @change="handleFileChange($event, 'document')" />
    <input ref="galleryInput" type="file" accept="image/*" multiple class="hidden" @change="handleFileChange($event, 'image')" />
    <input ref="captureInput" type="file" accept="image/*" capture="environment" class="hidden" @change="handleFileChange($event, 'image')" />

    <!-- Mobile Action Drawer -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform -translate-y-4 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform -translate-y-4 opacity-0"
    >
      <div v-if="isDrawerOpen" class="md:hidden mx-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-3xl flex flex-wrap gap-2 border border-gray-100 dark:border-gray-800">
        <button 
          class="flex-1 flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm active:scale-95 transition-transform min-w-[75px]"
          @click="triggerCamera"
        >
          <UIcon name="i-heroicons-camera" class="w-8 h-8 text-warning-500 mb-2" />
          <span class="text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">Camera</span>
        </button>
        <button 
          class="flex-1 flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm active:scale-95 transition-transform min-w-[75px]"
          @click="triggerGallery"
        >
          <UIcon name="i-heroicons-photo" class="w-8 h-8 text-indigo-500 mb-2" />
          <span class="text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">Gallery</span>
        </button>
        <button 
          class="flex-1 flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm active:scale-95 transition-transform min-w-[75px]"
          @click="triggerFileUpload"
        >
          <UIcon name="i-heroicons-document" class="w-8 h-8 text-orange-500 mb-2" />
          <span class="text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">File</span>
        </button>
      </div>
    </Transition>

    <!-- Uploading State -->
    <div v-if="isUploading" class="p-4 bg-primary-50 dark:bg-primary-900/10 rounded-2xl border border-primary-200 dark:border-primary-800 animate-pulse mx-2">
      <div class="flex items-center gap-3">
        <UIcon name="i-heroicons-arrow-up-tray" class="w-5 h-5 text-primary-500 animate-bounce" />
        <span class="text-sm font-bold text-primary-700 dark:text-primary-400 uppercase tracking-widest text-[10px]">Processing items...</span>
      </div>
    </div>

    <!-- Attachment Grid -->
    <div v-if="isLoading" class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4 px-2">
      <USkeleton v-for="i in 2" :key="i" class="h-32 rounded-2xl" />
    </div>

    <div v-else-if="attachments.length > 0" class="grid grid-cols-2 gap-4 px-2">
      <div 
        v-for="att in attachments" 
        :key="att.id"
        class="group relative bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
        @click="handleOpenLarge(att)"
      >
        <!-- Image Preview -->
        <div v-if="att.file_type === 'image'" class="aspect-video relative overflow-hidden bg-gray-50 dark:bg-gray-950">
          <NuxtImg 
            :src="att.file_url" 
            format="webp"
            quality="60"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
        </div>

        <!-- Document Icon -->
        <div v-else class="aspect-video flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <UIcon :name="getFileIcon(att.mime_type || null)" class="w-10 h-10 text-gray-300 dark:text-gray-700" />
        </div>

        <!-- Info Overlay -->
        <div class="p-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
          <div class="flex-1 min-w-0 mr-2">
            <p class="text-[9px] font-bold text-gray-900 dark:text-white truncate uppercase tracking-tighter">{{ att.file_name }}</p>
            <p class="text-[8px] text-gray-400 uppercase font-black" v-if="att.file_size">{{ (att.file_size / 1024).toFixed(0) }} KB</p>
          </div>
          
          <div class="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
            <UButton
              icon="i-heroicons-trash"
              color="red"
              variant="ghost"
              size="2xs"
              class="rounded-lg p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20"
              @click.stop="handleDelete(att)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State (Desktop Only or if requested) -->
    <div v-else class="hidden md:flex mx-2 p-8 bg-gray-50/50 dark:bg-gray-900/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 flex-col items-center justify-center text-center">
      <UIcon name="i-heroicons-document-plus" class="w-10 h-10 text-gray-200 dark:text-gray-800 mb-2" />
      <p class="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest leading-tight">
        No Files or Photos<br/>Attached
      </p>
    </div>
  </div>
</template>
