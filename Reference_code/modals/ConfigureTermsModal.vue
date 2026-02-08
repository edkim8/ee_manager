// File: app/components/modals/ConfigureTermsModal.vue
<script setup lang="ts">
import { ref, reactive } from 'vue';
import type { Form } from '#ui/types';

const props = defineProps<{
  initialSettings: {
    primary_term: number;
    first_term: number | null;
    first_term_offset: number | null;
    second_term: number | null;
    second_term_offset: number | null;
    third_term: number | null;
    third_term_offset: number | null;
    early_discount: number | null;
    early_discount_date: string | null;
    term_goals: { [key: string]: number } | null; // Added prop for goals
  };
}>();

const emit = defineEmits(['close']);
const form = ref<Form<any> | null>(null);

// Create a local, editable copy of the settings, including the new goal fields
const state = reactive({
  ...props.initialSettings,
  primary_term: props.initialSettings.primary_term ?? 12,
  // Parse the incoming term_goals object to pre-fill the goal inputs
  primary_term_goal:
    props.initialSettings.term_goals?.[props.initialSettings.primary_term] ??
    null,
  first_term_goal:
    props.initialSettings.term_goals?.[props.initialSettings.first_term!] ??
    null,
  second_term_goal:
    props.initialSettings.term_goals?.[props.initialSettings.second_term!] ??
    null,
  third_term_goal:
    props.initialSettings.term_goals?.[props.initialSettings.third_term!] ??
    null,
});

function handleSubmit() {
  const termGoalsPayload: { [key: string]: number } = {};

  // Intelligently build the term_goals JSON object
  if (state.primary_term && state.primary_term_goal) {
    termGoalsPayload[state.primary_term] = state.primary_term_goal;
  }
  if (state.first_term && state.first_term_goal) {
    termGoalsPayload[state.first_term] = state.first_term_goal;
  }
  if (state.second_term && state.second_term_goal) {
    termGoalsPayload[state.second_term] = state.second_term_goal;
  }
  if (state.third_term && state.third_term_goal) {
    termGoalsPayload[state.third_term] = state.third_term_goal;
  }

  // Create the final payload to emit
  const dataToEmit = {
    ...state,
    term_goals: termGoalsPayload,
  };

  // Clean up the temporary state properties before emitting
  delete dataToEmit.primary_term_goal;
  delete dataToEmit.first_term_goal;
  delete dataToEmit.second_term_goal;
  delete dataToEmit.third_term_goal;

  emit('close', dataToEmit);
}
</script>

<template>
  <UModal>
    <template #header>
      <h3 class="text-base font-semibold">Configure Renewal Terms & Goals</h3>
    </template>

    <template #body>
      <UForm :state="state" @submit="handleSubmit" class="space-y-4">
        <!-- Primary Term & Goal -->
        <div class="grid grid-cols-2 gap-4">
          <UFormField
            label="Primary Term (months)"
            name="primary_term"
            required
          >
            <UInput v-model.number="state.primary_term" type="number" />
          </UFormField>
          <UFormField label="Primary Term Goal" name="primary_term_goal">
            <UInput
              v-model.number="state.primary_term_goal"
              type="number"
              placeholder="e.g., 20"
            />
          </UFormField>
        </div>

        <USeparator class="my-4" />

        <!-- Alternate Terms & Goals -->
        <div class="grid grid-cols-3 gap-4">
          <UFormField label="1st Alt. Term" name="first_term">
            <UInput
              v-model.number="state.first_term"
              type="number"
              placeholder="e.g., 10"
            />
          </UFormField>
          <UFormField label="1st Offset (%)" name="first_term_offset">
            <UInput
              v-model.number="state.first_term_offset"
              type="number"
              placeholder="e.g., -2.5"
            />
          </UFormField>
          <UFormField
            v-if="state.first_term"
            label="1st Term Goal"
            name="first_term_goal"
          >
            <UInput
              v-model.number="state.first_term_goal"
              type="number"
              placeholder="e.g., 5"
            />
          </UFormField>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <UFormField label="2nd Alt. Term" name="second_term">
            <UInput v-model.number="state.second_term" type="number" />
          </UFormField>
          <UFormField label="2nd Offset (%)" name="second_term_offset">
            <UInput v-model.number="state.second_term_offset" type="number" />
          </UFormField>
          <UFormField
            v-if="state.second_term"
            label="2nd Term Goal"
            name="second_term_goal"
          >
            <UInput v-model.number="state.second_term_goal" type="number" />
          </UFormField>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <UFormField label="3rd Alt. Term" name="third_term">
            <UInput v-model.number="state.third_term" type="number" />
          </UFormField>
          <UFormField label="3rd Offset (%)" name="third_term_offset">
            <UInput v-model.number="state.third_term_offset" type="number" />
          </UFormField>
          <UFormField
            v-if="state.third_term"
            label="3rd Term Goal"
            name="third_term_goal"
          >
            <UInput v-model.number="state.third_term_goal" type="number" />
          </UFormField>
        </div>

        <USeparator class="my-4" />

        <!-- Early Acceptance Discount -->
        <div class="grid grid-cols-2 gap-4">
          <UFormField
            label="Early Acceptance Discount ($)"
            name="early_discount"
          >
            <UInput
              v-model.number="state.early_discount"
              type="number"
              placeholder="e.g., 100"
            />
          </UFormField>
          <UFormField label="Discount Due Date" name="early_discount_date">
            <UInput v-model="state.early_discount_date" type="date" />
          </UFormField>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 pt-4">
          <UButton @click="$emit('close', null)" color="gray" variant="outline"
            >Cancel</UButton
          >
          <UButton type="submit" label="Save Terms" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
