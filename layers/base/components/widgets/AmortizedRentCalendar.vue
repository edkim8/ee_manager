<script setup lang="ts">
const props = defineProps<{
  availableDate: string
  rent: number
  term?: number
  hold?: number
}>()

const term = computed(() => props.term ?? 12)
const hold = computed(() => props.hold ?? 7)

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)

// Use UTC throughout to avoid timezone drift
const displayDate = ref(new Date(props.availableDate.split('T')[0].replace(/-/g, '/')))

const availableDateObj = computed(() => {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const propStr = props.availableDate.split('T')[0]
  const propDate = new Date(`${propStr}T00:00:00Z`)
  return propDate < today ? today : propDate
})

const holdEndDate = computed(() => {
  const d = new Date(availableDateObj.value)
  d.setUTCDate(d.getUTCDate() + hold.value)
  return d
})

const calcAmortizedRent = (moveIn: Date) => {
  const dailyRent = props.rent / 30.42
  const totalDays = term.value * 30.42
  const lostDays = Math.max(0, (moveIn.getTime() - holdEndDate.value.getTime()) / (1000 * 60 * 60 * 24))
  return (dailyRent + (lostDays * dailyRent) / totalDays) * 30.42
}

const calendarGrid = computed(() => {
  const year  = displayDate.value.getUTCFullYear()
  const month = displayDate.value.getUTCMonth()
  const first = new Date(Date.UTC(year, month, 1))
  const last  = new Date(Date.UTC(year, month + 1, 0))
  const startDow = first.getUTCDay()

  const days: { date: Date; rent: number | null; status: string }[] = []

  const prevLast = new Date(Date.UTC(year, month, 0))
  for (let i = startDow; i > 0; i--) {
    const d = new Date(prevLast)
    d.setUTCDate(prevLast.getUTCDate() - i + 1)
    days.push({ date: d, rent: null, status: 'other' })
  }

  for (let i = 1; i <= last.getUTCDate(); i++) {
    const date = new Date(Date.UTC(year, month, i))
    let rent: number | null = null
    let status = 'unavailable'
    if (date >= availableDateObj.value) {
      if (date <= holdEndDate.value) { status = 'hold'; rent = props.rent }
      else { status = 'amortized'; rent = calcAmortizedRent(date) }
    }
    days.push({ date, rent, status })
  }

  return days
})

const monthHeader = computed(() =>
  displayDate.value.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
)

const prevMonth = () => {
  const d = new Date(displayDate.value)
  d.setUTCMonth(d.getUTCMonth() - 1)
  displayDate.value = d
}
const nextMonth = () => {
  const d = new Date(displayDate.value)
  d.setUTCMonth(d.getUTCMonth() + 1)
  displayDate.value = d
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- Nav -->
    <div class="flex items-center justify-between">
      <UButton icon="i-heroicons-chevron-left-20-solid" color="neutral" variant="ghost" size="xs" @click="prevMonth" />
      <span class="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide">{{ monthHeader }}</span>
      <UButton icon="i-heroicons-chevron-right-20-solid" color="neutral" variant="ghost" size="xs" @click="nextMonth" />
    </div>

    <!-- Legend -->
    <div class="flex gap-3 text-[9px] font-black uppercase tracking-widest">
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-green-400 inline-block" /> Hold</span>
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Amortized</span>
    </div>

    <!-- Weekday row -->
    <div class="grid grid-cols-7 text-center">
      <div v-for="d in ['S','M','T','W','T','F','S']" :key="d" class="text-[9px] font-black text-gray-400 uppercase py-1">{{ d }}</div>
    </div>

    <!-- Day cells -->
    <div class="grid grid-cols-7">
      <div
        v-for="(day, i) in calendarGrid"
        :key="i"
        :class="[
          'border-t border-gray-100 dark:border-gray-800 p-1 flex flex-col min-h-[44px]',
          day.status === 'hold'      && 'bg-green-50 dark:bg-green-900/20',
          day.status === 'amortized' && 'bg-orange-50 dark:bg-orange-900/20',
        ]"
      >
        <span
          :class="[
            'text-[10px] font-bold leading-none',
            day.status === 'other' ? 'text-gray-300 dark:text-gray-600' : 'text-gray-900 dark:text-white',
          ]"
        >
          {{ day.date.getUTCDate() }}
        </span>
        <span
          v-if="day.rent !== null"
          :class="[
            'text-[9px] font-black mt-0.5 leading-tight',
            day.status === 'amortized' ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400',
          ]"
        >
          {{ formatCurrency(day.rent) }}
        </span>
      </div>
    </div>
  </div>
</template>
