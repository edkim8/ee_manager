<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useFetch } from '#imports'
import { ROLES } from '../../constants/app-constants'
import { usePropertyMutation } from '../../composables/mutations/usePropertyMutation'
import { useConstantsMutation, type AppConstant } from '../../composables/mutations/useConstantsMutation'

const props = defineProps<{
  title: string
  category?: string
  propertyCode?: string
  onClose?: (refreshed: boolean) => void
}>()

const emit = defineEmits<{
  close: [boolean]
}>()

const { updateProperty } = usePropertyMutation()
const { fetchConstants, updateConstant, updateMultipleConstants } = useConstantsMutation()

const properties = ref<any[]>([])
const loading = ref(true)
const constantsLoading = ref(false)
const internalPropertyCode = ref<string>(props.propertyCode || '')
const propertyConstants = ref<any[]>([])

const tabs = computed(() => {
  if (props.category) {
    return [{ label: 'Settings', slot: 'settings' }]
  }
  return [
    { label: 'Properties', slot: 'properties' },
    { label: 'System Settings', slot: 'settings' },
    { label: 'Roles', slot: 'roles' }
  ]
})

onMounted(async () => {
  try {
    const { data } = await useFetch('/api/me')
    if (data.value && data.value.properties) {
      properties.value = JSON.parse(JSON.stringify(data.value.properties))
      
      // If no internal code set, use prop or first property
      if (!internalPropertyCode.value && properties.value.length > 0) {
        internalPropertyCode.value = properties.value[0].code
      }
    }
  } catch (error) {
    console.error('Failed to fetch properties:', error)
  } finally {
    loading.value = false
  }
})

const parseValue = (value: string, type: string) => {
  if (type === 'boolean') return value === 'true'
  if (type === 'number' || type === 'percent') return parseFloat(value) || 0
  return value
}

const formatValue = (value: any, type: string) => {
  return String(value)
}

const loadConstants = async (code: string) => {
  if (!code) return
  constantsLoading.value = true
  try {
    const raw = await fetchConstants(code)
    let filtered = raw
    if (props.category) {
      // If we passed a category, we might want to fetch related ones too if it's the "Available" context
      if (props.category.startsWith('Available_Status')) {
        filtered = raw.filter(c => c.category.startsWith('Available_Status'))
      } else {
        filtered = raw.filter(c => c.category === props.category)
      }
    }
    
    propertyConstants.value = filtered.map(c => ({
      ...c,
      displayValue: parseValue(c.value, c.data_type),
      saving: false
    }))
  } finally {
    constantsLoading.value = false
  }
}

watch(internalPropertyCode, (newCode) => {
  if (newCode) {
    loadConstants(newCode)
  }
}, { immediate: true })

const handleSaveProperty = async (property: any) => {
  property.saving = true
  await updateProperty(property.id, {
    name: property.name,
    code: property.code
  })
  property.saving = false
}

const handleSaveConstant = async (constant: any) => {
  constant.saving = true
  const success = await updateConstant(constant.id, formatValue(constant.displayValue, constant.data_type))
  if (success) {
    constant.value = formatValue(constant.displayValue, constant.data_type)
  }
  constant.saving = false
}

const savingAll = ref(false)
const hasChanges = computed(() => {
  return propertyConstants.value.some(c => formatValue(c.displayValue, c.data_type) !== c.value)
})

const handleSaveAll = async () => {
  const changes = propertyConstants.value
    .filter(c => formatValue(c.displayValue, c.data_type) !== c.value)
    .map(c => ({
      id: c.id,
      value: formatValue(c.displayValue, c.data_type)
    }))

  if (changes.length === 0) {
    console.debug('[ConstantsModal] No changes to save.')
    emit('close', false)
    return
  }

  console.log(`[ConstantsModal] Saving ${changes.length} constants...`)
  savingAll.value = true
  try {
    const success = await updateMultipleConstants(changes)
    console.log(`[ConstantsModal] Save result: ${success}`)
    
    if (success) {
      // Update local values to match new defaults
      propertyConstants.value.forEach(c => {
        c.value = formatValue(c.displayValue, c.data_type)
      })

      // IMPORTANT: Notify parent to refresh BEFORE closing
      if (props.onClose) {
        console.log('[ConstantsModal] Triggering parent refresh (onClose)...')
        props.onClose(true)
      }
      
      console.log('[ConstantsModal] Emitting close...')
      emit('close', true)
    }
  } catch (err) {
    console.error('[ConstantsModal] Critical error during handleSaveAll:', err)
  } finally {
    savingAll.value = false
  }
}

// Group constants by category, with special pairing for status theme/rules
const groupedConstants = computed(() => {
  const categories: Record<string, any[]> = {}
  
  // Standard grouping
  propertyConstants.value.forEach(c => {
    if (!categories[c.category]) categories[c.category] = []
    categories[c.category].push(c)
  })

  // Special pairing logic
  const themeCat = 'Available_Status_Theme'
  const rulesCat = 'Available_Status_Rules'
  
  if (categories[themeCat] || categories[rulesCat]) {
    const combinedCat = 'Status Configuration (Theme + Rules)'
    const pairs: any[] = []
    const processedIds = new Set()
    
    const themes = categories[themeCat] || []
    const rules = categories[rulesCat] || []
    const suffixes = ['past_due', 'urgent', 'approaching', 'scheduled']
    
    themes.forEach(theme => {
      const suffix = suffixes.find(s => theme.key.endsWith(s))
      if (suffix) {
        const rule = rules.find(r => r.key.endsWith(suffix))
        if (rule) {
          pairs.push({ type: 'pair', theme, rule, title: suffix.replace(/_/g, ' ').toUpperCase() })
          processedIds.add(theme.id)
          processedIds.add(rule.id)
          return
        }
      }
      pairs.push({ type: 'single', item: theme })
      processedIds.add(theme.id)
    })
    
    rules.forEach(rule => {
      if (!processedIds.has(rule.id)) {
        pairs.push({ type: 'single', item: rule })
      }
    })

    const finalGroups: Record<string, any[]> = {}
    
    // Add categories that were NOT the ones we combined
    Object.keys(categories).forEach(cat => {
      if (cat !== themeCat && cat !== rulesCat) {
        finalGroups[cat] = categories[cat].map(item => ({ type: 'single', item }))
      }
    })
    
    // Add our combined group at the top or bottom
    finalGroups[combinedCat] = pairs
    
    return finalGroups
  }

  // Fallback: wrap everything in 'single' type
  const wrapped: Record<string, any[]> = {}
  Object.keys(categories).forEach(cat => {
    wrapped[cat] = categories[cat].map(item => ({ type: 'single', item }))
  })
  return wrapped
})
</script>

