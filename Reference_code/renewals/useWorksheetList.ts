// File: app/composables/fetchers/renewals/useWorksheetList.ts
import { computed, ref, type Ref } from 'vue';
import { useFetch, useCookie } from '#imports';
import type { RenewalWorksheet } from '@/types/renewals';

// 1. Define the shape of the new paginated response from the API
interface WorksheetListResponse {
  worksheets: RenewalWorksheet[];
  total: number;
}

/**
 * A composable to fetch a paginated list of renewal worksheets.
 * @param options - An object containing reactive refs for filters and pagination.
 */
export function useWorksheetList(options: {
  showArchived: Ref<boolean>;
  page: Ref<number>;
  limit: Ref<number>;
}) {
  const selectedPropertyCookie = useCookie<string | null>('selected');

  // 2. The URL now includes all parameters: archived filter, page, and limit.
  //    useFetch will automatically re-run whenever any of these change.
  const reactiveUrl = computed(() => {
    const aptCode = selectedPropertyCookie.value;
    if (!aptCode) return null;
    return `/api/renewals/worksheets?apt_code=${aptCode}&include_archived=${options.showArchived.value}&page=${options.page.value}&limit=${options.limit.value}`;
  });

  const { data, pending, error, refresh } = useFetch<WorksheetListResponse>(
    reactiveUrl,
    {
      default: () => ({ worksheets: [], total: 0 }),
    }
  );

  // 3. Expose the worksheets list and the total count as separate computed properties
  //    for easier use on the page.
  const worksheets = computed(() => data.value?.worksheets || []);
  const total = computed(() => data.value?.total || 0);

  return { worksheets, total, pending, error, refresh };
}
