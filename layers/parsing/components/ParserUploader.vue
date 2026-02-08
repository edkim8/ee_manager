<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ParserConfig, ParsedResult } from '../types'
import { useParseProperties, propertiesConfig } from '../composables/parsers/useParseProperties'
import { useParseUnits, unitsConfig } from '../composables/parsers/useParseUnits'
import { useParseResidents, residentsConfig } from '../composables/parsers/useParseResidents'
import { useParseYardiReport, yardiReportConfig } from '../composables/parsers/useParseYardiReport'
import { useParseApplications, ApplicationsConfig } from '../composables/parsers/useParseApplications'
import { useParseAlerts, AlertsConfig } from '../composables/parsers/useParseAlerts'
import { useParseWorkorders, WorkOrdersConfig } from '../composables/parsers/useParseWorkorders'
import { useParseMakeready, MakeReadyConfig } from '../composables/parsers/useParseMakeready'
import { useParseNotices, NoticesConfig } from '../composables/parsers/useParseNotices'
import { useParseAvailables, AvailablesConfig } from '../composables/parsers/useParseAvailables'
import { useParseDelinquencies, DelinquenciesConfig } from '../composables/parsers/useParseDelinquencies'
import { useParseResidentsStatus, residents_statusConfig } from '../composables/parsers/useParseResidentsStatus'
import { useParseTransfers, TransfersConfig } from '../composables/parsers/useParseTransfers'
import { useParseExpiringleases, ExpiringLeasesConfig } from '../composables/parsers/useParseExpiringLeases'
import { useParseAmenitiesList, amenitiesListConfig } from '../composables/parsers/useParseAmenitiesList'
import { useParseAmenitiesAudit, amenitiesAuditConfig } from '../composables/parsers/useParseAmenitiesAudit'
import { useDbIngestion } from '../composables/useDbIngestion'
import { useAmenitiesSync } from '../composables/useAmenitiesSync'
import { useAlertsSync } from '../composables/useAlertsSync'
import { useWorkOrdersSync } from '../composables/useWorkOrdersSync'
import { useDelinquenciesSync } from '../composables/useDelinquenciesSync'

const props = defineProps<{
  parserId: string
  label?: string
  icon?: string
  tableName?: string
  lastUploadStatus?: { lastUpload: string | null, isToday: boolean }
}>()

// --- Factory Logic (could be moved to a composable if complex) ---
// Map IDs to specific composables and configs
const PARSER_MAP: Record<string, { parse: Function, config: ParserConfig }> = {
  'properties': { parse: useParseProperties, config: propertiesConfig },
  'units': { parse: useParseUnits, config: unitsConfig },
  'residents': { parse: useParseResidents, config: residentsConfig },
  'yardi_report': { parse: useParseYardiReport, config: yardiReportConfig },
  '5p_Applications': { parse: useParseApplications, config: ApplicationsConfig },
  
  // -- PLACEHOLDERS (Aliased to Generic Yardi Report for now, or just placeholders) --
  'leased_units': { parse: useParseYardiReport, config: { ...yardiReportConfig, id: 'leased_units', namePattern: '.*' } },
  'residents_status': { parse: useParseResidentsStatus, config: residents_statusConfig },
  'transfers': { parse: useParseTransfers, config: TransfersConfig },
  'availables': { parse: useParseAvailables, config: AvailablesConfig },
  'notices': { parse: useParseNotices, config: NoticesConfig },
  'expiring_leases': { parse: useParseExpiringleases, config: ExpiringLeasesConfig },
  'alerts': { parse: useParseAlerts, config: AlertsConfig },
  'work_orders': { parse: useParseWorkorders, config: WorkOrdersConfig },
  'make_ready': { parse: useParseMakeready, config: MakeReadyConfig },
  'delinquencies': { parse: useParseDelinquencies, config: DelinquenciesConfig },
  'amenities_list': { parse: useParseAmenitiesList, config: amenitiesListConfig },
  'amenities_audit': { parse: useParseAmenitiesAudit, config: amenitiesAuditConfig },
}

const parserDef = computed(() => PARSER_MAP[props.parserId])
const config = computed(() => parserDef.value?.config)

// --- State ---
const file = ref<File | null>(null)
const isProcessing = ref(false)
const result = ref<ParsedResult<any> | null>(null)
const error = ref<string | null>(null)
const dragActive = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const successMessage = ref<string | null>(null)

