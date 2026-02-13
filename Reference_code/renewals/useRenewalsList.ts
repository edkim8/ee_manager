import { computed, watch, type Ref } from 'vue';
import { useFetch, useCookie } from '#imports';
import type { RenewalListItem } from '@/types/renewals';
import { useRenewalsStore } from '@/stores/useRenewalsStore';

interface RenewalsListOptions {
  startDate: Ref<string>;
  endDate: Ref<string>;
  mtmFee: Ref<number>;
  mtmCap: Ref<number>;
}

export function useRenewalsList({
  startDate,
  endDate,
  mtmFee,
  mtmCap,
}: RenewalsListOptions) {
  const store = useRenewalsStore();
  const selectedPropertyCookie = useCookie<string | null>('selected');

  const reactiveUrl = computed(() => {
    const aptCode = selectedPropertyCookie.value;
    // --- THIS IS THE DEBUG STEP ---
    // This log shows us the exact values being used to build the URL.
    console.log('[Fetcher DEBUG] reactiveUrl is recalculating with dates:', {
      start: startDate.value,
      end: endDate.value,
    });

    if (!aptCode || !startDate.value || !endDate.value) {
      return null;
    }
    return `/api/renewals?apt_code=${aptCode}&start_date=${startDate.value}&end_date=${endDate.value}&mtm_fee=${mtmFee.value}&mtm_cap=${mtmCap.value}`;
  });

  // 1. We destructure 'execute' and set 'immediate: false' to take full control.
  const { data, pending, error, execute } = useFetch<RenewalListItem[]>(
    reactiveUrl,
    {
      immediate: false,
      default: () => [],
    }
  );

  // 2. This explicit watcher is the key. It monitors the reactive URL.
  watch(
    reactiveUrl,
    (newUrl) => {
      if (newUrl) {
        // When the URL changes, it manually executes the fetch with the new URL.
        execute();
      }
    },
    { immediate: true }
  ); // immediate:true ensures it runs once on load.

  // 3. This watcher syncs the result to the store.
  watch(data, (newData) => {
    store.setRenewalsListStore(newData, error.value);
  });

  return { data, pending, error, refresh: execute }; // Return 'execute' as 'refresh'
}
