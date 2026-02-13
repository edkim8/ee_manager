<!-- File: app/components/monitors/RenewalWorksheetMonitor.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/formatters';
import OfferedSummaryCard from '@/components/summary-cards/OfferedSummaryCard.vue';
import AcceptedSummaryCard from '@/components/summary-cards/AcceptedSummaryCard.vue';
import TermGoalsSummaryCard from '@/components/summary-cards/TermGoalsSummaryCard.vue';

const props = defineProps<{
  worksheet: any;
}>();

const isDraft = computed(() => props.worksheet.status === 'draft');
const isFinal = computed(() => props.worksheet.status === 'final');

// All the data preparation logic is correct and remains unchanged.
const calculatePercent = (numerator: number, denominator: number) => {
  if (!denominator || denominator === 0) return 0;
  return (numerator / denominator) * 100;
};
const createOfferedCardData = (type: 'standard' | 'mtm') => {
  const prefix = type;
  const sources = [
    {
      label: 'AI Rent',
      count: props.worksheet[`${prefix}_source_ai_count`],
      total: props.worksheet[`${prefix}_source_ai_total`],
      current: props.worksheet[`${prefix}_source_ai_current_total`],
    },
    {
      label: 'Max % Rent',
      count: props.worksheet[`${prefix}_source_percent_count`],
      total: props.worksheet[`${prefix}_source_percent_total`],
      current: props.worksheet[`${prefix}_source_percent_current_total`],
    },
    {
      label: 'Custom Rent',
      count: props.worksheet[`${prefix}_source_custom_count`],
      total: props.worksheet[`${prefix}_source_custom_total`],
      current: props.worksheet[`${prefix}_source_custom_current_total`],
    },
  ];
  const totalOffered = sources.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalCurrent = sources.reduce((sum, s) => sum + (s.current || 0), 0);
  const totalDollarIncrease = totalOffered - totalCurrent;
  const mtmTotalOffer = props.worksheet[`${type}_total_mtm_offer`];
  const mtmTotalDollarIncrease = mtmTotalOffer - totalCurrent;
  const mtmAvgIncrease = calculatePercent(mtmTotalDollarIncrease, totalCurrent);
  return {
    title: `${type === 'standard' ? 'Standard Renewals' : 'Month-to-Month'} (${
      props.worksheet[`${prefix}_total`]
    })`,
    sources,
    totalOffered,
    totalCurrent,
    totalDollarIncrease,
    avgIncrease: calculatePercent(totalDollarIncrease, totalCurrent),
    approvedCount: props.worksheet[`${prefix}_approved_count`],
    totalCount: props.worksheet[`${prefix}_total`],
    mtm: {
      totalOffer: mtmTotalOffer,
      totalDollarIncrease: mtmTotalDollarIncrease,
      avgIncrease: mtmAvgIncrease,
    },
  };
};
const standardOfferedData = computed(() => createOfferedCardData('standard'));
const mtmOfferedData = computed(() => createOfferedCardData('mtm'));
const createAcceptedCardData = (type: 'standard' | 'mtm') => {
  const prefix = type;
  const totalOffered = props.worksheet[`${prefix}_total`] || 0;

  const acceptedData = {
    count: props.worksheet[`${prefix}_accepted_count`] || 0,
    totalIncrease:
      (props.worksheet[`${prefix}_accepted_total_rent`] || 0) -
      (props.worksheet[`${prefix}_accepted_current_rent`] || 0),
    avgIncrease: calculatePercent(
      (props.worksheet[`${prefix}_accepted_total_rent`] || 0) -
        (props.worksheet[`${prefix}_accepted_current_rent`] || 0),
      props.worksheet[`${prefix}_accepted_current_rent`]
    ),
  };
  const declinedNoticeData = {
    count: props.worksheet[`${prefix}_declined_notice_count`] || 0,
  };
  const declinedMtmData = {
    count:
      type === 'standard'
        ? props.worksheet.standard_declined_mtm_count || 0
        : 0,
  };
  const pendingData = {
    count: props.worksheet[`${prefix}_pending_count`] || 0,
  };
 
  const declinedOfferData = { 
    count: props.worksheet[`${prefix}_declined_offer_count`] || 0 
  };

  const declinedNotOfferedData = {
    count: props.worksheet[`${prefix}_declined_not_offered_count`] || 0,
  };

  const undecidedCount = Math.max(
    0,
    totalOffered -
      acceptedData.count -
      pendingData.count -
      declinedNoticeData.count -
      declinedMtmData.count -
      declinedOfferData.count
  );

  return {
    title: `${
      type === 'standard' ? 'Standard Renewals' : 'Month-to-Month'
    } (${totalOffered})`,
    undecided: { count: undecidedCount },
    pending: pendingData,
    accepted: acceptedData,
    declined_notice: declinedNoticeData,
    declined_offer: declinedOfferData, 
    declined_not_offered: declinedNotOfferedData,// Pass the new data
    declined_mtm: declinedMtmData,
  };
};
const standardAcceptedData = computed(() => createAcceptedCardData('standard'));
const mtmAcceptedData = computed(() => createAcceptedCardData('mtm'));
const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return '';
  return format(new Date(dateStr + 'T00:00:00'), 'MMM dd, yyyy');
};
const termDisplayString = computed(() => {
  if (!props.worksheet) return '';
  const parts = [];
  const formatTerm = (term: number | null, offset: number | null) => {
    if (!term) return null;
    let part = `${term}m`;
    if (offset) {
      part += ` (${offset > 0 ? '+' : ''}${offset}%)`;
    }
    return part;
  };
  const primary = formatTerm(props.worksheet.primary_term, null);
  const first = formatTerm(
    props.worksheet.first_term,
    props.worksheet.first_term_offset
  );
  const second = formatTerm(
    props.worksheet.second_term,
    props.worksheet.second_term_offset
  );
  const third = formatTerm(
    props.worksheet.third_term,
    props.worksheet.third_term_offset
  );
  if (primary) parts.push(primary);
  if (first) parts.push(first);
  if (second) parts.push(second);
  if (third) parts.push(third);
  return parts.length > 0 ? `Terms: ${parts.join(' | ')}` : '';
});
const discountDisplayString = computed(() => {
  if (
    !props.worksheet?.early_discount ||
    !props.worksheet?.early_discount_date
  ) {
    return '';
  }
  return `Early Bird: ${formatCurrency(
    props.worksheet.early_discount
  )} off by ${formatDisplayDate(props.worksheet.early_discount_date)}`;
});
</script>