// --- Computed ---
const isValidFile = computed(() => {
  if (!file.value || !config.value) return false
  const regex = new RegExp(config.value.namePattern, 'i')
  return regex.test(file.value.name)
})

const statusColor = computed(() => {
  if (error.value) return 'red'
  if (result.value) return 'green'
  if (successMessage.value) return 'cyan'
  return 'primary'
})

// --- Actions ---
function onDrop(e: DragEvent) {
  dragActive.value = false
  const droppedFile = e.dataTransfer?.files[0]
  if (droppedFile) handleFile(droppedFile)
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) handleFile(input.files[0])
}

function handleFile(f: File) {
  file.value = f
  result.value = null
  error.value = null
  successMessage.value = null
  
  if (config.value) {
    const regex = new RegExp(config.value.namePattern, 'i')
    if (!regex.test(f.name)) {
      error.value = `Invalid filename. Expected pattern: ${config.value.namePattern}`
    }
  }
}

async function runParser() {
  if (!file.value || !parserDef.value) return
  
  isProcessing.value = true
  error.value = null
  successMessage.value = null
  
  try {
    // Note: Passing empty options for now. In real app, we might inject unitsLookup.
    const res = await parserDef.value.parse(file.value)
    if (res.errors && res.errors.length > 0) {
      error.value = `Parsed with ${res.errors.length} errors.`
      result.value = res
    } else {
      result.value = res
    }
  } catch (err: any) {
    error.value = err.message || 'Unknown parsing error'
  } finally {
    isProcessing.value = false
  }
}

// --- DB Ingestion ---
const { ingest, isSaving: isIngesting, saveError } = useDbIngestion()
const { syncAlerts, isSyncing, syncError, syncStats } = useAlertsSync()
const { syncWorkOrders, isSyncing: isSyncingWO, syncError: syncErrorWO, syncStats: syncStatsWO } = useWorkOrdersSync()
const { syncDelinquencies, isSyncing: isSyncingDel, syncError: syncErrorDel, syncStats: syncStatsDel } = useDelinquenciesSync()
const { syncAmenitiesList, syncAmenitiesAudit, isSyncing: isSyncingAmenities, syncError: syncErrorAmenities } = useAmenitiesSync()

const isSaving = computed(() => isIngesting.value || isSyncing.value || isSyncingWO.value || isSyncingDel.value || isSyncingAmenities.value)

const emit = defineEmits(['saved'])

async function saveToDb() {
  if (!result.value || !props.tableName) return
  
  error.value = null
  successMessage.value = null

  let success = false

  // Specialized Sync for Alerts
  if (props.tableName === 'alerts') {
    success = await syncAlerts(result.value.data)
    if (success) {
      successMessage.value = syncStats.value
    } else {
      error.value = syncError.value
    }
  } else if (props.tableName === 'work_orders') {
    // Specialized Sync for Work Orders
    success = await syncWorkOrders(result.value.data)
    if (success) {
      successMessage.value = syncStatsWO.value
    } else {
      error.value = syncErrorWO.value
    }
  } else if (props.tableName === 'delinquencies') {
    // Specialized Sync for Delinquencies
    success = await syncDelinquencies(result.value.data)
    if (success) {
      successMessage.value = syncStatsDel.value
    } else {
      error.value = syncErrorDel.value
    }
  } else if (props.tableName === 'amenities') {
    // Specialized Sync for Amenities
    success = await syncAmenitiesList(result.value.data)
    if (success) {
      successMessage.value = 'Amenities successfully updated.'
    } else {
      error.value = syncErrorAmenities.value
    }
  } else if (props.tableName === 'unit_amenities') {
    // Specialized Sync for Unit Amenities (Audit)
    success = await syncAmenitiesAudit(result.value.data)
    if (success) {
      successMessage.value = 'Unit Amenities successfully updated via Audit.'
    } else {
      error.value = syncErrorAmenities.value
    }
  } else {
    // Standard Upsert for others
    success = await ingest(props.tableName, result.value.data)
    if (success) {
      successMessage.value = 'Saved to Database Successfully!'
    } else {
      error.value = saveError.value
    }
  }

  if (success) {
    emit('saved', { tableName: props.tableName, count: result.value.data.length })
  }
}

</script>

