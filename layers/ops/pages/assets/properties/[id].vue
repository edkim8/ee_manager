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
const propertyId = route.params.id as string

// Fetch Property Details
const { data: property, status, error } = await useAsyncData(`property-${propertyId}`, async () => {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single()

  if (error) throw error
  return data
})

const goBack = () => {
  router.push('/assets/properties')
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Breadcrumbs -->
    <nav class="flex mb-6 text-sm font-medium text-gray-500" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        <li class="inline-flex items-center">
          <NuxtLink to="/assets/properties" class="hover:text-primary-600">Properties</NuxtLink>
        </li>
        <li v-if="property">
          <div class="flex items-center">
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400" />
            <span class="ml-1 md:ml-2 text-gray-700 font-bold">{{ property.name }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Error State -->
    <div v-if="error" class="bg-red-50 p-6 rounded-xl border border-red-200">
      <h2 class="text-lg font-bold text-red-700">Error loading property</h2>
      <p class="text-sm text-red-600">{{ error.message }}</p>
      <UButton color="red" variant="soft" @click="goBack" class="mt-4">Back to List</UButton>
    </div>

    <!-- Content -->
    <div v-if="property" class="space-y-8">
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
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-700 uppercase">Property</span>
          <span class="text-gray-400 font-mono">{{ property.code }}</span>
        </div>
        <h1 class="text-4xl font-black text-gray-900 tracking-tight">{{ property.name }}</h1>
        <p class="text-xl text-gray-500 mt-2">{{ property.street_address }}, {{ property.city }}, {{ property.state_code }} {{ property.postal_code }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="md:col-span-2 space-y-8">
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div class="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center">
              <p class="text-xs font-bold text-gray-400 uppercase mb-1">Total Units</p>
              <p class="text-3xl font-black text-gray-900">{{ property.total_unit_count }}</p>
            </div>
            <div class="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center">
              <p class="text-xs font-bold text-gray-400 uppercase mb-1">Year Built</p>
              <p class="text-3xl font-black text-gray-900">{{ property.year_built }}</p>
            </div>
            <div class="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center">
              <p class="text-xs font-bold text-gray-400 uppercase mb-1">Status</p>
              <p class="text-xl font-black text-green-600 uppercase">Active</p>
            </div>
          </div>

          <div class="bg-white p-8 rounded-3xl border border-gray-200">
            <h3 class="text-xl font-bold mb-4">About Property</h3>
            <p class="text-gray-600 leading-relaxed">{{ property.description || 'No description available.' }}</p>
          </div>
        </div>

        <div class="space-y-6">
          <div class="bg-gray-900 rounded-3xl p-8 text-white">
            <h4 class="text-xs font-black uppercase tracking-widest opacity-70 mb-4">Contact & Info</h4>
            <div class="space-y-4">
              <UButton
                v-if="property.website_url"
                :to="property.website_url"
                target="_blank"
                variant="ghost"
                color="white"
                class="w-full justify-start px-0"
                icon="i-heroicons-globe-alt"
                label="Visit Website"
              />
              <div class="text-sm opacity-80 pt-4 border-t border-white/10">
                <p class="mb-1 italic">Internal ID:</p>
                <p class="font-mono text-[10px] truncate">{{ property.id }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
