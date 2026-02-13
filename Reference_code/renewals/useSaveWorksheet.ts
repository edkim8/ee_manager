// File: app/composables/mutations/renewals/useSaveWorksheet.ts

import { ref } from 'vue';
import { useToastHelpers } from '@/composables/useToastHelpers';
import type { RenewalWorksheetWithItems } from '@/types/renewals';

export function useSaveWorksheet() {
  const { toastSuccess, toastError } = useToastHelpers();
  const loading = ref(false);

  const saveWorksheet = async (
    payload: any,
    worksheetId?: string
  ): Promise<RenewalWorksheetWithItems | null> => {
    loading.value = true;
    try {
      // Always call the same POST endpoint
      const result = await $fetch<RenewalWorksheetWithItems>(
        '/api/renewals/worksheets',
        {
          method: 'POST',
          // Pass the worksheetId inside the body
          body: { ...payload, worksheetId },
        }
      );

      toastSuccess({
        title: 'Success',
        description: `Worksheet has been saved.`,
      });
      return result;
    } catch (err: any) {
      toastError({
        title: 'Error',
        description: err.data?.message || 'Failed to save worksheet.',
      });
      return null;
    } finally {
      loading.value = false;
    }
  };

  return { saveWorksheet, loading };
}