<template>
  <UCard :class="{'ring-2 ring-primary-500': dragActive}">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon v-if="icon" :name="icon" class="text-xl text-gray-500" />
          <h3 class="font-semibold">{{ label || parserId }}</h3>
        </div>
        <div class="flex gap-2">
           <UBadge v-if="successMessage || lastUploadStatus?.isToday" color="green" variant="subtle">
              {{ successMessage ? 'Just Uploaded' : 'Uploaded Today' }}
           </UBadge>
           <UBadge :color="statusColor" variant="subtle">
            {{ result ? 'Parsed' : (file ? 'Ready' : 'Idle') }}
          </UBadge>
        </div>
      </div>
    </template>

    <div 
      class="p-8 border-2 border-dashed rounded-lg text-center transition-colors mb-4"
      :class="dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-200'"
      @dragenter.prevent="dragActive = true"
      @dragleave.prevent="dragActive = false"
      @dragover.prevent
      @drop.prevent="onDrop"
    >
      <div v-if="!file" class="space-y-2">
        <UIcon name="i-heroicons-cloud-arrow-up" class="text-4xl text-gray-400" />
        <p class="text-gray-500">Drag & Drop file here</p>
        <p class="text-xs text-gray-400" v-if="config">Match: {{ config.namePattern }}</p>
        <div>
          <input 
            type="file" 
            class="hidden" 
            ref="fileInput" 
            @change="onFileSelect"
            accept=".csv,.xlsx,.xls"
          >
          <UButton 
            size="xs" 
            variant="soft" 
            @click="fileInput?.click()"
          >
            Select File
          </UButton>
        </div>
      </div>

      <div v-else class="space-y-2">
        <UIcon name="i-heroicons-document" class="text-4xl text-primary-500" />
        <p class="font-medium">{{ file.name }}</p>
        <p class="text-xs text-gray-500">{{ (file.size / 1024).toFixed(1) }} KB</p>
        <UButton 
          size="xs" 
          color="gray" 
          variant="ghost" 
          @click="file = null; result = null; error = null; successMessage = null"
        >
          Remove
        </UButton>
      </div>
    </div>

    <!-- Error Message -->
    <UAlert 
      v-if="error"
      icon="i-heroicons-exclamation-triangle"
      color="red"
      variant="soft"
      title="Error"
      :description="error"
      class="mb-4"
    />

    <!-- Success Message -->
    <UAlert 
      v-if="successMessage"
      icon="i-heroicons-check-circle"
      color="cyan"
      variant="soft"
      title="Success"
      :description="successMessage"
      class="mb-4"
    />

    <!-- Success Stats -->
    <div v-if="result" class="space-y-2 mb-4 bg-green-50 p-3 rounded text-sm text-green-800">
      <div class="flex justify-between">
        <span>Rows Parsed:</span>
        <span class="font-bold">{{ result.meta.parsedRows }}</span>
      </div>
      <div class="flex justify-between" v-if="result.meta.totalRows !== result.meta.parsedRows">
        <span>Total Rows:</span>
        <span>{{ result.meta.totalRows }}</span>
      </div>
      <!-- Preview first few items -->
      <div v-if="result.data.length" class="mt-2 pt-2 border-t border-green-200">
        <p class="text-xs font-semibold mb-1">Preview (Data):</p>
        <pre class="text-[10px] overflow-x-auto bg-white p-2 rounded max-h-32">{{ result.data.slice(0, 2) }}</pre>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <div class="flex gap-2">
          <!-- Parse Button -->
          <UButton 
            :loading="isProcessing" 
            :disabled="!isValidFile"
            @click="runParser"
            color="black"
            variant="solid"
          >
            Parse File
          </UButton>

          <UButton
            v-if="result && tableName && !error"
            :loading="isSaving"
            @click="saveToDb"
            color="primary"
            variant="solid"
            icon="i-heroicons-cloud-arrow-up"
          >
            {{ 
               tableName === 'alerts' ? 'Sync Alerts' : 
               tableName === 'work_orders' ? 'Sync Work Orders' : 
               tableName === 'delinquencies' ? 'Sync Delinquencies' : 
               tableName === 'amenities' ? 'Sync Amenities' :
               tableName === 'unit_amenities' ? 'Sync Audit' :
               'Save to DB' 
            }}
          </UButton>
        </div>
      </div>
    </template>
  </UCard>
</template>
