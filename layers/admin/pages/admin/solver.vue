<script setup lang="ts">
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { ParserConfig, ParsedResult } from '../../../parsing/types'
import { useParseResidentsStatus, residents_statusConfig } from '../../../parsing/composables/parsers/useParseResidentsStatus'
import { useParseExpiringleases, ExpiringLeasesConfig } from '../../../parsing/composables/parsers/useParseExpiringLeases'
import { useParseNotices, NoticesConfig } from '../../../parsing/composables/parsers/useParseNotices'
import { useParseAvailables, AvailablesConfig } from '../../../parsing/composables/parsers/useParseAvailables'
import { useParseApplications, ApplicationsConfig } from '../../../parsing/composables/parsers/useParseApplications'
import { useParseMakeready, MakeReadyConfig } from '../../../parsing/composables/parsers/useParseMakeready'
import { useParseTransfers, TransfersConfig } from '../../../parsing/composables/parsers/useParseTransfers'
import { useParseYardiReport, yardiReportConfig } from '../../../parsing/composables/parsers/useParseYardiReport'
import { useParseAlerts, AlertsConfig } from '../../../parsing/composables/parsers/useParseAlerts'
import { useParseWorkorders, WorkOrdersConfig } from '../../../parsing/composables/parsers/useParseWorkorders'
import { useParseDelinquencies, DelinquenciesConfig } from '../../../parsing/composables/parsers/useParseDelinquencies'
import { useDbIngestion } from '../../../parsing/composables/useDbIngestion'
import { useDailyUploadStatus } from '../../../admin/composables/useDailyUploadStatus'

definePageMeta({
  title: 'Data Ingestion',
  layout: 'dashboard',
  middleware: ['admin']
})

// --- 1. UNIFIED SOLVER CONFIGURATION (Core + Ops) ---
const SOLVER_PARSERS = [
    // Core Reports (Phase 1)
    { id: 'residents_status', dbEnum: 'residents_status', config: residents_statusConfig, parse: useParseResidentsStatus, label: 'Residents Status', required: true },
    { id: 'expiring_leases', dbEnum: 'expiring_leases', config: ExpiringLeasesConfig, parse: useParseExpiringleases, label: 'Expiring Leases', required: true },
    { id: 'notices', dbEnum: 'notices', config: NoticesConfig, parse: useParseNotices, label: 'Notices', required: false },
    { id: 'availables', dbEnum: 'availables', config: AvailablesConfig, parse: useParseAvailables, label: 'Availables', required: false },
    { id: 'applications', dbEnum: 'applications', config: ApplicationsConfig, parse: useParseApplications, label: 'Applications', required: false },
    { id: 'make_ready', dbEnum: 'make_ready', config: MakeReadyConfig, parse: useParseMakeready, label: 'Make Ready', required: false },
    { id: 'transfers', dbEnum: 'transfers', config: TransfersConfig, parse: useParseTransfers, label: 'Transfers', required: false },
    { id: 'leased_units', dbEnum: 'leased_units', config: { ...yardiReportConfig, id: 'leased_units', namePattern: '^5p_Leased_Units' }, parse: useParseYardiReport, label: 'Leased Units (Audit)', required: false },
    // Ops Reports (Phase 2)
    { id: 'alerts', dbEnum: 'alerts', config: AlertsConfig, parse: useParseAlerts, label: 'Alerts', required: false },
    { id: 'work_orders', dbEnum: 'work_orders', config: WorkOrdersConfig, parse: useParseWorkorders, label: 'Work Orders', required: false },
    { id: 'delinquencies', dbEnum: 'delinquencies', config: DelinquenciesConfig, parse: useParseDelinquencies, label: 'Delinquencies', required: false },
]

// --- 2. OPERATIONAL CONFIGURATION ---
// These are handled individually via ParserUploader
const OPERATIONAL_ITEMS = [
  { label: 'Process Alerts', parserId: 'alerts', tableName: 'alerts', icon: 'i-heroicons-light-bulb', slot: 'operational-slot' },
  { label: 'Process Work Orders', parserId: 'work_orders', tableName: 'work_orders', icon: 'i-heroicons-wrench-screwdriver', slot: 'operational-slot' },
  { label: 'Process Delinquencies', parserId: 'delinquencies', tableName: 'delinquencies', icon: 'i-heroicons-currency-dollar', slot: 'operational-slot' },
]

// --- STATE: SOLVER ---
interface PendingFile {
    file: File
    parserId: string | null
    status: 'pending' | 'parsing' | 'uploading' | 'done' | 'error'
    message: string | null
    parsedData: any[] | null
}

