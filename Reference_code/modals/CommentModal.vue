<script setup lang="ts">
import { ref } from 'vue';
import { UModal, UForm, UFormField, UTextarea, UButton } from '#components';
import type { Form } from '#ui/types';

const props = defineProps<{
  initialComment: string | null;
  initialApproverComment: string | null;
  permissions: {
    isManagerOrAdmin?: boolean;
    isRpmOrAdmin?: boolean;
  };
}>();

const emit = defineEmits(['close']);

const form = ref<Form<any> | null>(null);
// Create local reactive variables for the textareas to bind to v-model.
const localComment = ref(props.initialComment);
const localApproverComment = ref(props.initialApproverComment);

// When the form is submitted, emit the new values back to the page.
function handleSubmit() {
  emit('close', {
    comment: localComment.value,
    approver_comment: localApproverComment.value,
  });
}
</script>

<template>
  <UModal>
    <template #header>
      <h3
        class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
      >
        Edit Comments
      </h3>
    </template>

    <template #body>
      <UForm ref="form" :state="{}" @submit="handleSubmit" class="space-y-4">
        <UFormField label="Manager Comment" name="comment">
          <UTextarea
            v-model="localComment"
            :disabled="!permissions.isManagerOrAdmin"
            placeholder="No comment..."
            autoresize
          />
        </UFormField>

        <UFormField label="Approver Comment" name="approverComment">
          <UTextarea
            v-model="localApproverComment"
            :disabled="!permissions.isRpmOrAdmin"
            placeholder="No approver comment..."
            autoresize
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton @click="$emit('close', null)" color="neutral" variant="ghost"
          >Cancel</UButton
        >
        <UButton @click="form?.submit()" label="Save Comments" />
      </div>
    </template>
  </UModal>
</template>
