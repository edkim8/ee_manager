import { ref } from 'vue';
import { useToastHelpers } from '@/composables/useToastHelpers';

/**
 * A composable that provides a function to trigger the download of a
 * worksheet Excel file from the server.
 */
export function useWorksheetExport() {
  const loading = ref(false);
  const { toastError, toastSuccess } = useToastHelpers();

  const exportToExcel = async (worksheetId: number, filename: string) => {
    loading.value = true;
    try {
      // 1. We tell $fetch to expect a 'blob' response, not JSON.
      // This correctly handles the binary file data from the server.
      const blob = await $fetch(`/api/renewals/worksheets/${worksheetId}/export`, {
        responseType: 'blob',
      });

      // 2. Create a temporary, invisible link in the browser.
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.xlsx`; // Use the dynamic filename passed from the page
      document.body.appendChild(a);

      // 3. Programmatically "click" the link to trigger the browser's download prompt.
      a.click();

      // 4. Clean up by removing the temporary link.
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toastSuccess({ title: 'Export Started', description: 'Your file is downloading.' });

    } catch (error: any) {
      console.error('Error exporting worksheet:', error);
      toastError({
        title: 'Export Failed',
        description: error.data?.message || 'Could not generate the Excel file.',
      });
    } finally {
      loading.value = false;
    }
  };

  return { exportToExcel, loading };
}

