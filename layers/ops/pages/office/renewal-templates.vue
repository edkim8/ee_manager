<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSupabaseClient, useToast, useHead } from '#imports'

definePageMeta({
  layout: 'dashboard',
  middleware: ['renewal-templates']
})

useHead({ title: 'Renewal Letter Templates' })

const supabase = useSupabaseClient()
const toast = useToast()

// ── Types ─────────────────────────────────────────────────────────────────────

interface RenewalTemplate {
  property_code:    string
  community_name:   string
  manager_name:     string
  manager_phone:    string
  letterhead_url:   string | null
  docx_template_url: string | null
  updated_at:       string
}

// ── State ──────────────────────────────────────────────────────────────────────

const templates  = ref<RenewalTemplate[]>([])
const loading    = ref(false)
const saving     = ref<Record<string, boolean>>({})
const uploading  = ref<Record<string, boolean>>({})

/** Local editable copies per property_code */
const drafts = ref<Record<string, { community_name: string; manager_name: string; manager_phone: string }>>({})

// ── Merge field reference ──────────────────────────────────────────────────────

const MERGE_FIELDS = [
  { field: '«resident_name»',       source: 'Resident full name',                    example: 'John Smith' },
  { field: '«roommate_names»',      source: 'Additional occupant names',             example: 'Jane Smith' },
  { field: '«unit»',               source: 'Unit number',                           example: '2105' },
  { field: '«lease_to_date»',      source: 'Current lease end date',               example: 'Apr 30, 2026' },
  { field: '«lease_rent»',         source: 'Current rent amount',                   example: '$1,500' },
  { field: '«primary_term»',       source: 'Primary renewal term (months)',         example: '12' },
  { field: '«primary_rent»',       source: 'Primary term renewal rent',             example: '$1,552' },
  { field: '«first_term»',         source: 'First alternate term (months)',         example: '6' },
  { field: '«first_term_rent»',    source: 'First alternate term rent',             example: '$1,578' },
  { field: '«second_term»',        source: 'Second alternate term (months)',        example: '3' },
  { field: '«second_term_rent»',   source: 'Second alternate term rent',            example: '$1,593' },
  { field: '«third_term»',         source: 'Third alternate term (months)',         example: '1' },
  { field: '«third_term_rent»',    source: 'Third alternate term rent',             example: '$1,615' },
  { field: '«mtm_rent»',           source: 'Month-to-month rent',                  example: '$1,750' },
  { field: '«early_discount»',     source: 'Early renewal discount amount',         example: '$100' },
  { field: '«early_discount_date»',source: 'Deadline for early discount',           example: 'Mar 31, 2026' },
]

// ── Data fetching ──────────────────────────────────────────────────────────────

async function fetchTemplates() {
  loading.value = true
  try {
    const data = await $fetch<RenewalTemplate[]>('/api/renewal-templates')
    templates.value = data || []
    // Init drafts
    for (const tmpl of templates.value) {
      drafts.value[tmpl.property_code] = {
        community_name: tmpl.community_name,
        manager_name:   tmpl.manager_name,
        manager_phone:  tmpl.manager_phone,
      }
    }
  } catch (err: any) {
    toast.add({ title: 'Error', description: 'Failed to load templates.', color: 'error' })
  } finally {
    loading.value = false
  }
}

// ── Save text fields ───────────────────────────────────────────────────────────

async function saveTextFields(code: string) {
  saving.value[code] = true
  try {
    await $fetch(`/api/renewal-templates/${code}`, {
      method: 'PATCH',
      body: drafts.value[code],
    })
    // Sync back to templates list
    const tmpl = templates.value.find(t => t.property_code === code)
    if (tmpl) Object.assign(tmpl, drafts.value[code])
    toast.add({ title: 'Saved', description: `${code} template updated.`, color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.data?.message || 'Save failed.', color: 'error' })
  } finally {
    saving.value[code] = false
  }
}

// ── File upload helpers ────────────────────────────────────────────────────────

