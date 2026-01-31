<script setup lang="ts">
import { z } from 'zod'
import { SOLVER_SCHEMAS } from '../../../schemas/solver'
import { ref } from 'vue'

// --- Imports for Parsers ---
import { useParseResidentsStatus, residents_statusConfig } from '../../../../parsing/composables/parsers/useParseResidentsStatus'
import { useParseExpiringleases, ExpiringLeasesConfig } from '../../../../parsing/composables/parsers/useParseExpiringLeases'

const PARSERS = [
    { id: 'residents_status', label: 'Residents Status', parser: useParseResidentsStatus, config: residents_statusConfig },
    { id: 'expiring_leases', label: 'Expiring Leases', parser: useParseExpiringleases, config: ExpiringLeasesConfig },
    // Add others as we implement Schema for them
]

const selectedParserId = ref(PARSERS[0].id)
const file = ref<File | null>(null)
const isProcessing = ref(false)
const rawData = ref<any[]>([])
const validationResults = ref<{
    validCount: number;
    invalidCount: number;
    rows: Array<{ rowIdx: number; data: any; errors: string[]; isValid: boolean }>;
    byProperty: Record<string, { total: number; valid: number; invalid: number }>;
} | null>(null)

// --- Actions ---

function onFileChange(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files?.length) {
        file.value = input.files[0]
        // Reset results
        rawData.value = []
        validationResults.value = null
    }
}

async function runInspector() {
    if (!file.value) return
    isProcessing.value = true
    
    try {
        const def = PARSERS.find(p => p.id === selectedParserId.value)
        if (!def) throw new Error('Parser not found')
        
        // 1. Parse
        const result = await def.parser(file.value)
        rawData.value = result.data
        
        // 2. Validate
        const schema = SOLVER_SCHEMAS[def.id]
        if (!schema) {
            throw new Error(`No Schema defined for ${def.id}`)
        }
        
        const rows = []
        let valid = 0
        let invalid = 0
        const byProp: Record<string, { total: number; valid: number; invalid: number }> = {}

        for (let i = 0; i < result.data.length; i++) {
            const rowData = result.data[i]
            const parsed = schema.safeParse(rowData)
            
            const errors = parsed.success ? [] : parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
            const isValid = parsed.success
            
            if (isValid) valid++
            else invalid++
            
            // Property Grouping
            const pCode = (rowData as any).property_code || 'UNKNOWN'
            if (!byProp[pCode]) byProp[pCode] = { total: 0, valid: 0, invalid: 0 }
            byProp[pCode].total++
            if (isValid) byProp[pCode].valid++
            else byProp[pCode].invalid++

            rows.push({
                rowIdx: i + 1,
                data: rowData,
                errors,
                isValid
            })
        }
        
        validationResults.value = {
            validCount: valid,
            invalidCount: invalid,
            rows,
            byProperty: byProp
        }

    } catch (e) {
        console.error(e)
        alert('Error: ' + e)
    } finally {
        isProcessing.value = false
    }
}
</script>

