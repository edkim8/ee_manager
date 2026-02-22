// app/components/CalendarWidget.vue

<script setup lang="ts">
import { ref, computed } from 'vue';

// Use a ref to hold the date that the calendar is currently displaying.
// It defaults to the current date.
const displayDate = ref(new Date());

/**
 * A computed property that returns a formatted string for the header,
 * like "June 2025".
 */
const monthYearHeader = computed(() => {
  return displayDate.value.toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
});

/**
 * This is the core logic of the calendar.
 * It generates an array of 42 day objects to fill the 6x7 grid.
 * It includes days from the previous and next months to complete the weeks.
 */
const calendarGrid = computed(() => {
  const year = displayDate.value.getFullYear();
  const month = displayDate.value.getMonth();

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today's date

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Get the starting day of the week (0 for Sunday, 1 for Monday, etc.)
  const startDayOfWeek = firstDayOfMonth.getDay();

  const days = [];

  // --- 1. Add days from the previous month ---
  const prevMonthLastDay = new Date(year, month, 0);
  for (let i = startDayOfWeek; i > 0; i--) {
    const day = new Date(prevMonthLastDay);
    day.setDate(prevMonthLastDay.getDate() - i + 1);
    days.push({ date: day, isCurrentMonth: false, isToday: false });
  }

  // --- 2. Add days for the current month ---
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const date = new Date(year, month, day);
    const isToday = date.getTime() === today.getTime();
    days.push({ date, isCurrentMonth: true, isToday });
  }

  // --- 3. Add days from the next month to fill the grid ---
  const nextMonthFirstDay = new Date(year, month + 1, 1);
  const remainingCells = 42 - days.length; // 6 weeks * 7 days
  for (let i = 1; i <= remainingCells; i++) {
    const day = new Date(nextMonthFirstDay);
    day.setDate(nextMonthFirstDay.getDate() + i - 1);
    days.push({ date: day, isCurrentMonth: false, isToday: false });
  }

  return days;
});

/**
 * Navigates to the previous month.
 */
const prevMonth = () => {
  displayDate.value = new Date(
    displayDate.value.setMonth(displayDate.value.getMonth() - 1)
  );
};

/**
 * Navigates to the next month.
 */
const nextMonth = () => {
  displayDate.value = new Date(
    displayDate.value.setMonth(displayDate.value.getMonth() + 1)
  );
};
</script>

<template>
  <div
    class="w-[350px] h-[350px] max-w-sm bg-white p-4 sm:p-5 rounded-2xl shadow-lg dark:bg-gray-800"
  >
    <!-- Calendar Header -->
    <div class="flex items-center justify-between mb-4">
      <UButton
        icon="i-heroicons-chevron-left-20-solid"
        color="neutral"
        variant="ghost"
        @click="prevMonth"
        aria-label="Previous month"
      />
      <h2
        class="text-lg font-semibold text-gray-800 dark:text-gray-100 text-center"
      >
        {{ monthYearHeader }}
      </h2>
      <UButton
        icon="i-heroicons-chevron-right-20-solid"
        color="neutral"
        variant="ghost"
        @click="nextMonth"
        aria-label="Next month"
      />
    </div>

    <!-- Weekday Headers -->
    <div
      class="grid grid-cols-7 text-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-2"
    >
      <div
        v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']"
        :key="day"
      >
        {{ day }}
      </div>
    </div>

    <!-- Calendar Days Grid -->
    <div class="grid grid-cols-7">
      <div
        v-for="(day, index) in calendarGrid"
        :key="index"
        class="h-10 flex items-center justify-center"
      >
        <button
          :class="[
            'size-8 flex items-center justify-center rounded-full transition-colors',
            {
              'text-gray-900 dark:text-white': day.isCurrentMonth,
              'text-gray-400 dark:text-gray-500': !day.isCurrentMonth,
            },
            {
              'bg-primary-500 text-white font-bold hover:bg-primary-600':
                day.isToday,
              'hover:bg-gray-100 dark:hover:bg-gray-700': !day.isToday,
            },
          ]"
        >
          {{ day.date.getDate() }}
        </button>
      </div>
    </div>
  </div>
</template>