<template>
  <UCard
    :class="{
      'bg-primary-50 dark:bg-primary-900/20': worksheet.is_fully_approved,
    }"
  >
    <template #header>
      <!-- --- THIS IS THE UPDATED LAYOUT --- -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div class="col-span-1">
          <!-- --- First Column --- -->
          <!-- --- First line --- -->
          <div class="grid grid-cols-5">
            <div class="col-span-2">
              <h3 class="font-semibold text-lg">{{ worksheet.name }}</h3>
            </div>
            <div class="col-span-2">
              <p class="text-sm text-gray-500">
                {{ formatDisplayDate(worksheet.start_date) }} -
                {{ formatDisplayDate(worksheet.end_date) }}
              </p>
            </div>
            <div class="col-span-1">
              <p class="text-sm text-gray-500 justify-self-end">
                <UBadge
                  v-if="isDraft"
                  size="md"
                  color="warning"
                  variant="subtle"
                  >Draft</UBadge
                >
                <UBadge
                  v-if="isFinal"
                  size="md"
                  color="primary"
                  variant="subtle"
                  >Final</UBadge
                >
              </p>
            </div>
          </div>
          <!-- --- First line --- -->
          <!-- --- Second line --- -->
          <div class="grid grid-cols-2 my-2 gap-4">
            <div class="col-span-1">
              <p
                v-if="termDisplayString"
                class="text-xs text-primary-500 dark:text-primary-400 border px-2 py-0.5 rounded-md"
              >
                {{ termDisplayString }}
              </p>
            </div>
            <div class="col-span-1">
              <p
                v-if="discountDisplayString"
                class="text-xs text-green-600 dark:text-green-400 border border-green-500/50 rounded-md px-2 py-0.5"
              >
                {{ discountDisplayString }}
              </p>
            </div>
          </div>
          <!-- --- Second line --- -->
        </div>
        <!-- --- First Column --- -->
        <!-- --- Second Column --- -->
        <div class="col-span-1">
          <slot name="actions" />
        </div>

        <!-- --- Second Column:--- -->

        <!-- --- END UPDATED LAYOUT --- -->
      </div>
    </template>

    <div v-if="isDraft" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <OfferedSummaryCard :data="standardOfferedData" />
      <OfferedSummaryCard :data="mtmOfferedData" />
    </div>

    <div v-else-if="isFinal" class="space-y-6">
      <div>
        <h4
          class="font-semibold text-gray-700 dark:text-gray-200 border-b pb-1 mb-2"
        >
          Offered Summary
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <OfferedSummaryCard :data="standardOfferedData" />
          <OfferedSummaryCard :data="mtmOfferedData" />
        </div>
      </div>
      <div>
        <h4
          class="font-semibold text-gray-700 dark:text-gray-200 border-b pb-1 mb-2"
        >
          Acceptance Summary
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AcceptedSummaryCard :data="standardAcceptedData" />
          <AcceptedSummaryCard :data="mtmAcceptedData" />
        </div>
      </div>

      <div v-if="worksheet.term_goals">
        <TermGoalsSummaryCard
          :worksheet-id="worksheet.worksheet_id"
          :term-goals="worksheet.term_goals"
          :term-summary="worksheet.term_summary"
        />
      </div>
      <div v-if="worksheet.notes">
        <h4
          class="font-semibold text-gray-700 dark:text-gray-200 border-b pb-1 mb-2"
        >
          Worksheet Notes
        </h4>
        <div
          class="text-xs p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md"
        >
          <pre class="whitespace-pre-wrap font-sans">{{ worksheet.notes }}</pre>
        </div>
      </div>
    </div>
  </UCard>
</template>
