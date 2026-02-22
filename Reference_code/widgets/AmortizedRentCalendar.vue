// File: app/components/widgets/AmortizedRentCalendar.vue

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useFormatters } from '@/composables/useFormatters';

const props = defineProps({
  availableDate: {
    type: [String, Date],
    required: true,
  },
  rent: {
    type: Number,
    required: true,
  },
  term: {
    type: Number,
    default: 12,
  },
  hold: {
    type: Number,
    default: 7,
  },
});

const { formatCurrency } = useFormatters();
// We still use a local Date object for display, which is fine.
const displayDate = ref(
  new Date(props.availableDate.split('T')[0].replace(/-/g, '/'))
);

// --- Date Calculations (REBUILT WITH UTC) ---

const availableDateObj = computed(() => {
  // 1. Get today's date at the start of the day in UTC.
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  // 2. Parse the incoming prop date string as UTC.
  // The 'T00:00:00Z' ensures it's interpreted as midnight UTC, avoiding timezone shifts.
  const propDateString = props.availableDate.split('T')[0];
  const propDate = new Date(`${propDateString}T00:00:00Z`);

  // 3. Compare the dates and return the later of the two.
  // This correctly handles the "start from today" logic.
  if (propDate < today) {
    return today;
  }
  return propDate;
});

const holdPeriodEndDate = computed(() => {
  // Calculations are now based on the reliable UTC date object.
  const d = new Date(availableDateObj.value);
  d.setUTCDate(d.getUTCDate() + props.hold);
  return d;
});

// --- Core Calculation Logic (No changes needed, getTime() is timezone-independent) ---
const calculateAmortizedRent = (moveInDate: Date) => {
  const dailyRent = props.rent / 30.42;
  const totalLeaseDays = props.term * 30.42;
  const lostDaysMs = moveInDate.getTime() - holdPeriodEndDate.value.getTime();
  const lostDays = Math.max(0, lostDaysMs / (1000 * 60 * 60 * 24));
  const totalLostRent = lostDays * dailyRent;
  const dailyAmortization = totalLostRent / totalLeaseDays;
  const newDailyRent = dailyRent + dailyAmortization;
  return newDailyRent * 30.42;
};

// --- Calendar Grid Generation (REBUILT WITH UTC) ---
const calendarGrid = computed(() => {
  const year = displayDate.value.getUTCFullYear();
  const month = displayDate.value.getUTCMonth();
  const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0));
  const startDayOfWeek = firstDayOfMonth.getUTCDay();

  const days = [];

  const prevMonthLastDay = new Date(Date.UTC(year, month, 0));
  for (let i = startDayOfWeek; i > 0; i--) {
    const day = new Date(prevMonthLastDay);
    day.setUTCDate(prevMonthLastDay.getUTCDate() - i + 1);
    days.push({ date: day, rent: null, status: 'other-month' });
  }

  for (let i = 1; i <= lastDayOfMonth.getUTCDate(); i++) {
    const date = new Date(Date.UTC(year, month, i));
    let rent = null;
    let status = 'unavailable';

    if (date >= availableDateObj.value) {
      if (date <= holdPeriodEndDate.value) {
        status = 'hold-period';
        rent = props.rent;
      } else {
        status = 'amortized';
        rent = calculateAmortizedRent(date);
      }
    }
    days.push({ date, rent, status });
  }

  return days;
});

// --- Navigation ---
const monthYearHeader = computed(() =>
  // Use UTC timezone for display to match our calculations
  displayDate.value.toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
);
const prevMonth = () => {
  const d = new Date(displayDate.value);
  d.setUTCMonth(d.getUTCMonth() - 1);
  displayDate.value = d;
};
const nextMonth = () => {
  const d = new Date(displayDate.value);
  d.setUTCMonth(d.getUTCMonth() + 1);
  displayDate.value = d;
};
</script>

<template>
  <div class="w-full flex flex-col h-full">
    <div class="flex items-center justify-between mb-2">
      <UButton
        icon="i-heroicons-chevron-left-20-solid"
        color="neutral"
        variant="ghost"
        @click="prevMonth"
      />
      <h3 class="text-base font-semibold text-gray-800 dark:text-gray-100">
        {{ monthYearHeader }}
      </h3>
      <UButton
        icon="i-heroicons-chevron-right-20-solid"
        color="neutral"
        variant="ghost"
        @click="nextMonth"
      />
    </div>

    <div class="grid grid-cols-7 text-center text-xs font-medium text-gray-400">
      <div v-for="day in ['S', 'M', 'T', 'W', 'T', 'F', 'S']" :key="day">
        {{ day }}
      </div>
    </div>

    <div class="grid grid-cols-7 flex-grow">
      <div
        v-for="(day, index) in calendarGrid"
        :key="index"
        :class="[
          'border-t border-gray-200 dark:border-gray-700 p-1 flex flex-col',
          { 'bg-green-50 dark:bg-green-900/20': day.status === 'hold-period' },
          { 'bg-orange-50 dark:bg-orange-900/20': day.status === 'amortized' },
        ]"
      >
        <span
          :class="[
            'font-medium text-xs',
            {
              'text-gray-900 dark:text-white': day.status !== 'other-month',
              'text-gray-400 dark:text-gray-600': day.status === 'other-month',
            },
          ]"
        >
          {{ day.date.getDate() }}
        </span>
        <div
          v-if="day.rent"
          class="text-sm mt-1 font-semibold"
          :class="
            day.status === 'amortized'
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-green-600 dark:text-green-400'
          "
        >
          {{ formatCurrency(day.rent) }}
        </div>
      </div>
    </div>
  </div>
</template>
