<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const props = defineProps<{
  locationType: 'unit' | 'building' | 'location'
  locationId: string
  title?: string
}>()

// Composables
const { fetchItemsByLocation, fetchLocationSummary } = useInventoryItems()
const { getHealthColor, getHealthLabel } = useInventoryLifecycle()

// State
const items = ref([])
const summary = ref(null)
const loading = ref(false)
const error = ref(null)
const showAll = ref(false)

// Load data
onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  try {
    loading.value = true
    error.value = null

    // Load items and summary in parallel
    const [itemsData, summaryData] = await Promise.all([
      fetchItemsByLocation(props.locationType, props.locationId),
      fetchLocationSummary(props.locationType, props.locationId),
    ])

    items.value = itemsData
    summary.value = summaryData
  } catch (err) {
    error.value = err.message
    console.error('Error loading assets:', err)
  } finally {
    loading.value = false
  }
}

// Display items (show max 3 by default, expand to show all)
const displayedItems = computed(() => {
  if (showAll.value) return items.value
  return items.value.slice(0, 3)
})

const hasMore = computed(() => items.value.length > 3)

// Get health status icon
const getHealthIcon = (status: string): string => {
  const icons = {
    healthy: '✅',
    warning: '⚠️',
    critical: '🔴',
    expired: '⛔',
    unknown: '❓',
  }
  return icons[status] || '❓'
}
</script>

<template>
  <div class="bg-white dark:bg-gray-900/80 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-bold text-gray-900 dark:text-white">
        {{ title || 'Assets' }}
      </h3>
      <UBadge v-if="!loading" size="lg" color="gray" variant="subtle">
        {{ items.length }}
      </UBadge>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-3">
      <USkeleton class="h-16" v-for="i in 3" :key="i" />
    </div>

    <!-- Error State -->
    <UAlert v-else-if="error" color="red" icon="i-heroicons-exclamation-triangle" class="text-sm">
      {{ error }}
    </UAlert>

    <!-- Empty State -->
    <div v-else-if="items.length === 0" class="text-center py-8">
      <UIcon name="i-heroicons-cube" class="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
      <p class="text-sm text-gray-500 dark:text-gray-400">No assets tracked yet</p>
      <NuxtLink :to="`/inventory/test?location=${locationType}&id=${locationId}`">
        <UButton size="xs" variant="ghost" class="mt-2">Add Asset</UButton>
      </NuxtLink>
    </div>

    <!-- Summary Stats (if data exists) -->
    <div v-else-if="summary" class="grid grid-cols-4 gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
      <div class="text-center">
        <div class="text-lg font-bold text-green-600 dark:text-green-400">
          {{ summary.healthy_count }}
        </div>
        <div class="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Healthy</div>
      </div>
      <div class="text-center">
        <div class="text-lg font-bold text-yellow-600 dark:text-yellow-400">
          {{ summary.warning_count }}
        </div>
        <div class="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Warning</div>
      </div>
      <div class="text-center">
        <div class="text-lg font-bold text-orange-600 dark:text-orange-400">
          {{ summary.critical_count }}
        </div>
        <div class="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Critical</div>
      </div>
      <div class="text-center">
        <div class="text-lg font-bold text-red-600 dark:text-red-400">
          {{ summary.expired_count }}
        </div>
        <div class="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Expired</div>
      </div>
    </div>

    <!-- Items List -->
    <div v-if="items.length > 0" class="space-y-2">
      <div
        v-for="item in displayedItems"
        :key="item.id"
        class="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/70 transition-colors cursor-pointer"
        @click="$router.push(`/inventory/test?item=${item.id}`)"
      >
        <div class="flex items-start justify-between mb-1">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs">{{ getHealthIcon(item.health_status) }}</span>
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {{ item.category_name }}
              </h4>
            </div>
            <p class="text-xs text-gray-600 dark:text-gray-400 truncate">
              {{ item.brand }} {{ item.model }}
            </p>
          </div>
          <UBadge :color="getHealthColor(item.health_status)" size="xs" class="shrink-0">
            {{ getHealthLabel(item.health_status) }}
          </UBadge>
        </div>

        <!-- Progress Bar (if install date exists) -->
        <div v-if="item.install_date" class="mt-2">
          <div class="h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              class="h-full transition-all"
              :class="{
                'bg-green-500': item.health_status === 'healthy',
                'bg-yellow-500': item.health_status === 'warning',
                'bg-orange-500': item.health_status === 'critical',
                'bg-red-500': item.health_status === 'expired',
                'bg-gray-400': item.health_status === 'unknown',
              }"
              :style="{
                width: Math.min(
                  (item.age_years / item.expected_life_years) * 100,
                  100
                ) + '%'
              }"
            />
          </div>
          <div class="flex justify-between items-center mt-1 text-[10px] text-gray-500 dark:text-gray-400">
            <span>{{ item.age_years }}y old</span>
            <span>{{ item.life_remaining_years }}y left</span>
          </div>
        </div>
      </div>

      <!-- Show More / Show Less Button -->
      <UButton
        v-if="hasMore"
        variant="ghost"
        size="xs"
        class="w-full"
        @click="showAll = !showAll"
      >
        {{ showAll ? 'Show Less' : `Show ${items.length - 3} More` }}
      </UButton>
    </div>

    <!-- View All Link -->
    <div v-if="items.length > 0" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
      <NuxtLink :to="`/inventory/test?location=${locationType}&id=${locationId}`">
        <UButton variant="outline" size="sm" class="w-full" icon="i-heroicons-cube">
          Manage Assets
        </UButton>
      </NuxtLink>
    </div>
  </div>
</template>
