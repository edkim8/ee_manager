<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({
    layout: 'admin'
})

const propertyCode = ref('RS')
const unitName = ref('1025')
const result = ref<string | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)

const resolveUnit = async () => {
    loading.value = true
    result.value = null
    error.value = null
    
    try {
        const client = useSupabaseClient()
        const { data, error: err } = await client
            .from('units')
            .select('id, unit_name')
            .eq('property_code', propertyCode.value)
            .eq('unit_name', unitName.value)
            .single()
            
        if (err) throw err
        result.value = data ? `Found ID: ${data.id}` : 'Not Found'
    } catch (e: any) {
        error.value = e.message || 'Error resolving unit'
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <div class="p-8">
        <h1 class="text-2xl font-bold mb-6">Solver Playground</h1>
        
        <div class="bg-white p-6 rounded-lg shadow max-w-lg">
            <h2 class="text-lg font-semibold mb-4">Unit Resolution Tester</h2>
            
            <div class="space-y-4">
                <UFormGroup label="Property Code">
                    <UInput v-model="propertyCode" />
                </UFormGroup>
                
                <UFormGroup label="Unit Name">
                    <UInput v-model="unitName" />
                </UFormGroup>
                
                <UButton @click="resolveUnit" :loading="loading" color="primary">
                    Resolve ID
                </UButton>
                
                <div v-if="result" class="p-3 bg-green-50 text-green-800 rounded">
                    {{ result }}
                </div>
                
                <div v-if="error" class="p-3 bg-red-50 text-red-800 rounded">
                    {{ error }}
                </div>
            </div>
        </div>
    </div>
</template>
