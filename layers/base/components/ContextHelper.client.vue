<script setup lang="ts">
import { ref } from 'vue'
import SimpleModal from './SimpleModal.vue'

interface Props {
  title: string
  description?: string
  icon?: string
  buttonClass?: string
  width?: string
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'i-heroicons-question-mark-circle',
  buttonClass: 'top-4 right-4 sm:top-auto sm:bottom-4 sm:right-4',
  width: 'max-w-2xl'
})

const isOpen = ref(false)

const toggleModal = () => {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <div class="fixed z-50 pointer-events-auto safe-top-position" :class="buttonClass">
    <!-- Floating Toggle Button -->
    <UButton
      :icon="icon"
      color="primary"
      variant="solid"
      size="xl"
      class="rounded-full shadow-2xl hover:scale-110 transition-transform duration-200"
      @click="toggleModal"
    />

    <!-- Help Modal -->
    <SimpleModal
      v-model="isOpen"
      :title="title"
      :description="description"
      :width="width"
    >
      <div class="prose prose-sm dark:prose-invert max-w-none">
        <slot />
      </div>

      <template #footer>
        <div class="flex justify-end">
          <UButton
            label="Got it"
            color="primary"
            variant="solid"
            @click="isOpen = false"
          />
        </div>
      </template>
    </SimpleModal>
  </div>
</template>

<style scoped>
/* Ensure the button pops slightly more than normal buttons */
.shadow-2xl {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

@media (max-width: 639px) {
  .safe-top-position {
    top: calc(env(safe-area-inset-top, 0px) + 1rem);
  }
}
</style>
