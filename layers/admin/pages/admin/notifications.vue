<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSupabaseClient, useToast, useHead } from '#imports'
import { PROPERTY_LIST, getPropertyName } from '../../../base/constants/properties'
import type { TableColumn } from '../../../table/types'

definePageMeta({
  layout: 'dashboard',
  middleware: ['admin']
})

useHead({
  title: 'Email Notifications'
})

const supabase = useSupabaseClient()
const toast = useToast()

const recipients = ref<any[]>([])
const loading = ref(false)
const submitting = ref(false)

// Form state
const newRecipient = ref({
  email: '',
  property_code: '',
  notification_types: ['daily_summary'] as string[]
})

const notificationTypeOptions = [
  { label: 'Daily Summary', value: 'daily_summary' },
  { label: 'Audit Report', value: 'audit' }
]

const propertyOptions = PROPERTY_LIST.map(p => ({
  label: `${p.code} - ${p.name}`,
  value: p.code
}))

async function fetchRecipients() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('property_notification_recipients')
      .select('*')
      .order('property_code')
      .order('email')

    if (error) throw error
    recipients.value = data || []
  } catch (error: any) {
    console.error('[Notifications] Fetch error:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to load recipients.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

async function addRecipient() {
  if (!newRecipient.value.email || !newRecipient.value.property_code) return
  
  submitting.value = true
  try {
    const { error } = await supabase
      .from('property_notification_recipients')
      .insert([newRecipient.value])

    if (error) throw error

    toast.add({
      title: 'Success',
      description: 'Recipient added successfully.',
      color: 'success'
    })
    
    newRecipient.value.email = ''
    newRecipient.value.property_code = ''
    newRecipient.value.notification_types = ['daily_summary']
    fetchRecipients()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to add recipient.',
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}

async function toggleActive(recipient: any) {
  try {
    const { error } = await supabase
      .from('property_notification_recipients')
      .update({ is_active: !recipient.is_active })
      .eq('id', recipient.id)

    if (error) throw error
    fetchRecipients()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: 'Failed to update status.',
      color: 'error'
    })
  }
}

async function deleteRecipient(id: string) {
  if (!confirm('Are you sure you want to remove this recipient?')) return

  try {
    const { error } = await supabase
      .from('property_notification_recipients')
      .delete()
      .eq('id', id)

    if (error) throw error
    fetchRecipients()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: 'Failed to delete recipient.',
      color: 'error'
    })
  }
}

const sendingTest = ref(false)
const sendingTestAudit = ref(false)

async function sendTestAudit() {
  sendingTestAudit.value = true
  try {
    const today = new Date().toISOString().split('T')[0]
    const response: any = await $fetch('/api/admin/notifications/send-audit', {
      method: 'POST',
      body: {
        content: `# Test Audit Email\n\nThis is a test audit email sent from /admin/notifications on ${today}.\n\nIf you received this, audit email delivery is working correctly.`,
        date: today,
        batchId: 'test'
      }
    })

    if (response.success) {
      const failures = response.results?.filter((r: any) => r.status === 'failed') || []
      if (failures.length > 0) {
        toast.add({ title: 'Partial Success', description: `Sent to ${response.results.length - failures.length}, failed for ${failures.length}.`, color: 'warning' })
      } else {
        toast.add({ title: 'Success', description: `Test audit email sent to ${response.results?.length || 0} recipient(s).`, color: 'success' })
      }
    }
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.message || 'Failed to send test audit email.', color: 'error' })
  } finally {
    sendingTestAudit.value = false
  }
}

async function sendTestSummary() {
  sendingTest.value = true
  try {
    // 1. Get the latest completed run
    const { data: latestRun, error: runError } = await supabase
      .from('solver_runs')
      .select('id')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    if (runError || !latestRun) {
      throw new Error('No completed solver runs found to test with.')
    }

    // 2. Trigger the API
    const response: any = await $fetch('/api/admin/notifications/send-summary', {
      method: 'POST',
      body: { runId: latestRun.id }
    })

    if (response.success) {
      const failures = response.results?.filter((r: any) => r.status === 'failed') || []
      
      if (failures.length > 0) {
        toast.add({
          title: 'Partial Success',
          description: `Emails sent to ${response.results.length - failures.length} but failed for ${failures.length}. Check logs for details.`,
          color: 'warning'
        })
      } else {
        toast.add({
          title: 'Success',
          description: `Test emails triggered for ${response.results?.length || 0} recipients.`,
          color: 'success'
        })
      }
    }
  } catch (error: any) {
    console.error('[Notifications] Test error:', error)
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to send test emails.',
      color: 'error'
    })
  } finally {
    sendingTest.value = false
  }
}

