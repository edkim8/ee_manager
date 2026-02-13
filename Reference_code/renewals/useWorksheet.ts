import { computed, watch, ref, onMounted, type Ref } from 'vue';
import type { RenewalWorksheetWithItems } from '@/types/renewals';

export function useWorksheet(worksheetId: Ref<string>) {
  const reactiveUrl = computed(() => {
    const id = parseInt(worksheetId.value, 10);
    if (!isNaN(id) && id > 0) {
      return `/api/renewals/worksheets/${id}`;
    }
    return null;
  });

  // --- THIS IS THE FIX ---
  // We will manage the state manually to control the fetch timing.
  const data = ref<RenewalWorksheetWithItems | null>(null);
  const pending = ref(false);
  const error = ref<any | null>(null);

  const executeFetch = async () => {
    if (!reactiveUrl.value) {
      data.value = null;
      return;
    }
    pending.value = true;
    error.value = null;
    try {
      const result = await $fetch<RenewalWorksheetWithItems>(reactiveUrl.value);
      data.value = result;
    } catch (e) {
      error.value = e;
    } finally {
      pending.value = false;
    }
  };

  // Only run the fetch on the client after the component has mounted.
  onMounted(() => {
    executeFetch();
  });

  // Also, re-fetch if the ID changes (e.g., navigating between worksheets)
  watch(worksheetId, () => {
    executeFetch();
  });

  return { data, pending, error, refresh: executeFetch };
}
