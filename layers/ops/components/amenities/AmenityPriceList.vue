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
  <div class="space-y-6">
    <!-- Market Rent Section -->
    <div class="space-y-3">
      <div class="flex justify-between items-end border-b border-gray-100 dark:border-gray-800 pb-2">
        <h4 class="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Market Rent Breakdown</h4>
        <span class="text-lg font-black text-gray-900 dark:text-white">{{ formatCurrency(marketRent) }}</span>
      </div>
      
      <div class="space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-gray-500 uppercase text-[10px] font-bold">Base (Floor Plan)</span>
          <span class="font-mono text-gray-900 dark:text-white">{{ formatCurrency(baseRent) }}</span>
        </div>
        
        <div v-for="item in fixedAmenities" :key="item.name" class="flex justify-between text-sm">
          <span class="text-gray-600 truncate mr-4 italic">{{ item.name }}</span>
          <span class="font-mono text-gray-900 dark:text-white">+{{ formatCurrency(item.amount) }}</span>
        </div>
      </div>
    </div>

    <!-- Temporary Amenities / Offered Rent Section -->
    <div class="space-y-3">
      <div class="flex justify-between items-end border-b border-gray-100 dark:border-gray-800 pb-2">
        <h4 class="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Offered Rent Adjustments</h4>
        <div class="text-right">
           <span class="text-xs text-gray-400 block mb-0.5">Final Offered Rent</span>
           <span class="text-2xl font-black text-primary-600 dark:text-primary-400 tracking-tight">{{ formatCurrency(offeredRent) }}</span>
        </div>
      </div>

      <div v-if="tempAmenities.length > 0" class="space-y-2">
        <div v-for="item in tempAmenities" :key="item.name" class="flex justify-between text-sm">
          <span class="text-gray-600 truncate mr-4 italic">{{ item.name }}</span>
          <span 
            :class="item.amount < 0 ? 'text-red-500' : 'text-green-500'" 
            class="font-mono font-bold"
          >
            {{ item.amount > 0 ? '+' : '' }}{{ formatCurrency(item.amount) }}
          </span>
        </div>
      </div>
      <div v-else class="py-2 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">No Temporary Adjustments</p>
      </div>
    </div>

    <!-- Summary Hint -->
    <div class="p-3 bg-primary-50 dark:bg-primary-900/10 rounded-xl border border-primary-100 dark:border-primary-900/30">
        <p class="text-[10px] leading-relaxed text-primary-600 dark:text-primary-400 font-medium">
            Market Rent represents the property's benchmark value (Base + Fixed). Offered Rent includes temporary premiums/discounts used for target matching.
        </p>
    </div>
  </div>
</template>
