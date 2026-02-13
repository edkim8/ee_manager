// File: app/stores/useRenewalsStore.ts

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { RenewalListItem } from '@/types/renewals';

// 1. Define the shape of the settings object for creating a new worksheet.
interface NewWorksheetSettings {
  startDate: string;
  endDate: string;
  mtmOfferFrequencyDays: number;
}

export const useRenewalsStore = defineStore(
  'renewals',
  () => {
    // --- STATE ---
    const renewalsList = ref<RenewalListItem[] | null>(null);
    const mtmList = ref<RenewalListItem[] | null>(null);
    const error = ref<any | null>(null);
    // Add the state to hold temporary settings
    const newWorksheetSettings = ref<NewWorksheetSettings | null>(null);

    // --- ACTIONS ---
    const getErrorMessage = (error: any): string => {
      return (
        error?.data?.message || error?.message || 'An unknown error occurred.'
      );
    };

    const setRenewalsListStore = (
      data: RenewalListItem[] | null,
      errorData?: any | null
    ) => {
      renewalsList.value = data || [];
      error.value = errorData ? getErrorMessage(errorData) : null;
    };

    const setMtmListStore = (
      data: RenewalListItem[] | null,
      errorData?: any | null
    ) => {
      mtmList.value = data || [];
      error.value = errorData ? getErrorMessage(errorData) : null;
    };

    // Add the actions to manage the temporary settings
    function setNewWorksheetSettings(settings: NewWorksheetSettings) {
      newWorksheetSettings.value = settings;
    }

    // This function retrieves the settings and then clears them to prevent reuse.
    function getNewWorksheetSettings() {
      const value = newWorksheetSettings.value;
      newWorksheetSettings.value = null;
      return value;
    }

    return {
      renewalsList,
      mtmList,
      error,
      newWorksheetSettings,
      setRenewalsListStore,
      setMtmListStore,
      setNewWorksheetSettings,
      getNewWorksheetSettings,
    };
  },
  {
    // 2. Configure persistence for this store.
    persist: {
      storage: 'cookies',
      paths: ['newWorksheetSettings'],
    },
  }
);
