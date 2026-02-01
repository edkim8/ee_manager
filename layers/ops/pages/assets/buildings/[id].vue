<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSupabaseClient, useAsyncData, definePageMeta } from '#imports'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const buildingId = route.params.id as string

// Fetch Building Details
const { data: building, status, error } = await useAsyncData(`building-${buildingId}`, async () => {
  const { data, error } = await supabase
    .from('buildings')
    .select(`
      *,
      properties (
        name,
        code
      )
    `)
    .eq('id', buildingId)
    .single()

  if (error) throw error
  return data
})

const goBack = () => {
  router.push('/assets/buildings')
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Breadcrumbs -->
    <nav class="flex mb-6 text-sm font-medium text-gray-500" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink to="/assets/buildings" class="hover:text-primary-600">Buildings</NuxtLink>
        </li>
        <li v-if="building">
          <div class="flex items-center">
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400" />
            <span class="ml-1 md:ml-2 text-gray-700 font-bold">{{ building.name }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Content -->
    <div v-if="building" class="space-y-8">
      <div class="mb-4">
        <UButton
          icon="i-heroicons-arrow-left"
          label="Back to List"
          color="neutral"
          variant="ghost"
          @click="router.back()"
          class="-ml-2.5"
        />
      </div>

      <div class="border-b border-gray-200 pb-8">
        <div class="flex items-center gap-3 mb-2">
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-700 uppercase">Building</span>
          <span class="text-gray-400">&middot;</span>
          <span class="text-gray-500 font-medium">{{ (building.properties as any)?.name }}</span>
        </div>
        <h1 class="text-4xl font-black text-gray-900 tracking-tight">{{ building.name }}</h1>
        <p class="text-xl text-gray-500 mt-2">{{ building.street_address }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="md:col-span-2 space-y-8">
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <p class="text-xs font-bold text-gray-400 uppercase mb-1">Floors</p>
              <p class="text-3xl font-black text-gray-900">{{ building.floor_count }}</p>
            </div>
            <div class="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <p class="text-xs font-bold text-gray-400 uppercase mb-1">Property Code</p>
              <p class="text-3xl font-black text-gray-900">{{ building.property_code }}</p>
            </div>
          </div>

          <div class="bg-white p-8 rounded-3xl border border-gray-200">
            <h3 class="text-xl font-bold mb-4">Building Description</h3>
            <p class="text-gray-600 leading-relaxed">{{ building.description || 'No description available for this building.' }}</p>
          </div>
        </div>

        <div class="space-y-6">
          <div class="bg-primary-600 rounded-3xl p-8 text-white">
            <h4 class="text-xs font-black uppercase tracking-widest opacity-70 mb-4">Related Assets</h4>
            <div class="space-y-2">
              <UButton
                class="w-full justify-start bg-white/10 hover:bg-white/20 text-white border-none"
                label="View Units in Building"
                icon="i-heroicons-home"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
