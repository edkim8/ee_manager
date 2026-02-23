<script setup lang="ts">
import { ref } from 'vue'

const client = useSupabaseClient()
const generatedCode = ref('')
const isLoading = ref(false)
const error = ref<string | null>(null)
const copyFeedback = ref(false)
const stats = ref<Record<string, number> | null>(null)

async function generateLookup() {
  isLoading.value = true
  error.value = null
  generatedCode.value = ''
  stats.value = null
  
  try {
    const { data: allAmenities, error: dbError } = await client
      .from('amenities')
      .select('id, property_code, yardi_code, yardi_name, yardi_amenity')
    
    if (dbError) throw dbError
    if (!allAmenities || allAmenities.length === 0) throw new Error('No data returned')

    const lookupMap: Record<string, string> = {}
    const propertyCounts: Record<string, number> = {}
    
    allAmenities.forEach((a: any) => {
      if (a.property_code && a.id) {
        const pCode = a.property_code.trim().toLowerCase()
        
        // Add by Code
        if (a.yardi_code) {
          lookupMap[`${pCode}_code_${a.yardi_code.trim()}`.toLowerCase()] = a.id
        }
        // Add by Name
        if (a.yardi_name) {
          lookupMap[`${pCode}_name_${a.yardi_name.trim()}`.toLowerCase()] = a.id
        }
        // Add by Label
        if (a.yardi_amenity) {
          lookupMap[`${pCode}_label_${a.yardi_amenity.trim()}`.toLowerCase()] = a.id
        }

        // Stats
        const pCodeStats = a.property_code.toUpperCase()
        propertyCounts[pCodeStats] = (propertyCounts[pCodeStats] || 0) + 1
      }
    })

    stats.value = propertyCounts

    const code = `/**
 * Client-Side Amenity ID Lookup Data
 * Generated on: ${new Date().toISOString()}
 * Count: ${Object.keys(lookupMap).length}
 */
export const CLIENT_AMENITY_LOOKUP: Record<string, string> = ${JSON.stringify(lookupMap, null, 2)}
`
    generatedCode.value = code
    
  } catch (e: any) {
    error.value = e.message
  } finally {
    isLoading.value = false
  }
}

function copyToClipboard() {
  navigator.clipboard.writeText(generatedCode.value)
  copyFeedback.value = true
  setTimeout(() => copyFeedback.value = false, 2000)
}

// --- Verification Logic ---
import { resolveAmenityId } from '../../../../base/utils/lookup'
import { computed } from 'vue'

const testProp = ref('')
const testKey = ref('')
const testType = ref<'code' | 'name' | 'label'>('code')

const testResult = computed(() => {
  if (!testProp.value || !testKey.value) return null
  return resolveAmenityId(testProp.value, testKey.value, testType.value)
})

</script>

<template>
  <UCard>
    <template #header>
      <div class="flex justify-between items-center">
        <h2 class="text-xl font-bold">Amenity Lookup Generator</h2>
        <UButton 
          @click="generateLookup" 
          :loading="isLoading"
          color="primary"
          icon="i-heroicons-arrow-path"
        >
          Fetch Amenities & Generate Code
        </UButton>
      </div>
    </template>

    <div class="space-y-4">
      <p class="text-gray-600">
        This tool fetches all amenities from the database and generates the TypeScript code for the client-side lookup map.
        Copy the output below and paste it into <code>layers/base/utils/amenity-lookup-data.ts</code>.
      </p>

      <UAlert v-if="error" color="red" variant="soft" title="Error" :description="error" />

      <!-- Stats Summary -->
      <div v-if="stats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <UCard v-for="(count, code) in stats" :key="code" class="text-center">
          <div class="text-xs text-gray-500 font-bold uppercase">{{ code }}</div>
          <div class="text-2xl font-bold text-primary-600">{{ count }}</div>
          <div class="text-[10px] text-gray-400">amenities</div>
        </UCard>
      </div>

      <div v-if="generatedCode" class="relative">
        <div class="absolute top-2 right-2">
           <UButton 
            size="xs"
            color="white"
            variant="solid"
            :icon="copyFeedback ? 'i-heroicons-check' : 'i-heroicons-clipboard'"
            @click="copyToClipboard"
           >
             {{ copyFeedback ? 'Copied!' : 'Copy Code' }}
           </UButton>
        </div>
        <textarea 
          class="w-full h-96 p-4 font-mono text-xs bg-gray-50 border rounded"
          readonly
          v-model="generatedCode"
        ></textarea>
      </div>
      
      <div v-else class="text-center py-12 text-gray-400 border-2 border-dashed rounded">
        Click "Fetch Amenities & Generate Code" to begin.
      </div>
    </div>

    <!-- Verification Section -->
    <template #footer>
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <h3 class="font-bold mb-4">Verify Lookup Integration</h3>
        <div class="flex gap-4 items-end">
          <UFormField label="Property Code">
            <UInput v-model="testProp" placeholder="e.g. CV" />
          </UFormField>
          <UFormField label="Identifier">
            <UInput v-model="testKey" placeholder="e.g. POOLD" />
          </UFormField>
          <UFormField label="Type">
            <USelectMenu v-model="testType" :items="['code', 'name', 'label']" />
          </UFormField>
          <div class="mb-1">
            <div class="text-sm text-gray-500">Resolved UUID:</div>
            <div :class="testResult ? 'text-green-600 font-mono text-xs' : 'text-gray-400 italic text-xs'">
              {{ testResult || 'No match' }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </UCard>
</template>