const pendingFiles = ref<PendingFile[]>([])
const isDragActive = ref(false)
const globalBatchId = ref<string | null>(null)
const overallStatus = ref<'idle' | 'processing' | 'completed'>('idle')

// --- STATE: OPERATIONAL ---
const { statuses, markAsUploaded } = useDailyUploadStatus()
function getStatus(key: string) { return statuses.value[key] }
function onSaved(key: string) { markAsUploaded(key) }


// --- ACTIONS: SOLVER ---

function identifyFile(file: File): string | null {
    for (const def of SOLVER_PARSERS) {
        const regex = new RegExp(def.config.namePattern, 'i')
        if (regex.test(file.name)) {
            return def.id
        }
    }
    return null
}

function onDrop(e: DragEvent) {
    isDragActive.value = false
    const droppedFiles = e.dataTransfer?.files
    if (!droppedFiles) return

    for (let i = 0; i < droppedFiles.length; i++) {
        const file = droppedFiles[i]
        const pid = identifyFile(file)
        
        // Prevent duplicates
        if (pendingFiles.value.some(f => f.file.name === file.name)) continue;

        pendingFiles.value.push({
            file,
            parserId: pid,
            status: pid ? 'pending' : 'error',
            message: pid ? 'Ready' : 'Unknown file type',
            parsedData: null
        })
    }
}

function removeFile(index: number) {
    pendingFiles.value.splice(index, 1)
}

function clearAll() {
    pendingFiles.value = []
    overallStatus.value = 'idle'
    globalBatchId.value = null
}

// Verification Logic
const verificationStatus = computed(() => {
    return SOLVER_PARSERS.map(p => {
        const found = pendingFiles.value.find(f => f.parserId === p.id)
        return {
            ...p,
            isPresent: !!found,
            fileName: found?.file.name
        }
    })
})

const allRequiredPresent = computed(() => {
    return verificationStatus.value.filter(p => p.required).every(p => p.isPresent)
})

import { useSupabaseClient } from '#imports'

const supabase = useSupabaseClient()
const solverEngine = useSolverEngine()

async function processBatch() {
    if (pendingFiles.value.length === 0) return
    
    overallStatus.value = 'processing'
    globalBatchId.value = uuidv4()

    for (const item of pendingFiles.value) {
        if (item.status === 'error' || !item.parserId) continue

        item.status = 'parsing'
        const def = SOLVER_PARSERS.find(d => d.id === item.parserId)
        if (!def) {
            item.status = 'error'; item.message = 'Definition not found'; continue
        }

        try {
            // A. Parse
            const result = await def.parse(item.file)
            if (result.errors && result.errors.length > 0) {
                 item.message = `Uploaded with ${result.errors.length} warnings`
            }
            item.parsedData = result.data

            // B. Upload to Staging
            item.status = 'uploading'
            
            const groupedData: Record<string, any[]> = {}
            for (const row of result.data) {
                const r = row as any
                // TransfersRow has no top-level property_code — fall back to from_property_code.
                // All other report types expose property_code directly.
                const pCode = r.property_code || r.from_property_code || 'UNKNOWN'
                if (!groupedData[pCode]) groupedData[pCode] = []
                groupedData[pCode].push(row)
            }

            const insertResults = await Promise.all(
                Object.entries(groupedData).map(([pCode, rows]) =>
                    supabase.from('import_staging').insert({
                        batch_id: globalBatchId.value,
                        report_type: def.dbEnum,
                        property_code: pCode,
                        raw_data: rows,
                    })
                )
            )
            const insertError = insertResults.find(r => r.error)?.error
            if (insertError) throw insertError

            item.status = 'done'
            item.message = 'Staged for Solver'

        } catch (e: any) {
            console.error('Upload Error:', e)
            item.status = 'error'
            item.message = e.message
        }
    }
    
    // --- TRIGGER SOLVER ENGINE ---
    try {
        overallStatus.value = 'processing' // Indicate processing start
        await solverEngine.processBatch(globalBatchId.value!)
        overallStatus.value = 'completed'
    } catch (e: any) {
        console.error('Solver Engine Error:', e)
        // Ideally show a toast or error message
        overallStatus.value = 'idle' // Revert to idle on error for now
    }
}