<template>
    <div class="p-8 max-w-7xl mx-auto space-y-8">
        <div>
            <h1 class="text-3xl font-bold text-gray-900">Solver Inspector</h1>
            <p class="text-gray-500">Diagnostic lab for Yardi Reports. Verify schema compliance before ingestion.</p>
        </div>

        <!-- CONTROLS -->
        <UCard>
            <div class="flex items-end gap-4">
                <div class="w-64">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                    <USelect v-model="selectedParserId" :options="PARSERS" option-attribute="label" value-attribute="id" />
                </div>
                <div class="flex-1">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
                    <input type="file" @change="onFileChange" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"/>
                </div>
                <UButton size="lg" @click="runInspector" :loading="isProcessing" :disabled="!file">Run Inspection</UButton>
            </div>
        </UCard>
        
        <!-- RESULTS -->
        <div v-if="validationResults" class="space-y-6">
            
            <!-- KPIs -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div class="text-sm text-gray-500">Total Rows</div>
                    <div class="text-2xl font-bold">{{ rawData.length }}</div>
                </div>
                <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div class="text-sm text-green-600">Valid Rows</div>
                    <div class="text-2xl font-bold text-green-700">{{ validationResults.validCount }}</div>
                </div>
                <div class="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div class="text-sm text-red-600">Invalid Rows</div>
                    <div class="text-2xl font-bold text-red-700">{{ validationResults.invalidCount }}</div>
                </div>
            </div>

            <!-- GROUPED SUMMARY -->
            <UCard>
                <template #header><h3 class="font-semibold">Property Breakdown</h3></template>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr class="bg-gray-50">
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Property Code</th>
                                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th class="px-3 py-2 text-right text-xs font-medium text-green-600 uppercase">Valid</th>
                                <th class="px-3 py-2 text-right text-xs font-medium text-red-600 uppercase">Invalid</th>
                                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Health</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 bg-white">
                            <tr v-for="(stats, code) in validationResults.byProperty" :key="code">
                                <td class="px-3 py-2 text-sm font-medium text-gray-900">{{ code }}</td>
                                <td class="px-3 py-2 text-sm text-right text-gray-500">{{ stats.total }}</td>
                                <td class="px-3 py-2 text-sm text-right text-green-600">{{ stats.valid }}</td>
                                <td class="px-3 py-2 text-sm text-right text-red-600 font-bold">{{ stats.invalid }}</td>
                                <td class="px-3 py-2 text-sm text-right">
                                    <UBadge :color="stats.invalid === 0 ? 'green' : 'red'" size="xs">
                                        {{ stats.invalid === 0 ? 'Healthy' : 'Needs Review' }}
                                    </UBadge>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </UCard>

            <!-- ERRORS TABLE -->
            <UCard v-if="validationResults.invalidCount > 0">
                <template #header>
                    <div class="flex justify-between items-center">
                        <h3 class="font-semibold text-red-600">Validation Errors</h3>
                        <span class="text-xs text-gray-500">Showing first 50 errors</span>
                    </div>
                </template>
                <div class="overflow-x-auto max-h-96">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50 sticky top-0">
                            <tr>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Raw Data Snippet</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 bg-white">
                            <tr v-for="row in validationResults.rows.filter(r => !r.isValid).slice(0, 50)" :key="row.rowIdx">
                                <td class="px-3 py-2 text-sm text-gray-500">{{ row.rowIdx }}</td>
                                <td class="px-3 py-2 text-sm font-medium">{{ (row.data as any).property_code }}</td>
                                <td class="px-3 py-2 text-sm text-red-600">
                                    <ul class="list-disc pl-4 space-y-1">
                                        <li v-for="err in row.errors" :key="err">{{ err }}</li>
                                    </ul>
                                </td>
                                <td class="px-3 py-2 text-xs text-gray-400 font-mono">
                                    {{ JSON.stringify(row.data).slice(0, 100) }}...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </UCard>
            
            <!-- VALID DATA PREVIEW -->
            <UCard v-if="validationResults.validCount > 0" class="mt-8">
                <template #header>
                    <div class="flex justify-between items-center">
                        <h3 class="font-semibold text-green-700">Valid Data Preview (First 20)</h3>
                        <span class="text-xs text-gray-500">Verify your values here</span>
                    </div>
                </template>
                <div class="overflow-x-auto max-h-96">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50 sticky top-0">
                            <tr>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Snippet</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 bg-white">
                            <tr v-for="row in validationResults.rows.filter(r => r.isValid).slice(0, 20)" :key="row.rowIdx">
                                <td class="px-3 py-2 text-sm text-gray-500">{{ row.rowIdx }}</td>
                                <td class="px-3 py-2 text-sm font-medium">{{ (row.data as any).property_code }}</td>
                                <td class="px-3 py-2 text-xs text-gray-600 font-mono">
                                    <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                                        <template v-for="(val, key) in row.data" :key="key">
                                            <div v-if="val !== null && val !== undefined && key !== 'property_code'" class="flex gap-2">
                                                <span class="text-gray-400 font-semibold">{{ key }}:</span>
                                                <span class="text-gray-900">{{ val }}</span>
                                            </div>
                                        </template>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </UCard>
            
            <div v-else class="text-center p-8 bg-green-50 rounded-lg border border-green-100">
                <UIcon name="i-heroicons-check-badge" class="w-12 h-12 text-green-500 mx-auto mb-2" />
                <h3 class="text-lg font-medium text-green-900">All Systems Go!</h3>
                <p class="text-green-600">File structure matches the schema perfectly.</p>
            </div>

        </div>
    </div>
</template>