async function uploadLetterhead(code: string, file: File) {
  uploading.value[`${code}-lh`] = true
  try {
    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `renewal-templates/${code}-letterhead.${ext}`

    const { error: upErr } = await supabase.storage
      .from('images')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (upErr) throw upErr

    const { data: urlData } = supabase.storage.from('images').getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    await $fetch(`/api/renewal-templates/${code}`, {
      method: 'PATCH',
      body: { letterhead_url: publicUrl },
    })

    const tmpl = templates.value.find(t => t.property_code === code)
    if (tmpl) tmpl.letterhead_url = publicUrl + `?t=${Date.now()}` // cache-bust preview

    toast.add({ title: 'Uploaded', description: `${code} letterhead updated.`, color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Upload Error', description: err.message || 'Upload failed.', color: 'error' })
  } finally {
    uploading.value[`${code}-lh`] = false
  }
}

async function uploadDocx(code: string, file: File) {
  uploading.value[`${code}-docx`] = true
  try {
    const path = `renewal-templates/${code}_Renewal_Letter_Template.docx`

    const { error: upErr } = await supabase.storage
      .from('documents')
      .upload(path, file, {
        upsert: true,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

    if (upErr) throw upErr

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    await $fetch(`/api/renewal-templates/${code}`, {
      method: 'PATCH',
      body: { docx_template_url: publicUrl },
    })

    const tmpl = templates.value.find(t => t.property_code === code)
    if (tmpl) tmpl.docx_template_url = publicUrl

    toast.add({ title: 'Uploaded', description: `${code} DOCX template updated.`, color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Upload Error', description: err.message || 'Upload failed.', color: 'error' })
  } finally {
    uploading.value[`${code}-docx`] = false
  }
}

// ── File input triggers ────────────────────────────────────────────────────────

function triggerLetterheadPicker(code: string) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/jpeg,image/png,image/webp'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) uploadLetterhead(code, file)
  }
  input.click()
}

function triggerDocxPicker(code: string) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) uploadDocx(code, file)
  }
  input.click()
}

// ── Download starter template ──────────────────────────────────────────────────

function downloadStarterTemplate() {
  const link = document.createElement('a')
  link.href = '/templates/RS_Multi_Renewal_Letter_Template.docx'
  link.download = 'Renewal_Letter_Starter_Template.docx'
  link.click()
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────

onMounted(fetchTemplates)
</script>

<template>
  <div class="p-6 max-w-6xl mx-auto space-y-8">

    <!-- Header -->
    <div class="flex justify-between items-end">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Renewal Letter Templates</h1>
        <p class="text-gray-500 mt-1">
          Per-property letterhead images, DOCX templates, and letter body text.
        </p>
      </div>
      <UButton
        icon="i-heroicons-arrow-down-tray"
        color="neutral"
        variant="outline"
        label="Download Starter DOCX"
        @click="downloadStarterTemplate"
      />
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-1 gap-6">
      <USkeleton v-for="i in 5" :key="i" class="h-56 rounded-xl" />
    </div>

    <!-- Property cards -->
    <div v-else class="grid grid-cols-1 gap-6">
      <UCard v-for="tmpl in templates" :key="tmpl.property_code">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <UBadge :label="tmpl.property_code" color="primary" variant="solid" size="lg" class="font-mono" />
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ drafts[tmpl.property_code]?.community_name || tmpl.property_code }}
              </h3>
            </div>
            <span class="text-xs text-gray-400">
              Updated {{ new Date(tmpl.updated_at).toLocaleDateString() }}
            </span>
          </div>
        </template>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- Left: Letterhead preview + upload -->
          <div class="space-y-3">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Letterhead Image</p>

            <!-- Preview -->
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800 min-h-[80px] flex items-center justify-center">
              <img
                v-if="tmpl.letterhead_url"
                :src="tmpl.letterhead_url"
                alt="Letterhead"
                class="max-h-16 max-w-full object-contain"
              />
              <span v-else class="text-xs text-gray-400 italic">No letterhead uploaded</span>
            </div>

            <UButton
              icon="i-heroicons-arrow-up-tray"
              color="neutral"
              variant="outline"
              size="sm"
              block
              :loading="uploading[`${tmpl.property_code}-lh`]"
              @click="triggerLetterheadPicker(tmpl.property_code)"
            >
              {{ tmpl.letterhead_url ? 'Replace Image' : 'Upload Image' }}
            </UButton>

            <p class="text-[11px] text-gray-400">JPG or PNG · shown at top of each letter page · max 5 MB</p>
          </div>

          <!-- Middle: DOCX template -->
          <div class="space-y-3">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Word Mail Merge Template (.docx)</p>

            <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800 min-h-[80px] flex items-center gap-3">
              <UIcon
                :name="tmpl.docx_template_url ? 'i-heroicons-document-check' : 'i-heroicons-document'"
                class="w-8 h-8 flex-shrink-0"
                :class="tmpl.docx_template_url ? 'text-blue-500' : 'text-gray-300'"
              />
              <div>
                <p class="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {{ tmpl.docx_template_url ? `${tmpl.property_code}_Renewal_Letter_Template.docx` : 'No template uploaded' }}
                </p>
                <a
                  v-if="tmpl.docx_template_url"
                  :href="tmpl.docx_template_url"
                  target="_blank"
                  class="text-xs text-primary-500 hover:underline"
                >
                  Download current
                </a>
              </div>
            </div>

            <UButton
              icon="i-heroicons-arrow-up-tray"
              color="neutral"
              variant="outline"
              size="sm"
              block
              :loading="uploading[`${tmpl.property_code}-docx`]"
              @click="triggerDocxPicker(tmpl.property_code)"
            >
              {{ tmpl.docx_template_url ? 'Replace Template' : 'Upload Template' }}
            </UButton>

            <p class="text-[11px] text-gray-400">.docx with «merge_field» placeholders · see field reference below</p>
          </div>

          <!-- Right: Community info fields -->
          <div class="space-y-3">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Letter Body Text</p>

            <UFormField label="Community Name">
              <UInput
                v-model="drafts[tmpl.property_code].community_name"
                placeholder="e.g. Residences at 4225"
                size="sm"
              />
            </UFormField>

            <UFormField label="Manager Name">
              <UInput
                v-model="drafts[tmpl.property_code].manager_name"
                placeholder="e.g. Audrey Stone | Community Manager"
                size="sm"
              />
            </UFormField>

            <UFormField label="Manager Phone">
              <UInput
                v-model="drafts[tmpl.property_code].manager_phone"
                placeholder="e.g. 602.795.2790"
                size="sm"
              />
            </UFormField>

            <UButton
              icon="i-heroicons-check"
              color="primary"
              size="sm"
              block
              :loading="saving[tmpl.property_code]"
              @click="saveTextFields(tmpl.property_code)"
            >
              Save
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Empty state -->
      <div v-if="!loading && templates.length === 0" class="text-center py-16">
        <UIcon name="i-heroicons-document-text" class="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500">No templates found. Run the database migration to seed initial records.</p>
      </div>
    </div>

    <!-- Merge Field Reference -->
    <UCard>
      <template #header>
        <h3 class="font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-table-cells" class="w-4 h-4" />
          Merge Field Reference
        </h3>
        <p class="text-sm text-gray-500 mt-1">
          Insert these placeholders into your Word template. Word's mail merge will replace them with live data from the renewal worksheet.
        </p>
      </template>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-2 pr-6 font-semibold text-gray-700 dark:text-gray-300">Field Placeholder</th>
              <th class="text-left py-2 pr-6 font-semibold text-gray-700 dark:text-gray-300">Data Source</th>
              <th class="text-left py-2 font-semibold text-gray-700 dark:text-gray-300">Example Value</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in MERGE_FIELDS"
              :key="row.field"
              class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td class="py-2 pr-6">
                <code class="text-xs bg-gray-100 dark:bg-gray-800 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded font-mono">
                  {{ row.field }}
                </code>
              </td>
              <td class="py-2 pr-6 text-gray-600 dark:text-gray-400">{{ row.source }}</td>
              <td class="py-2 text-gray-500 dark:text-gray-500 font-mono text-xs">{{ row.example }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <template #footer>
        <p class="text-xs text-gray-400">
          In Word, insert merge fields via <strong>Mailings → Insert Merge Field</strong> after connecting the exported Excel file as your data source.
          Fields are case-sensitive — use exactly the names above.
        </p>
      </template>
    </UCard>

  </div>

  <!-- Context Helper -->
  <ContextHelper
    title="Renewal Letter Templates"
    description="Per-property letterhead, DOCX templates & letter body configuration"
  >
    <div class="space-y-4 text-sm leading-relaxed">

      <section>
        <h4 class="font-semibold text-gray-900 dark:text-white mb-1">What This Page Does</h4>
        <p>
          This page controls the assets used when generating renewal offer letters for each property.
          Changes here affect the next PDF or Word mail merge generated from any renewal worksheet.
        </p>
      </section>

      <section>
        <h4 class="font-semibold text-gray-900 dark:text-white mb-1">Letterhead Image</h4>
        <p>
          Upload a JPG or PNG logo for each property. The image is embedded at the top center of
          every letter page when PDF letters are generated. If no image is uploaded, the letter
          renders without a letterhead.
        </p>
        <p class="mt-1 text-gray-500">
          Recommended: a wide banner-style image at roughly 4:1 aspect ratio (e.g. 600×150 px).
          Max file size 5 MB.
        </p>
      </section>

      <section>
        <h4 class="font-semibold text-gray-900 dark:text-white mb-1">Word Mail Merge Template (.docx)</h4>
        <p>
          Upload a Word document containing <code class="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">«merge_field»</code> placeholders.
          Users download this template from the renewal worksheet and use it with the exported
          Excel data file in Word's Mailings → Start Mail Merge workflow.
        </p>
        <p class="mt-1 text-gray-500">
          Don't have a template yet? Use the <strong>Download Starter DOCX</strong> button to get
          the RS reference template as a starting point. Open it in Word and replace the community
          name, manager name, and any property-specific language before uploading.
        </p>
      </section>

      <section>
        <h4 class="font-semibold text-gray-900 dark:text-white mb-1">Letter Body Text</h4>
        <p>Three fields personalise the body of every generated letter:</p>
        <ul class="list-disc list-inside space-y-1 mt-1 text-gray-700 dark:text-gray-300">
          <li><strong>Community Name</strong> — appears in the opening and closing paragraphs (e.g. "Residences at 4225")</li>
          <li><strong>Manager Name</strong> — appears in the signature line (e.g. "Audrey Stone | Community Manager")</li>
          <li><strong>Manager Phone</strong> — appended to the signature line (e.g. "602.795.2790")</li>
        </ul>
        <p class="mt-1 text-gray-500">
          Click <strong>Save</strong> after editing. Changes take effect on the next letter generation.
        </p>
      </section>

      <section>
        <h4 class="font-semibold text-gray-900 dark:text-white mb-1">Merge Field Reference</h4>
        <p>
          The table at the bottom of this page lists all 16 merge fields. When building or editing
          a DOCX template in Word, insert fields via
          <strong>Mailings → Insert Merge Field</strong> after connecting the Excel data file.
          Field names are case-sensitive — use exactly the names shown.
        </p>
        <p class="mt-1 text-gray-500">
          Fields left blank in the worksheet (e.g. no early discount configured) are automatically
          omitted from the PDF — they will not appear as blank lines.
        </p>
      </section>

      <section>
        <h4 class="font-semibold text-gray-900 dark:text-white mb-1">How Templates Are Resolved</h4>
        <p>When generating a PDF, the system looks for the letterhead in this order:</p>
        <ol class="list-decimal list-inside space-y-1 mt-1 text-gray-700 dark:text-gray-300">
          <li>Letterhead URL stored in this page (Supabase Storage)</li>
          <li>Local <code class="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">/public/images/letterheads/{code}.jpg</code> fallback</li>
          <li>No letterhead — letter still renders correctly</li>
        </ol>
      </section>

    </div>
  </ContextHelper>

</template>
