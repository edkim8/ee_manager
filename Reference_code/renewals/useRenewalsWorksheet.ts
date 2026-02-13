import { ref, watch, type Ref } from 'vue';
import type { RenewalListItem } from '@/types/renewals';
import type { AppConstant } from '@/types/constants';

/**
 * A composable that encapsulates all the complex state and calculation logic
 * for the interactive renewals worksheet, supporting both standard and MTM renewals.
 */
export function useRenewalsWorksheet(
  sourceData: Ref<RenewalListItem[] | null>,
  renewalModel: Ref<AppConstant[] | null>,
  maxRentPercent: Ref<number>,
  mtmFee: Ref<number>,
  mtmMaxPercent: Ref<number>,
  aptCode: Ref<string | null>
) {
  // --- STATE ---
  const standardRenewals = ref<RenewalListItem[]>([]);
  const mtmRenewals = ref<RenewalListItem[]>([]);
  const isWorksheetDirty = ref(false);

   // --- HELPER to get constant values ---
  const getConstantValue = (key: string, defaultValue: number) => {
    const constant = renewalModel.value?.find((c) => c.key === key);
    return constant ? parseFloat(constant.value) : defaultValue;
  };

  // --- DATA FETCHING for Availability Pressure ---
  const soonDays = computed(() => getConstantValue('renewal_expiring_soon_days', 60));
  const upcomingDays = computed(() => getConstantValue('renewal_upcoming_window_days', 120));

  const { data: availabilityPressureData } = useFetch(
    () => {
      // 1. Defensively check that ALL required data is available before building the URL.
      if (!aptCode.value || !renewalModel.value) {
        return null;
      }
      // 2. It is now safe to access the computed properties.
      return `/api/renewals/availability-pressure?apt_code=${aptCode.value}&soon_days=${soonDays.value}&upcoming_days=${upcomingDays.value}`;
    },
    { 
      // 3. We now watch the source refs. The fetch will run when they are populated.
      watch: [aptCode, renewalModel],
      default: () => ({})
    }
  );

  // --- CALCULATION ENGINE ---
  const calculateWorksheetRow = (lease: RenewalListItem): RenewalListItem => {
    if (!renewalModel.value || renewalModel.value.length === 0) {
      return {
        ...lease,
        approved: lease.approved ?? false,
        rent_offer_source: lease.rent_offer_source ?? 'ai_rent',
      };
    }
// --- NEW "DYNAMIC AVAILABILITY PRESSURE" MODEL ---
    const baseLtlCapture = getConstantValue('base_ltl_capture_percentage', 70) / 100;
    const adjustmentFactor = getConstantValue('renewal_availability_adjustment', 10);
    
    const pressure = availabilityPressureData.value[lease.unit_type] || { current_available: 0, expiring_soon: 0, expiring_upcoming: 0, total_units: 1 };
    
    // 1. Calculate Weighted Vacancy
    const weightedVacancy = 
      (pressure.current_available * 1.0) +
      (pressure.expiring_soon * 0.5) +
      (pressure.expiring_upcoming * 0.25);
      
    // 2. Calculate Availability Pressure Ratio
    const availabilityPressureRatio = pressure.total_units > 0 ? weightedVacancy / pressure.total_units : 0;
     
    // --- [DEBUG] ---
    console.log(`[RENEWAL MODEL DEBUG] Unit: ${lease.unit_code} | Type: ${lease.unit_type}`);
    console.log(`  - Pressure Data:`, pressure);
    console.log(`  - Weighted Vacancy: ${weightedVacancy}`);
    console.log(`  - Total Units: ${pressure.total_units}`);
    console.log(`  - Availability Pressure Ratio: ${availabilityPressureRatio.toFixed(4)}`);
    // --- [END DEBUG] ---
    // 3. Calculate the Final LTL Capture Rate (ensuring it doesn't go below 0)
    // Your new formula: Base * (1 - (Pressure / Adjustment))
    const finalLtlCaptureRate = Math.max(0, baseLtlCapture * (1 - (availabilityPressureRatio / adjustmentFactor)));
    
    // 4. Calculate the Target Increase
    const ltl = (lease.market_rent || 0) - (lease.lease_rent || 0);
    const targetIncrease = ltl * finalLtlCaptureRate;
    const proposedRent = (lease.lease_rent || 0) + targetIncrease;
    // --- END NEW MODEL ---
    const maxIncreaseDecimal = maxRentPercent.value / 100;
    const maxAllowedRent = (lease.lease_rent || 0) * (1 + maxIncreaseDecimal);
    const live_ai_rent = Math.round(Math.min(proposedRent, maxAllowedRent));
    const saved_ai_rent = lease.ai_rent ?? live_ai_rent;

    // --- Standard Calculations ---
    const percent_rent = Math.round(
      (lease.lease_rent || 0) * (1 + maxIncreaseDecimal)
    );

    let final_rent: number;
    switch (lease.rent_offer_source) {
      case 'percent_rent':
        final_rent = percent_rent;
        break;
      case 'custom_rent':
        final_rent = (lease.lease_rent || 0) + (lease.custom_rent || 0);
        break;
      case 'live_ai_rent':
        final_rent = live_ai_rent;
        break;
      default:
        final_rent = lease.ai_rent || live_ai_rent;
    }
    const final_rent_percent = lease.lease_rent
      ? final_rent / lease.lease_rent - 1
      : 0;
    const ai_percent = lease.lease_rent
      ? live_ai_rent / lease.lease_rent - 1
      : 0;

    // --- Hybrid MTM Calculation ---
    let calculatedMtmRent: number;
    const isCaProperty = ['WO', 'CV', 'OB'].includes(lease.apt_code);

    if (isCaProperty) {
      // For CA properties, the mtm_rent comes pre-calculated from the API.
      calculatedMtmRent = lease.mtm_rent || 0;
    } else {
      // For non-CA properties, we do the simple calculation on the client.
      calculatedMtmRent = (lease.market_rent || 0) + mtmFee.value;
    }
    const mtm_rent = Math.round(calculatedMtmRent);
    const mtm_percent_increase =
      lease.lease_rent && mtm_rent ? mtm_rent / lease.lease_rent - 1 : 0;

    return {
      ...lease,
      renewal_type: lease.renewal_type,
      ltl,
      live_ai_rent,
      ai_rent: saved_ai_rent,
      ai_percent,
      percent_rent,
      final_rent,
      final_rent_percent,
      mtm_rent,
      mtm_percent_increase,
      approved: lease.approved ?? false,
      rent_offer_source: lease.rent_offer_source ?? 'ai_rent',
    };
  };

  const reprocessAndSplitData = (dataToProcess: RenewalListItem[]) => {
    if (!dataToProcess) {
      standardRenewals.value = [];
      mtmRenewals.value = [];
      return;
    }
    const allItems = dataToProcess.map((lease) => calculateWorksheetRow(lease));

  
    standardRenewals.value = allItems.filter(
      (item) => item.renewal_type === 'standard'
    );
    mtmRenewals.value = allItems.filter((item) => item.renewal_type === 'mtm');
  };

  // --- REACTIVITY ---
  // The watcher now correctly depends on all interactive parameters.
  watch(
    [sourceData, renewalModel, maxRentPercent, mtmFee, mtmMaxPercent],
    ([newSourceData, newModel]) => {
      if (!newSourceData || !newModel || newModel.length === 0) {
        standardRenewals.value = [];
        mtmRenewals.value = [];
        return;
      }
      reprocessAndSplitData(newSourceData);
    },
    { deep: true, immediate: true }
  );

  // --- INTERACTIVE HANDLERS ---
  const updateWorksheetItem = (
    leaseId: number,
    updates: Partial<RenewalListItem>
  ) => {
    const updateList = (list: Ref<RenewalListItem[]>) => {
      const index = list.value.findIndex((l) => l.lease_id === leaseId);
      if (index !== -1) {
        const updatedLease = { ...list.value[index], ...updates };
        list.value[index] = calculateWorksheetRow(updatedLease);
        isWorksheetDirty.value = true;
      }
    };
    updateList(standardRenewals);
    updateList(mtmRenewals);
  };

  const handleCommentChange = (
    leaseId: number,
    newComments: { comment: string | null; approver_comment: string | null }
  ) => {
    updateWorksheetItem(leaseId, {
      comment: newComments.comment,
      approver_comment: newComments.approver_comment,
    });
  };
  const handleRentSourceChange = (leaseId: number, source: string) =>
    updateWorksheetItem(leaseId, { rent_offer_source: source });
  const handleCustomRentChange = (
    leaseId: number,
    increaseAmount: number | null
  ) =>
    updateWorksheetItem(leaseId, {
      custom_rent: increaseAmount,
      rent_offer_source: 'custom_rent',
    });
  const handleAiRentUpdate = (leaseId: number) => {
    const allItems = [...standardRenewals.value, ...mtmRenewals.value];
    const leaseToUpdate = allItems.find((l) => l.lease_id === leaseId);
    if (leaseToUpdate) {
      updateWorksheetItem(leaseId, {
        ai_rent: leaseToUpdate.live_ai_rent,
        rent_offer_source: 'ai_rent',
      });
    }
  };
  const handleApprovalChange = (leaseId: number, isApproved: boolean) =>
    updateWorksheetItem(leaseId, { approved: isApproved });
  const handleToggleApproveAll = () => {
    const allItems = [...standardRenewals.value, ...mtmRenewals.value];
    const areAllCurrentlyApproved =
      allItems.length > 0 && allItems.every((lease) => lease.approved);
    const newState = !areAllCurrentlyApproved;

    const approveList = (list: Ref<RenewalListItem[]>) => {
      list.value = list.value.map((lease) => ({
        ...lease,
        approved: newState,
      }));
    };
    approveList(standardRenewals);
    approveList(mtmRenewals);
    isWorksheetDirty.value = true;
  };

  // --- RETURN VALUES ---
  return {
    standardRenewals,
    mtmRenewals,
    isWorksheetDirty,
    handleRentSourceChange,
    handleCustomRentChange,
    handleAiRentUpdate,
    handleApprovalChange,
    handleToggleApproveAll,
    handleCommentChange,
  };
}
