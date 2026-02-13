// File: app/composables/fetchers/renewals/useMtmList.ts

import { watchEffect, computed, type Ref } from 'vue';
import { useRenewalsStore } from '@/stores/useRenewalsStore';
import type { RenewalListItem } from '@/types/renewals';

// The fetcher now accepts all three dynamic MTM parameters
interface MtmListOptions {
  mtmFee: Ref<number>;
  mtmCap: Ref<number>;
  mtmOfferFrequencyDays: Ref<number>;
}

export function useMtmList({
  mtmFee,
  mtmCap,
  mtmOfferFrequencyDays,
}: MtmListOptions) {
  const store = useRenewalsStore();
  const selectedPropertyCookie = useCookie<string | null>('selected');

  const reactiveUrl = computed(() => {
    const aptCode = selectedPropertyCookie.value;
    if (!aptCode) return null;

    // Add all three MTM parameters to the URL query string
    return `/api/renewals/mtm?apt_code=${aptCode}&mtm_fee=${mtmFee.value}&mtm_cap=${mtmCap.value}&mtm_offer_frequency_days=${mtmOfferFrequencyDays.value}`;
  });

  const { data, pending, error, refresh } = useFetch<RenewalListItem[]>(
    reactiveUrl,
    {
      default: () => [],
    }
  );

  watchEffect(() => {
    store.setMtmListStore(data.value, error.value);
  });

  return { data, pending, error, refresh };
}
