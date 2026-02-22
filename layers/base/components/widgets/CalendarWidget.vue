<script setup lang="ts">
const displayDate = ref(new Date())

const monthYearHeader = computed(() =>
  displayDate.value.toLocaleString('en-US', { month: 'long', year: 'numeric' })
)

const calendarGrid = computed(() => {
  const year = displayDate.value.getFullYear()
  const month = displayDate.value.getMonth()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const startDayOfWeek = firstDayOfMonth.getDay()

  const days: { date: Date; isCurrentMonth: boolean; isToday: boolean }[] = []

  const prevMonthLastDay = new Date(year, month, 0)
  for (let i = startDayOfWeek; i > 0; i--) {
    const day = new Date(prevMonthLastDay)
    day.setDate(prevMonthLastDay.getDate() - i + 1)
    days.push({ date: day, isCurrentMonth: false, isToday: false })
  }

  for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
    const date = new Date(year, month, d)
    days.push({ date, isCurrentMonth: true, isToday: date.getTime() === today.getTime() })
  }

  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const day = new Date(year, month + 1, i)
    days.push({ date: day, isCurrentMonth: false, isToday: false })
  }

  return days
})

const prevMonth = () => {
  const d = new Date(displayDate.value)
  d.setMonth(d.getMonth() - 1)
  displayDate.value = d
}

const nextMonth = () => {
  const d = new Date(displayDate.value)
  d.setMonth(d.getMonth() + 1)
  displayDate.value = d
}

const goToday = () => { displayDate.value = new Date() }
</script>

<template>
  <div class="space-y-3">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <UButton icon="i-heroicons-chevron-left-20-solid" color="neutral" variant="ghost" size="xs" @click="prevMonth" />
      <button
        class="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide hover:text-primary-500 transition-colors"
        @click="goToday"
        title="Go to today"
      >
        {{ monthYearHeader }}
      </button>
      <UButton icon="i-heroicons-chevron-right-20-solid" color="neutral" variant="ghost" size="xs" @click="nextMonth" />
    </div>

    <!-- Weekday headers -->
    <div class="grid grid-cols-7 text-center">
      <div
        v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']"
        :key="day"
        class="text-[9px] font-black text-gray-400 uppercase tracking-widest py-1"
      >
        {{ day }}
      </div>
    </div>

    <!-- Days grid -->
    <div class="grid grid-cols-7">
      <div
        v-for="(day, index) in calendarGrid"
        :key="index"
        class="h-9 flex items-center justify-center"
      >
        <button
          :class="[
            'w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all',
            day.isToday
              ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30 font-black'
              : day.isCurrentMonth
                ? 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                : 'text-gray-300 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900',
          ]"
        >
          {{ day.date.getDate() }}
        </button>
      </div>
    </div>
  </div>
</template>
