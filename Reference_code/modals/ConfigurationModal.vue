<!--
  File: app/components/modals/ConfigurationModal.vue
  Description: The final, corrected version that follows the Nuxt UI programmatic
  pattern for both script logic and template structure.
-->
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { useConstantsMutation } from '~/composables/mutations/constants/useConstantsMutation';
import { useToastHelpers } from '@/composables/useToastHelpers';
import type { AppConstant } from '@/types/constants';

// --- PROPS & EMITS ---
const props = defineProps<{
  title: string;
  initialConstants: AppConstant[];
}>();

const emit = defineEmits(['close']);

// --- COMPOSABLES ---
const { isSaving, updateConstants, resetConstant } = useConstantsMutation();
const { isAdmin } = useAuth();
const { toastError, toastSuccess } = useToastHelpers();

// --- STATE MANAGEMENT ---
const localConstants = ref<AppConstant[]>([]);
const originalParsedConstants = ref<AppConstant[]>([]);

/**
 * A helper function to parse string values from the DB into correct JS types.
 */
function parseConstants(constants: AppConstant[]): AppConstant[] {
  if (!constants) return [];
  return constants.map((c) => {
    const newConstant = { ...c };
    switch (newConstant.data_type) {
      case 'boolean':
        newConstant.value = String(newConstant.value).toLowerCase() === 'true';
        break;
      case 'number':
      case 'percent':
        newConstant.value = parseFloat(String(newConstant.value));
        break;
    }
    return newConstant;
  });
}

// Use a `watch` with `immediate: true` to initialize local state from props.
watch(
  () => props.initialConstants,
  (newConstants) => {
    if (newConstants && newConstants.length > 0) {
      const parsed = parseConstants(newConstants);
      originalParsedConstants.value = JSON.parse(JSON.stringify(parsed));
      localConstants.value = JSON.parse(JSON.stringify(parsed));
    }
  },
  { immediate: true, deep: true }
);

const isDirty = computed(() => {
  return (
    JSON.stringify(originalParsedConstants.value) !==
    JSON.stringify(localConstants.value)
  );
});

// --- EVENT HANDLERS ---
const handleSaveChanges = async () => {
  try {
    const changedConstants = localConstants.value
      .filter(
        (local, index) =>
          JSON.stringify(local) !==
          JSON.stringify(originalParsedConstants.value[index])
      )
      .map((c) => ({ id: c.id, value: String(c.value) }));

    if (changedConstants.length > 0) {
      await updateConstants(changedConstants);
      toastSuccess({
        title: 'Settings Saved',
        description: 'Configuration updated successfully.',
      });
    }

    emit('close', { saved: true });
  } catch (e: any) {
    // --- THIS IS THE FIX ---
    // We now display the error instead of swallowing it.
    console.error('Failed to save constants:', e);
    toastError({
      title: 'Save Failed',
      description: e.message || 'Could not save settings.',
    });
    // We do NOT emit close here, so the user can try again or see the error.
  }
};

const handleReset = async (constantId: string) => {
  try {
    const updatedConstant = await resetConstant(constantId);
    const index = localConstants.value.findIndex((c) => c.id === constantId);
    if (index !== -1 && updatedConstant) {
      const parsedValue = parseValue(
        updatedConstant.value,
        updatedConstant.data_type
      );
      localConstants.value[index].value = parsedValue;
      toastSuccess({ title: 'Reset', description: 'Value reset to default.' });
    }
  } catch (e: any) {
    toastError({ title: 'Reset Failed', description: e.message });
  }
};

const parseValue = (
  value: any,
  type: AppConstant['data_type']
): string | number | boolean => {
  if (value === null || typeof value === 'undefined') return value;
  switch (type) {
    case 'number':
    case 'percent':
      return Number(value);
    case 'boolean':
      return String(value).toLowerCase() === 'true';
    default:
      return String(value);
  }
};

// --- GROUPING LOGIC ---
const groupedConstants = computed(() => {
  if (!localConstants.value) return [];
  const groups: Record<string, { title: string; items: AppConstant[] }> = {
    model: { title: 'Concession Model Parameters', items: [] },
    reminders: { title: 'UI Reminder Rules', items: [] },
    other: { title: 'Other Settings', items: [] },
  };

  for (const constant of localConstants.value) {
    if (constant.key.startsWith('reminder_')) {
      groups.reminders.items.push(constant);
    } else if (constant.category === 'concession_model') {
      groups.model.items.push(constant);
    } else {
      groups.other.items.push(constant);
    }
  }

  return Object.values(groups).filter((group) => group.items.length > 0);
});
</script>

<template>
  <UModal>
    <!-- The <UCard> is placed inside the modal to provide the standard styling and slots. -->

    <template #header>
      <div class="flex items-center justify-between">
        <h3
          class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
        >
          {{ props.title }}
        </h3>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-x-mark-20-solid"
          class="-my-1"
          @click="emit('close')"
        />
      </div>
    </template>

    <!-- --- THIS IS THE FIX: Part 1 --- -->
    <!-- The main content, including loading/error states, is now correctly inside the #body slot. -->
    <template #body>
      <div v-if="localConstants.length === 0" class="text-center py-10">
        <UIcon
          name="i-lucide-loader-circle"
          class="animate-spin text-2xl text-gray-400"
        />
        <p class="mt-2 text-sm text-gray-500">Loading Configuration...</p>
      </div>

      <div v-else class="space-y-8">
        <div v-for="(group, index) in groupedConstants" :key="group.title">
          <USeparator v-if="index > 0" class="mb-6" />
          <h4 class="text-md font-semibold mb-4">{{ group.title }}</h4>
          <div class="space-y-6">
            <div v-for="constant in group.items" :key="constant.id">
              <UFormField :label="constant.label" :help="constant.help_text">
                <div class="flex items-center gap-2">
                  <!-- --- THIS IS THE FIX: Part 2 --- -->
                  <!-- `<UToggle>` has been replaced with the correct `<USwitch>` component. -->
                  <USwitch
                    v-if="constant.data_type === 'boolean'"
                    v-model="constant.value"
                    class="flex-shrink-0"
                  />
                  <UInput
                    v-else-if="constant.data_type === 'number'"
                    v-model.number="constant.value"
                    type="number"
                    :min="constant.min_value"
                    :max="constant.max_value"
                    class="flex-grow"
                  />
                  <UInput
                    v-else-if="constant.data_type === 'percent'"
                    v-model.number="constant.value"
                    type="number"
                    step="0.01"
                    :min="constant.min_value"
                    :max="constant.max_value"
                    class="flex-grow"
                  />
                  <UInput v-else v-model="constant.value" class="flex-grow" />

                  <UButton
                    v-if="isAdmin"
                    icon="i-heroicons-arrow-path-20-solid"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    :disabled="
                      String(constant.value) === String(constant.default_value)
                    "
                    @click="handleReset(constant.id)"
                  />
                </div>
              </UFormField>
              <p
                v-if="constant.description"
                class="text-xs text-gray-500 dark:text-gray-400 mt-1"
              >
                {{ constant.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          @click="emit('close')"
        />
        <UButton
          label="Save Changes"
          color="primary"
          variant="solid"
          :loading="isSaving"
          :disabled="!isDirty"
          @click="handleSaveChanges"
        />
      </div>
    </template>
  </UModal>
</template>
