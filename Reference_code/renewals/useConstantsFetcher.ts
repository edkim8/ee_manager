// File: app/composables/fetchers/constants/useConstantsFetcher.ts
// Description: A simple, reusable composable for fetching application constants.

import { computed, type Ref } from 'vue';
import { useFetch } from '#imports';
import type { AppConstant } from '@/types/constants';

interface UseConstantsFetcherOptions {
  category: Ref<string | string[]>;
  aptCode: Ref<string | null>;
}

export function useConstantsFetcher({
  category,
  aptCode,
}: UseConstantsFetcherOptions) {
  // This computed URL will automatically trigger a re-fetch if the aptCode or category changes.
  const reactiveUrl = computed(() => {
    if (!aptCode.value) return null; // Prevent fetching if no property is selected
    return `/api/constants?category=${category.value}&apt_code=${aptCode.value}`;
  });

  // Use Nuxt's built-in `useFetch` for efficient, SSR-aware data fetching.
  const {
    data: constants,
    pending: isLoading,
    error,
    refresh, // The function to manually re-fetch the data
  } = useFetch<AppConstant[]>(reactiveUrl, {
    default: () => [], // Provide a default empty array to prevent errors
  });

  return {
    constants,
    isLoading,
    error,
    refresh,
  };
}
