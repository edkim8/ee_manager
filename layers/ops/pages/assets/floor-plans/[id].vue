<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSupabaseClient, useAsyncData, definePageMeta } from '#imports'
import ImageModal from '../../../../base/components/modals/ImageModal.vue'
import type { Tables } from '@/types/supabase'

const showImageModal = ref(false)

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const floorPlanId = route.params.id as string

// Fetch Floor Plan Details
const { data: floorPlan, status, error } = await useAsyncData(`floor-plan-${floorPlanId}`, async () => {
  const { data, error } = await supabase
    .from('floor_plans')
    .select(`
      *,
      properties (
        name,
        code
      )
    `)
    .eq('id', floorPlanId)
    .single()

  if (error) throw error
  return data
})

const goBack = () => {
  router.push('/assets/floor-plans')
}

// Computed Image URL - Ensure absolute path from public directory
const imageUrl = computed(() => {
  const path = floorPlan.value?.primary_image_url
  if (!path) return null
  // If it doesn't start with / or http, prepend /
  if (!path.startsWith('/') && !path.startsWith('http')) {
    return `/${path}`
  }
  return path
})
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Breadcrumbs -->
    <nav class="flex mb-6 text-sm font-medium text-gray-500 dark:text-gray-400" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink to="/assets/floor-plans" class="hover:text-primary-600 dark:hover:text-primary-400">
            Floor Plans
          </NuxtLink>
        </li>
        <li v-if="floorPlan">
          <div class="flex items-center">
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400" />
            <span class="ml-1 md:ml-2 text-gray-700 dark:text-gray-200 font-bold">
              {{ floorPlan.code }}
            </span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Error State -->
    <div v-if="error" class="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800">
      <div class="flex items-center gap-3 text-red-700 dark:text-red-400 mb-4">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6" />
        <h2 class="text-lg font-bold">Error loading floor plan</h2>
      </div>
      <p class="text-sm opacity-80 mb-4">{{ error.message }}</p>
      <UButton color="red" variant="soft" @click="goBack">Back to List</UButton>
    </div>

    <!-- Loading State -->
    <div v-else-if="status === 'pending'" class="space-y-6">
      <USkeleton class="h-12 w-1/3" />
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <USkeleton class="h-64 col-span-2" />
        <USkeleton class="h-64" />
      </div>
    </div>

    <!-- Header Section -->
    <div v-if="floorPlan" class="mb-8">
      <div class="flex items-center justify-between mb-2">
        <UButton
          icon="i-heroicons-arrow-left"
          label="Back to List"
          color="neutral"
          variant="ghost"
          @click="router.back()"
          class="-ml-2.5"
        />
        <div class="flex gap-2">
          <UButton icon="i-heroicons-pencil-square" color="neutral" variant="ghost" />
          <UButton icon="i-heroicons-share" color="neutral" variant="ghost" />
        </div>
      </div>

      <!-- Main Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left Column: Details -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Stats Card -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Bedrooms</p>
              <p class="text-3xl font-black text-gray-900 dark:text-white">{{ floorPlan.bedroom_count }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Bathrooms</p>
              <p class="text-3xl font-black text-gray-900 dark:text-white">{{ floorPlan.bathroom_count }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Area</p>
              <p class="text-3xl font-black text-gray-900 dark:text-white">{{ floorPlan.area_sqft }}<span class="text-sm font-normal text-gray-400 ml-1">sqft</span></p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Market Rent</p>
              <p class="text-3xl font-black text-primary-600 dark:text-primary-400">
                ${{ floorPlan.market_base_rent?.toLocaleString() }}
              </p>
            </div>
          </div>

          <!-- Description -->
          <div class="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 class="text-xl font-bold mb-4">Description</h3>
            <p class="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
              {{ floorPlan.description || 'No description available for this floor plan.' }}
            </p>
          </div>

          <!-- Image Display -->
          <div 
            class="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm group relative cursor-zoom-in"
            @click="showImageModal = true"
          >
            <div class="aspect-[4/3] w-full flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-950/50">
              <NuxtImg 
                v-if="imageUrl" 
                :src="imageUrl" 
                class="max-w-full max-h-full object-contain drop-shadow-2xl group-hover:scale-[1.02] transition-transform duration-500"
                :alt="floorPlan.marketing_name"
                placeholder
              />
              <div v-else class="text-center">
                <div class="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UIcon name="i-heroicons-photo" class="w-8 h-8 text-gray-400" />
                </div>
                <p class="text-sm font-bold text-gray-500 uppercase tracking-wider">Plan Image Coming Soon</p>
                <p class="text-xs text-gray-400 mt-1 italic">Reference: {{ floorPlan.code }}</p>
              </div>
            </div>
            
            <div v-if="imageUrl" class="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <span class="text-xs font-medium text-gray-400 italic">Static asset from public/apartments/</span>
              <UButton
                :to="imageUrl"
                target="_blank"
                variant="solid"
                color="primary"
                size="sm"
                icon="i-heroicons-arrow-top-right-on-square"
                label="View Full Resolution"
                class="rounded-xl font-bold"
              />
            </div>
          </div>
        </div>

        <!-- Right Column: Sidebar -->
        <div class="space-y-6">
          <div class="bg-primary-600 rounded-3xl p-8 text-white shadow-xl shadow-primary-500/20">
            <h4 class="text-xs font-black uppercase tracking-[0.2em] opacity-70 mb-4">Quick Insights</h4>
            <div class="space-y-4">
              <div class="flex justify-between items-center border-b border-white/10 pb-4">
                <span class="opacity-80">Property Code</span>
                <span class="font-mono font-bold">{{ floorPlan.property_code }}</span>
              </div>
              <div class="flex justify-between items-center border-b border-white/10 pb-4">
                <span class="opacity-80">Yardi Code</span>
                <span class="font-mono font-bold">{{ floorPlan.yardi_layout_code || 'N/A' }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="opacity-80">Created</span>
                <span class="font-bold">{{ new Date(floorPlan.created_at).toLocaleDateString() }}</span>
              </div>
            </div>
            <UButton
              class="w-full mt-8 bg-white text-primary-600 hover:bg-gray-50"
              label="View Linked Units"
              size="lg"
            />
          </div>

          <!-- Debug Info -->
          <div class="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
            <p class="text-[10px] font-mono text-gray-400 break-all">
              ID: {{ floorPlan.id }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Reusable Image Modal -->
    <ImageModal
      v-if="showImageModal"
      v-model="showImageModal"
      :src="imageUrl"
      :alt="floorPlan?.marketing_name"
    />
  </div>
</template>
