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
    let allUnits: any[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const from = page * pageSize
      const to = from + pageSize - 1
      
      const { data, error: dbError } = await client
        .from('units')
        .select('id, property_code, unit_name')
        .range(from, to)
      
      if (dbError) throw dbError
      
      if (data && data.length > 0) {
        allUnits = allUnits.concat(data)
        if (data.length < pageSize) {
          hasMore = false
        } else {
          page++
        }
      } else {
        hasMore = false
      }
    }

    if (allUnits.length === 0) throw new Error('No data returned')

    const lookupMap: Record<string, string> = {}
    const propertyCounts: Record<string, number> = {}
    
    // Sort data first
    allUnits.sort((a: any, b: any) => {
      const pCodeA = String(a.property_code || '').trim().toLowerCase()
      const pCodeB = String(b.property_code || '').trim().toLowerCase()
      if (pCodeA !== pCodeB) return pCodeA.localeCompare(pCodeB)
      
      const unitA = String(a.unit_name || '').trim().toLowerCase()
      const unitB = String(b.unit_name || '').trim().toLowerCase()
      // Numeric sort for unit names if possible
      return unitA.localeCompare(unitB, undefined, { numeric: true, sensitivity: 'base' })
    })

    allUnits.forEach((u: any) => {
      if (u.property_code && u.unit_name && u.id) {
        // Normalize key: property_code + '_' + unit_name (lowercase)
        const key = `${u.property_code.trim()}_${u.unit_name.trim()}`.toLowerCase()
        lookupMap[key] = u.id

        // Stats
        const pCode = u.property_code.toUpperCase()
        propertyCounts[pCode] = (propertyCounts[pCode] || 0) + 1
      }
    })

    stats.value = propertyCounts

    const code = `/**
 * Client-Side Unit ID Lookup Data
 * Generated on: ${new Date().toISOString()}
 * Count: ${Object.keys(lookupMap).length}
 */
export const CLIENT_UNIT_LOOKUP: Record<string, string> = ${JSON.stringify(lookupMap, null, 2)}
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
import { resolveUnitId } from '../../../../base/utils/lookup'
import { computed } from 'vue'

const testProp = ref('')
const testUnit = ref('')

const testResult = computed(() => {
  dbVerification.value = null // Reset DB check on input change
  if (!testProp.value || !testUnit.value) return null
  return resolveUnitId(testProp.value, testUnit.value)
})

const isVerifying = ref(false)
const dbVerification = ref<{ property_code: string; unit_name: string } | null>(null)

const isPropMatch = computed(() => 
  dbVerification.value?.property_code.toLowerCase().trim() === testProp.value.toLowerCase().trim()
)
const isUnitMatch = computed(() => 
  dbVerification.value?.unit_name.toLowerCase().trim() === testUnit.value.toLowerCase().trim()
)

async function verifyAgainstDb() {
  if (!testResult.value) return
  
  isVerifying.value = true
  dbVerification.value = null
  
  try {
    const { data, error } = await client
      .from('units')
      .select('property_code, unit_name')
      .eq('id', testResult.value)
      .single()
      
    if (error) throw error
    dbVerification.value = data
  } catch (e) {
    console.error('Verify failed', e)
    alert('Failed to verify UUID against database')
  } finally {
    isVerifying.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex justify-between items-center">
        <h2 class="text-xl font-bold">Unit Lookup Generator</h2>
        <UButton 
          @click="generateLookup" 
          :loading="isLoading"
          color="primary"
          icon="i-heroicons-arrow-path"
        >
          Fetch Units & Generate Code
        </UButton>
      </div>
    </template>

    <div class="space-y-4">
      <p class="text-gray-600">
        This tool fetches all units from the database (limit 10,000) and generates the TypeScript code for the client-side lookup map.
        Copy the output below and paste it into <code>layers/base/utils/unit-lookup-data.ts</code>.
      </p>

      <UAlert v-if="error" color="red" variant="soft" title="Error" :description="error" />

      <!-- Stats Summary -->
      <div v-if="stats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <UCard v-for="(count, code) in stats" :key="code" class="text-center">
          <div class="text-xs text-gray-500 font-bold uppercase">{{ code }}</div>
          <div class="text-2xl font-bold text-primary-600">{{ count }}</div>
          <div class="text-[10px] text-gray-400">units</div>
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
        Click "Fetch Units & Generate Code" to begin.
      </div>
    </div>

    <!-- Verification Section -->
    <template #footer>
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <h3 class="font-bold mb-4">Verify Lookup Integration</h3>
        <div class="flex gap-4 items-end">
          <UFormGroup label="Property Code">
            <UInput v-model="testProp" placeholder="e.g. CV" />
          </UFormGroup>
          <UFormGroup label="Unit Name">
            <UInput v-model="testUnit" placeholder="e.g. 101" />
          </UFormGroup>
          <div class="mb-1">
            <div class="text-sm text-gray-500">Resolved UUID:</div>
            <div :class="testResult ? 'text-green-600 font-mono text-xs' : 'text-gray-400 italic text-xs'">
              {{ testResult || 'No match' }}
            </div>
          </div>
          
          <div v-if="testResult">
             <UButton 
               size="xs" 
               color="white" 
               variant="solid" 
               label="Verify against DB" 
               :loading="isVerifying"
               @click="verifyAgainstDb"
             />
          </div>
        </div>

        <!-- DB Verification Result -->
        <div v-if="dbVerification" class="mt-4 p-3 bg-gray-50 rounded text-sm">
          <div class="font-bold text-gray-700">Database Record for UUID:</div>
          <div class="grid grid-cols-2 gap-4 mt-2">
             <div>
               <span class="text-gray-500">Property:</span> 
               <span :class="isPropMatch ? 'text-green-600 font-bold' : 'text-red-500 bg-red-50'">{{ dbVerification.property_code }}</span>
             </div>
             <div>
               <span class="text-gray-500">Unit:</span> 
               <span :class="isUnitMatch ? 'text-green-600 font-bold' : 'text-red-500 bg-red-50'">{{ dbVerification.unit_name }}</span>
             </div>
          </div>
          <div v-if="isPropMatch && isUnitMatch" class="mt-2 text-green-600 flex items-center gap-1">
            <UIcon name="i-heroicons-check-circle" /> Valid Match
          </div>
        </div>
      </div>
    </template>
  </UCard>
</template>