onMounted(() => {
  fetchRecipients()
})

const columns: TableColumn[] = [
  { key: 'email', label: 'Email Address', sortable: true },
  { key: 'property_code', label: 'Property', sortable: true },
  { key: 'notification_types', label: 'Types' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', align: 'right' }
]
</script>

<template>
  <div class="p-6 max-w-6xl mx-auto space-y-8">
    <div class="flex justify-between items-end">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Email Notifications</h1>
        <p class="text-gray-500 mt-1">Manage who receives the daily Solver summary reports.</p>
      </div>
      <div class="flex gap-2">
        <UButton
          icon="i-heroicons-clipboard-document-list"
          color="neutral"
          variant="outline"
          label="Send Test Audit"
          :loading="sendingTestAudit"
          @click="sendTestAudit"
        />
        <UButton
          icon="i-heroicons-paper-airplane"
          color="neutral"
          variant="outline"
          label="Send Test Summary"
          :loading="sendingTest"
          @click="sendTestSummary"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Add Recipient Form -->
      <UCard class="h-fit">
        <template #header>
          <h3 class="font-semibold flex items-center gap-2">
            <UIcon name="i-heroicons-user-plus" />
            Add New Recipient
          </h3>
        </template>
        
        <form @submit.prevent="addRecipient" class="space-y-4">
          <UFormGroup label="Email Address">
            <UInput 
              v-model="newRecipient.email" 
              type="email" 
              placeholder="user@example.com" 
              icon="i-heroicons-envelope"
              required
            />
          </UFormGroup>

          <UFormGroup label="Property">
            <USelectMenu
              v-model="newRecipient.property_code"
              :items="propertyOptions"
              value-key="value"
              placeholder="Select a property"
            />
          </UFormGroup>

          <UFormGroup label="Notification Types">
            <div class="flex gap-4 pt-1">
              <UCheckbox
                v-for="opt in notificationTypeOptions"
                :key="opt.value"
                v-model="newRecipient.notification_types"
                :value="opt.value"
                :label="opt.label"
              />
            </div>
          </UFormGroup>

          <UButton
            type="submit"
            block
            color="primary"
            :loading="submitting"
            :disabled="!newRecipient.email || !newRecipient.property_code || newRecipient.notification_types.length === 0"
          >
            Add Recipient
          </UButton>
        </form>
      </UCard>

      <!-- Recipients List -->
      <div class="lg:col-span-2 space-y-4">
        <UCard>
          <template #header>
            <div class="flex justify-between items-center">
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-heroicons-list-bullet" />
                Active Recipients
              </h3>
              <UBadge color="gray" variant="solid">{{ recipients.length }} total</UBadge>
            </div>
          </template>

          <GenericDataTable 
            :data="recipients" 
            :columns="columns" 
            :loading="loading"
            row-key="id"
          >
            <template #cell-property_code="{ row }">
              <div class="flex flex-col">
                <span class="font-bold">{{ row.property_code }}</span>
                <span class="text-xs text-gray-500">{{ getPropertyName(row.property_code) }}</span>
              </div>
            </template>

            <template #cell-notification_types="{ row }">
              <div class="flex gap-1 flex-wrap">
                <UBadge
                  v-for="t in (row.notification_types || ['daily_summary'])"
                  :key="t"
                  :label="t === 'daily_summary' ? 'Summary' : 'Audit'"
                  :color="t === 'audit' ? 'amber' : 'primary'"
                  variant="subtle"
                  size="xs"
                />
              </div>
            </template>

            <template #cell-status="{ row }">
              <CellsBadgeCell 
                :text="row.is_active ? 'Active' : 'Inactive'"
                :color="row.is_active ? 'success' : 'neutral'" 
                variant="subtle"
                class="cursor-pointer"
                @click="toggleActive(row)"
              />
            </template>

            <template #cell-actions="{ row }">
              <div class="flex justify-end gap-2">
                <UButton
                  color="gray"
                  variant="ghost"
                  icon="i-heroicons-trash"
                  size="xs"
                  @click="deleteRecipient(row.id)"
                />
              </div>
            </template>
          </GenericDataTable>

          <div v-if="!loading && recipients.length === 0" class="text-center py-12">
            <UIcon name="i-heroicons-envelope" class="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p class="text-gray-500">No recipients configured yet.</p>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
