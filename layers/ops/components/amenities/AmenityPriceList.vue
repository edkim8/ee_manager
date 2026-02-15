<script setup lang="ts">
interface AmenityItem {
  name: string
  amount: number
}

defineProps<{
  baseRent: number
  fixedAmenities: AmenityItem[]
  marketRent: number
  tempAmenities: AmenityItem[]
  offeredRent: number
}>()

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Amenities Section -->
    <div class="space-y-3">
      <div class="flex justify-between items-end border-b border-gray-100 dark:border-gray-800 pb-2">
        <h4 class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Market Rent Breakdown</h4>
        <span class="text-base font-black text-gray-900 dark:text-white">{{ formatCurrency(marketRent) }}</span>
      </div>
      
      <div class="space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-gray-500 uppercase text-[10px] font-bold">Base (Floor Plan)</span>
          <span class="font-mono text-gray-900 dark:text-white">{{ formatCurrency(baseRent) }}</span>
        </div>
        
        <div v-for="item in fixedAmenities" :key="item.name" class="flex justify-between text-sm">
          <span class="text-gray-600 truncate mr-4 italic text-xs">{{ item.name }}</span>
          <span class="font-mono text-gray-900 dark:text-white text-xs">+{{ formatCurrency(item.amount) }}</span>
        </div>
      </div>
    </div>

    <!-- Summary Hint -->
    <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800/50">
        <p class="text-[9px] leading-relaxed text-gray-400 font-medium uppercase tracking-tight">
            Market Rent represents the property's benchmark value (Base + Fixed Amenities).
        </p>
    </div>
  </div>
</template>