<template>
  <UModal
    :title="props.title"
    :close="{ onClick: () => { if (props.onClose) props.onClose(false); emit('close', false) } }"
    :description="props.category ? 'Manage rules and appearance' : 'System-wide constants and configurations'"
    class="sm:max-w-3xl"
  >
    <template #body>
      <div class="h-[600px] overflow-y-auto pr-2">
        <UTabs :items="tabs" class="w-full">
          <!-- Properties Tab -->
          <template #properties>
            <div class="p-4">
              <div v-if="loading" class="flex justify-center py-8">
                <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin" />
              </div>
              <div v-else class="space-y-4">
                <div v-for="prop in properties" :key="prop.id" class="flex items-end gap-2 p-2 border border-gray-100 dark:border-gray-800 rounded-lg">
                   <UFormField label="Code" class="w-24">
                     <UInput v-model="prop.code" />
                   </UFormField>
                   <UFormField label="Name" class="flex-1">
                     <UInput v-model="prop.name" />
                   </UFormField>
                   <UButton 
                     label="Save" 
                     size="sm" 
                     color="primary"
                     :loading="prop.saving" 
                     @click="handleSaveProperty(prop)"
                     class="mb-1" 
                   />
                </div>
              </div>
            </div>
          </template>

          <!-- Settings Tab -->
          <template #settings>
            <div class="p-4">
              <div v-if="!props.propertyCode" class="mb-4">
                <UFormField label="Select Property">
                  <USelect 
                    v-model="internalPropertyCode" 
                    :options="properties.map(p => ({ label: p.name, value: p.code }))" 
                    placeholder="Choose a property"
                  />
                </UFormField>
              </div>

              <div v-if="constantsLoading" class="flex justify-center py-8">
                <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin" />
              </div>
              <div v-else-if="propertyConstants.length === 0" class="text-center py-8 text-gray-500 italic">
                No constants found.
              </div>
              <div v-else class="space-y-8">
                <div v-for="(rows, catName) in groupedConstants" :key="catName">
                  <h4 v-if="!props.category || catName.includes('Status')" class="text-sm font-bold uppercase tracking-wider text-primary-500 mb-4 border-b pb-1">
                    {{ catName }}
                  </h4>
                  <div class="space-y-6">
                    <div v-for="(row, idx) in rows" :key="idx">
                      <!-- Paired Row Layout -->
                      <div v-if="row.type === 'pair'" class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div class="text-[10px] font-bold text-gray-400 mb-3 tracking-widest uppercase">{{ row.title }}</div>
                        <div class="grid grid-cols-2 gap-8 items-start">
                          <!-- Theme Column -->
                          <div class="flex items-end gap-2">
                             <UFormField :label="row.theme.label" :help="row.theme.help_text" class="flex-1">
                               <UInput v-model="row.theme.displayValue" variant="outline" />
                             </UFormField>
                          </div>
                          <!-- Rule Column -->
                          <div class="flex items-end gap-2">
                             <UFormField :label="row.rule.label" :help="row.rule.help_text" class="flex-1">
                               <UInput v-model.number="row.rule.displayValue" type="number" variant="outline" />
                             </UFormField>
                          </div>
                        </div>
                      </div>

                      <!-- Single Item Layout -->
                      <div v-else class="flex items-end gap-2">
                        <UFormField :label="row.item.label" :help="row.item.help_text" class="flex-1">
                          <USwitch v-if="row.item.data_type === 'boolean'" v-model="row.item.displayValue" />
                          <UInput v-else-if="row.item.data_type === 'number'" v-model.number="row.item.displayValue" type="number" :min="row.item.min_value" :max="row.item.max_value" />
                          <UInput v-else v-model="row.item.displayValue" />
                        </UFormField>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
          
          <!-- Roles Tab -->
          <template #roles>
            <div class="p-4 space-y-2">
              <h4 class="text-sm font-medium mb-2">System Roles (Read Only)</h4>
              <div class="grid grid-cols-1 gap-2">
                <div v-for="role in ROLES" :key="role" class="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                  <UIcon name="i-heroicons-check-badge" class="text-primary-500" />
                  <span class="capitalize">{{ role }}</span>
                </div>
              </div>
            </div>
          </template>
        </UTabs>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 px-4 py-3">
        <UButton 
          label="Cancel" 
          color="neutral" 
          variant="ghost" 
          @click="() => { if (props.onClose) props.onClose(false); emit('close', false) }" 
        />
        <UButton 
          label="Save Changes" 
          color="primary" 
          :loading="savingAll"
          :disabled="!hasChanges"
          @click="handleSaveAll" 
        />
      </div>
    </template>
  </UModal>
</template>
