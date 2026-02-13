<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import type { Form } from '#ui/types';
import { useFetch } from '#imports';
import { capitalize } from '@/utils/formatters';

const props = defineProps<{
  worksheetId: number;
}>();

const emit = defineEmits(['close']);
const form = ref<Form<any> | null>(null);

const state = reactive({
  selectedItem: undefined as number | undefined,
  // This can now be a number (term) or a string (status)
  selectedAction: undefined as number | string | undefined,
});

const { data: worksheet, pending: isLoading } = useFetch(
  () => `/api/renewals/worksheets/${props.worksheetId}`
);

const unitOptions = computed(() => {
  if (!worksheet.value?.renewal_worksheet_items) return [];
  return worksheet.value.renewal_worksheet_items
    .filter((item: any) => item.status !== 'accepted')
    // Add the sort method before mapping
    .sort((a: any, b: any) => {
      // Prioritize 'standard' renewals
      if (a.renewal_type === 'standard' && b.renewal_type === 'mtm') {
        return -1; // a comes first
      }
      if (a.renewal_type === 'mtm' && b.renewal_type === 'standard') {
        return 1; // b comes first
      }
      // If renewal types are the same, sort by unit number
      return (a.unit || '').localeCompare(b.unit || '');
    })
    .map((item: any) => ({
      label: `Unit ${item.unit} - ${item.resident_name} (${capitalize(
        item.status
      )})`,
      value: item.item_id,
    }));
});

// The options now include the new "reset" actions (Unchanged and correct)
const actionOptions = computed(() => {
  if (!worksheet.value) return [];
  const ws = worksheet.value;
  
  const actions = [];

   // Pending Term options
  if (ws.primary_term) actions.push({ label: `Pending: ${ws.primary_term} Months`, value: ws.primary_term });
  if (ws.first_term) actions.push({ label: `Pending: ${ws.first_term} Months`, value: ws.first_term });
  if (ws.second_term) actions.push({ label: `Pending: ${ws.second_term} Months`, value: ws.second_term });
  if (ws.third_term) actions.push({ label: `Pending: ${ws.third_term} Months`, value: ws.third_term });

  actions.push({ type: 'separator' });
 // Accept action
  actions.push({ label: 'Accept (Manual Set)', value: 'accepted_set' });
 
  actions.push({ type: 'separator' });
 // Decline options
  actions.push({ label: 'Decline (Not Offered)', value: 'declined_not_offered' });
  actions.push({ label: 'Decline (Gave Notice)', value: 'declined_notice' });
  actions.push({ label: 'Decline (Offer Only - MTM)', value: 'declined_offer' });
  
  actions.push({ type: 'separator' });
// Reset State options
  actions.push({ label: 'Reset to: In Process', value: 'inProcess' });
  actions.push({ label: 'Reset to: Approved', value: 'approved' });
  actions.push({ label: 'Reset to: Offered', value: 'offered' });

 

  return actions;
});

function handleSubmit() {
  if (!state.selectedItem || !state.selectedAction) return;

  // 1. Defensively extract the primitive value from the selected unit item.
  const itemId = typeof state.selectedItem === 'object' 
    ? (state.selectedItem as any).value 
    : state.selectedItem;

  // 2. Defensively extract the primitive value from the selected action.
  const selectedActionValue = typeof state.selectedAction === 'object' 
    ? (state.selectedAction as any).value 
    : state.selectedAction;

  let payload;

  if (typeof selectedActionValue === 'number') {
    // It's a term for a 'pending' status
    payload = {
      item_id: itemId,
      status: 'pending',
      accepted_term: selectedActionValue,
    };
  } else {
    // It's a string status ('inProcess', 'declined_notice', etc.)
    payload = {
      item_id: itemId,
      status: selectedActionValue,
      accepted_term: null,
    };
  }
  
  emit('close', payload);
}
</script>

<template>
  <UModal>
    <template #header>
      <h3 class="text-base font-semibold">Update Renewal Status</h3>
    </template>

    <template #body>
      <div v-if="isLoading" class="text-center py-10">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl" />
        <p class="mt-2 text-sm text-gray-500">Loading worksheet data...</p>
      </div>
      <UForm v-else :state="state" @submit="handleSubmit" class="space-y-4">
        
        <UFormField label="Select Unit" name="selectedItem" required>
          <USelectMenu
            v-model="state.selectedItem"
            :items="unitOptions"
            value-attribute="value"
            option-attribute="label"
            placeholder="Select a unit..."
            searchable
            class="w-96"
          />
        </UFormField>
        
        <UFormField v-if="state.selectedItem" label="Select Action" name="selectedAction" required>
          <USelectMenu
            v-model="state.selectedAction"
            :items="actionOptions"
            value-attribute="value"
            option-attribute="label"
            placeholder="Select an action..."
            class="w-58"
          >
            <!-- This template handles the separator in the dropdown -->
            <template #option="{ item }">
              <div v-if="item.type === 'separator'" class="border-t border-gray-200 dark:border-gray-800 -mx-1 my-1" />
              <span v-else>{{ item.label }}</span>
            </template>
          </USelectMenu>
        </UFormField>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 pt-4">
          <UButton @click="$emit('close', null)" color="gray" variant="outline">Cancel</UButton>
          <UButton type="submit" label="Save Status" :disabled="!state.selectedItem || !state.selectedAction" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>