</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-12">
    
    <!-- HEADER -->
    <div>
        <h1 class="text-3xl font-bold text-gray-900">Data Ingestion</h1>
        <p class="text-gray-500 mt-1">Manage daily Yardi reports and operational data uploads.</p>
    </div>

    <!-- SECTION 1: SOLVER BULK UPLOAD -->
    <section class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div>
                <h2 class="text-lg font-semibold flex items-center gap-2">
                    <UIcon name="i-heroicons-cpu-chip" class="text-primary-600" />
                    Unified Solver Engine
                </h2>
                <p class="text-sm text-gray-500">Batch upload all 11 Daily Reports (8 Core + 3 Ops) in one go.</p>
            </div>
            <div class="flex gap-2">
                 <UButton v-if="pendingFiles.length > 0" @click="clearAll" color="gray" variant="ghost" size="sm">Clear</UButton>
            </div>
        </div>

        <div class="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <!-- A. Drop Zone -->
            <div class="lg:col-span-2 space-y-4">
                 <div 
                    class="p-10 border-2 border-dashed rounded-xl text-center transition-all cursor-pointer relative"
                    :class="isDragActive ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'"
                    @dragenter.prevent="isDragActive = true"
                    @dragleave.prevent="isDragActive = false"
                    @dragover.prevent
                    @drop.prevent="onDrop"
                    @click="$refs.fileInput.click()"
                >
                    <input type="file" ref="fileInput" multiple class="hidden" @change="(e) => onDrop({ dataTransfer: { files: e.target.files } } as any)" accept=".xlsx,.xls,.csv" />
                    <UIcon name="i-heroicons-cloud-arrow-up" class="text-5xl text-gray-400 mb-4" />
                    <h3 class="text-lg font-semibold text-gray-700">Drop All Daily Reports Here</h3>
                    <p class="text-sm text-gray-500 mt-2">Select all 11 files (8 Core + 3 Ops) and drop them at once.</p>
                </div>

                <!-- Process Button -->
                <div v-if="pendingFiles.length > 0" class="flex flex-col gap-4 pt-4 border-t border-gray-100">
                    
                    <!-- Success Banner -->
                    <div v-if="overallStatus === 'completed'" class="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                        <UIcon name="i-heroicons-check-circle" class="w-8 h-8 text-green-500" />
                        <div>
                             <h4 class="font-bold text-green-900">Batch Processed Successfully</h4>
                             <p class="text-sm text-green-700">Batch ID: <span class="font-mono">{{ globalBatchId }}</span></p>
                             <p class="text-xs text-green-600 mt-1">Data has been reconciled and saved to Tenancies & Residents.</p>
                        </div>
                    </div>

                    <div v-else class="flex flex-col gap-4">
                        <!-- Progress Status -->
                        <div v-if="overallStatus === 'processing'" class="bg-blue-50 text-blue-700 p-3 rounded text-sm font-mono flex items-center gap-2">
                             <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                             {{ solverEngine.statusMessage.value }}
                        </div>

                        <div class="flex justify-end items-center gap-4">
                            <UButton 
                                size="xl" 
                                color="primary" 
                                variant="solid"
                                :loading="overallStatus === 'processing'"
                                :disabled="overallStatus === 'completed' || !allRequiredPresent"
                                @click="processBatch"
                                block
                            >
                                Verify & Process Batch
                            </UButton>
                        </div>

                        <!-- Skipped Rows Report -->
                        <div v-if="solverEngine.skippedRows.value.length > 0" class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <h4 class="text-sm font-bold text-yellow-900 flex items-center gap-2">
                                <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5" />
                                Processing Warnings ({{ solverEngine.skippedRows.value.length }})
                            </h4>
                            <p class="text-xs text-yellow-700 mt-1 mb-2">Some rows were skipped or flagged. Check data integrity.</p>
                            <div class="max-h-40 overflow-y-auto custom-scrollbar">
                                <table class="w-full text-left text-xs text-yellow-800">
                                    <thead>
                                        <tr class="border-b border-yellow-200">
                                            <th class="py-1">Prop</th>
                                            <th class="py-1">Unit</th>
                                            <th class="py-1">Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(row, idx) in solverEngine.skippedRows.value" :key="idx" class="border-b border-yellow-100 last:border-0 hover:bg-yellow-100/50">
                                            <td class="py-1 font-mono">{{ row.property }}</td>
                                            <td class="py-1 font-mono">{{ row.unit }}</td>
                                            <td class="py-1 break-all">{{ row.reason }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- B. Verification Checklist -->
            <div class="bg-gray-50 rounded-lg p-5 border border-gray-200 h-full">
                <h3 class="font-medium text-gray-900 mb-4 flex items-center justify-between">
                    File Verification
                    <UBadge :color="allRequiredPresent ? 'green' : 'gray'" size="xs" variant="subtle">{{ verificationStatus.filter(x=>x.isPresent).length }} / 11</UBadge>
                </h3>
                <div class="space-y-2">
                    <div v-for="item in verificationStatus" :key="item.id" 
                         class="flex items-center justifying-between text-sm p-2 rounded transition-colors"
                         :class="item.isPresent ? 'bg-green-100 text-green-900 font-medium' : 'bg-white text-gray-500'"
                    >
                        <div class="flex items-center gap-2 flex-1">
                            <UIcon :name="item.isPresent ? 'i-heroicons-check-circle' : 'i-heroicons-stop'" class="w-4 h-4" />
                            <span>{{ item.label }}</span>
                        </div>
                        <span v-if="!item.required" class="text-[10px] uppercase tracking-wide opacity-50">Optional</span>
                    </div>
                </div>
                <!-- File Errors -->
                 <div v-if="pendingFiles.some(f => f.status === 'error')" class="mt-4 pt-4 border-t border-gray-200">
                    <p class="text-xs font-bold text-red-600 mb-2">Check Files:</p>
                    <ul class="text-sm text-red-600 space-y-1">
                        <li v-for="f in pendingFiles.filter(f => f.status === 'error')" :key="f.file.name">
                            <span class="font-semibold">{{ f.file.name }}:</span> {{ f.message }}
                        </li>
                    </ul>
                 </div>
            </div>

        </div>
    </section>

    <!-- SECTION 2: LEGACY OPERATIONAL UPLOADS (Deprecated - Use Unified Solver Above) -->
    <section class="opacity-50">
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div class="flex items-start gap-2">
                <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                    <h3 class="font-semibold text-yellow-900">Legacy Upload Method</h3>
                    <p class="text-sm text-yellow-700 mt-1">These individual uploaders are deprecated. Use the <strong>Unified Solver Engine</strong> above to upload all 11 files at once.</p>
                </div>
            </div>
        </div>

        <h2 class="text-xl font-bold text-gray-900 mb-4">Operational Data (Legacy)</h2>

        <UAccordion :items="OPERATIONAL_ITEMS" :unmount="false">
            <template #item="{ item }">
                <div class="flex items-center justify-between w-full py-2">
                    <div class="flex items-center gap-2">
                        <UIcon :name="item.icon" class="w-5 h-5 text-gray-500" />
                        <span class="font-medium text-gray-900">{{ item.label }}</span>
                    </div>
                    <div class="flex items-center gap-3">
                         <template v-if="getStatus(item.parserId)?.lastUpload">
                            <span class="text-xs text-gray-500">
                                Last: {{ getStatus(item.parserId)?.isToday ? 'Today' : getStatus(item.parserId)?.lastUpload }}
                            </span>
                            <UIcon v-if="getStatus(item.parserId)?.isToday" name="i-heroicons-check-circle" class="w-5 h-5 text-green-500" />
                        </template>
                        <UIcon name="i-heroicons-chevron-down" class="w-5 h-5 text-gray-400 transition-transform duration-200" />
                    </div>
                </div>
            </template>

            <template #operational-slot="{ item }">
                 <ParserUploader
                    :parser-id="item.parserId"
                    :table-name="item.tableName"
                    @saved="onSaved(item.parserId)"
                    :last-upload-status="getStatus(item.parserId)"
                />
            </template>
        </UAccordion>
    </section>

    <!-- SECTION 3: AMENITIES DATA -->
    <section>
        <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center justify-between">
            Amenities Management
            <UButton to="/admin/generators/amenity-lookup" color="gray" variant="ghost" size="xs" icon="i-heroicons-wrench">Amenity Lookup Generator</UButton>
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <UCard>
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-heroicons-list-bullet" class="text-primary-600" />
                        <span class="font-bold">Amenities List</span>
                    </div>
                </template>
                <ParserUploader
                    parser-id="amenities_list"
                    table-name="amenities"
                    @saved="onSaved('amenities_list')"
                />
            </UCard>

            <UCard>
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-heroicons-document-magnifying-glass" class="text-primary-600" />
                        <span class="font-bold">Amenities Audit</span>
                    </div>
                </template>
                <ParserUploader
                    parser-id="amenities_audit"
                    table-name="unit_amenities"
                    @saved="onSaved('amenities_audit')"
                />
            </UCard>
        </div>
    </section>

  </div>
</template>
