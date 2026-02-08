<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHead } from '#imports'
import { useDailyUploadStatus } from '../../composables/useDailyUploadStatus'
// Note: We are using the generic ParserUploader for all items, configured via props.
// The wrapper components in reference do not exist, so we map them here.

definePageMeta({
  title: 'File Uploads',
  layout: 'dashboard',
  middleware: ['admin']
})

useHead({ title: 'Yardi Data Processing' })

// --- Status Tracking ---
const { statuses, markAsUploaded } = useDailyUploadStatus()

// --- Accordion Setup ---
// We define the items and mapping to parser IDs here.
const items = computed(() => [
  {
    label: 'Process Leased Units (Master Roster)',
    icon: 'i-heroicons-user-group',
    defaultOpen: true,
    parserId: 'leased_units',
    slot: 'leased-units',
    key: 'leased_units'
  },
  {
    label: 'Process Residents Status',
    icon: 'i-heroicons-users',
    parserId: 'residents_status',
    slot: 'residents-status',
    key: 'residents_status'
  },
  {
    label: 'Process Make Ready',
    icon: 'i-heroicons-paint-brush',
    parserId: 'make_ready',
    slot: 'make-ready',
    key: 'make_ready'
  },
  {
    label: 'Process Availables',
    icon: 'i-heroicons-arrow-down-tray',
    parserId: 'availables',
    slot: 'availables',
    key: 'availables'
  },
  {
    label: 'Process Notices',
    icon: 'i-heroicons-bell-alert',
    parserId: 'notices',
    slot: 'notices',
    key: 'notices'
  },
  {
    label: 'Process Applications',
    icon: 'i-heroicons-clipboard-document-check',
    parserId: '5p_Applications',
    slot: 'applications',
    key: 'applications'
  },
  {
    label: 'Process Expiring Leases',
    icon: 'i-heroicons-arrow-path-rounded-square-20-solid',
    parserId: 'expiring_leases',
    slot: 'expiring-leases',
    key: 'expiring_leases'
  },
  {
    label: 'Process Transfers',
    icon: 'i-heroicons-arrows-right-left',
    parserId: 'transfers',
    slot: 'transfers',
    key: 'transfers'
  },
  {
    label: 'Process Alerts',
    icon: 'i-heroicons-light-bulb',
    parserId: 'alerts',
    slot: 'alerts',
    key: 'alerts',
    tableName: 'alerts' // Special sync
  },
  {
    label: 'Process Work Orders',
    icon: 'i-heroicons-wrench-screwdriver',
    parserId: 'work_orders',
    slot: 'work-orders',
    key: 'work_orders',
    tableName: 'work_orders' // Special sync
  },
  {
    label: 'Process Delinquencies',
    icon: 'i-heroicons-currency-dollar',
    parserId: 'delinquencies',
    slot: 'delinquencies',
    key: 'delinquencies'
  },
  {
    label: 'Generic Yardi Report',
    icon: 'i-heroicons-document-text',
    parserId: 'yardi_report',
    slot: 'generic',
    key: 'yardi_report' // fixed key to match composable
  }
])

function getStatus(key: string) {
  return statuses.value[key]
}

function onSaved(key: string) {
    markAsUploaded(key)
}
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold">Yardi Data Processing</h1>
        <p class="text-gray-500">Upload daily reports to sync the system.</p>
      </div>
    </div>

    <UAccordion :items="items" :unmount="false">
      <!-- Custom Header with Status -->
      <template #item="{ item }">
        <div class="flex items-center justify-between w-full py-2">
            <div class="flex items-center gap-2">
                <UIcon :name="item.icon" class="w-5 h-5 text-gray-500" />
                <span class="font-medium text-gray-900">{{ item.label }}</span>
            </div>
            <div class="flex items-center gap-3">
                <template v-if="getStatus(item.key)?.lastUpload">
                    <span class="text-xs text-gray-500">
                        Last: {{ getStatus(item.key)?.isToday ? 'Today' : getStatus(item.key)?.lastUpload }}
                    </span>
                    <UIcon 
                        v-if="getStatus(item.key)?.isToday" 
                        name="i-heroicons-check-circle" 
                        class="w-5 h-5 text-green-500" 
                    />
                </template>
                <UIcon 
                    name="i-heroicons-chevron-down" 
                    class="w-5 h-5 text-gray-400 transition-transform duration-200"
                />
            </div>
        </div>
      </template>

      <!-- Content Slots -->
      
      <template #leased-units>
        <ParserUploader parser-id="leased_units" label="Process Leased Units" table-name="units" @saved="onSaved('leased_units')" :last-upload-status="getStatus('leased_units')" />
      </template>

      <template #residents-status>
        <ParserUploader parser-id="residents_status" label="Process Residents Status" @saved="onSaved('residents_status')" :last-upload-status="getStatus('residents_status')" />
      </template>

      <template #make-ready>
        <ParserUploader parser-id="make_ready" label="Process Make Ready" @saved="onSaved('make_ready')" :last-upload-status="getStatus('make_ready')" />
      </template>

      <template #availables>
        <ParserUploader parser-id="availables" label="Process Availables" @saved="onSaved('availables')" :last-upload-status="getStatus('availables')" />
      </template>

      <template #notices>
        <ParserUploader parser-id="notices" label="Process Notices" @saved="onSaved('notices')" :last-upload-status="getStatus('notices')" />
      </template>

      <template #applications>
        <ParserUploader parser-id="5p_Applications" label="Process Applications" @saved="onSaved('applications')" :last-upload-status="getStatus('applications')" />
      </template>

      <template #expiring-leases>
        <ParserUploader parser-id="expiring_leases" label="Process Expiring Leases" @saved="onSaved('expiring_leases')" :last-upload-status="getStatus('expiring_leases')" />
      </template>

      <template #transfers>
        <ParserUploader parser-id="transfers" label="Process Transfers" @saved="onSaved('transfers')" :last-upload-status="getStatus('transfers')" />
      </template>

      <template #alerts>
        <ParserUploader parser-id="alerts" label="Process Alerts" table-name="alerts" @saved="onSaved('alerts')" :last-upload-status="getStatus('alerts')" />
      </template>

      <template #work-orders>
        <ParserUploader parser-id="work_orders" label="Process Work Orders" table-name="work_orders" @saved="onSaved('work_orders')" :last-upload-status="getStatus('work_orders')" />
      </template>

      <template #delinquencies>
<ParserUploader parser-id="delinquencies" label="Process Delinquencies" table-name="delinquencies" @saved="onSaved('delinquencies')" :last-upload-status="getStatus('delinquencies')" />
      </template>
      
      <template #generic>
        <ParserUploader parser-id="yardi_report" label="Generic Yardi Report" @saved="onSaved('yardi_report')" :last-upload-status="getStatus('yardi_report')" />
      </template>

    </UAccordion>
  </div>
</template>
