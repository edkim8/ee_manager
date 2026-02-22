<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  layout: 'dashboard'
})

// Composables
const { activeProperty } = usePropertyState()
const { fetchInstallations, createInstallation, updateInstallation, deleteInstallation } = useInventoryInstallations()
const { fetchItemDefinitions } = useInventoryItemDefinitions()
const { fetchUnits, fetchBuildings, fetchLocations } = useLocationSelector()

// State
const installations = ref([])
const itemDefinitions = ref([])
const loading = ref(false)
const error = ref(null)

// Filters
const selectedItemFilter = ref('')
const selectedStatusFilter = ref('')
const selectedHealthFilter = ref('')
const searchTerm = ref('')

// Modals
const showInstallationForm = ref(false)
const editingInstallation = ref(null)

// Form data
const installationForm = ref({
  item_definition_id: '',
  serial_number: '',
  asset_tag: '',
  install_date: '',
  warranty_expiration: '',
  purchase_price: null,
  supplier: '',
  location_type: 'unit',
  location_id: '',
  status: 'active',
  condition: 'excellent',
  notes: '',
})

// Location options (loaded dynamically based on location_type)
const units = ref([])
const buildings = ref([])
const locations = ref([])
const locationOptions = computed(() => {
  if (installationForm.value.location_type === 'unit') {
    return units.value
  } else if (installationForm.value.location_type === 'building') {
    return buildings.value
  } else if (installationForm.value.location_type === 'common_area') {
    return locations.value
  }
  return []
})

// Load data
onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  try {
    loading.value = true
    error.value = null

    // Load item definitions for the dropdown
    itemDefinitions.value = await fetchItemDefinitions({
      propertyCode: activeProperty.value
    })

    // Load installations
    await loadInstallations()

    // Load location options for dropdowns
    if (activeProperty.value) {
      units.value = await fetchUnits(activeProperty.value)
      buildings.value = await fetchBuildings(activeProperty.value)
      locations.value = await fetchLocations(activeProperty.value)
      console.log(`✅ Loaded ${units.value.length} units, ${buildings.value.length} buildings, ${locations.value.length} locations`)
    }

  } catch (err) {
    error.value = err.message
    console.error('Error loading data:', err)
  } finally {
    loading.value = false
  }
}

const loadInstallations = async () => {
  const filters: any = {
    propertyCode: activeProperty.value
  }

  if (selectedItemFilter.value) {
    filters.itemDefinitionId = selectedItemFilter.value
  }
  if (selectedStatusFilter.value) {
    filters.status = selectedStatusFilter.value
  }
  if (selectedHealthFilter.value) {
    filters.healthStatus = selectedHealthFilter.value
  }

  installations.value = await fetchInstallations(filters)
}

// Installation actions
const openInstallationForm = (installation = null) => {
  console.log('🏗️ Opening installation form:', installation ? 'EDIT' : 'CREATE')

  if (installation) {
    editingInstallation.value = installation
    installationForm.value = {
      item_definition_id: installation.item_definition_id,
      serial_number: installation.serial_number || '',
      asset_tag: installation.asset_tag || '',
      install_date: installation.install_date || '',
      warranty_expiration: installation.warranty_expiration || '',
      purchase_price: installation.purchase_price || null,
      supplier: installation.supplier || '',
      location_type: installation.location_type || 'unit',
      location_id: installation.location_id || '',
      status: installation.status,
      condition: installation.condition || 'excellent',
      notes: installation.notes || '',
    }
  } else {
    editingInstallation.value = null
    installationForm.value = {
      item_definition_id: selectedItemFilter.value || '',
      serial_number: '',
      asset_tag: '',
      install_date: new Date().toISOString().split('T')[0],
      warranty_expiration: '',
      purchase_price: null,
      supplier: '',
      location_type: 'unit',
      location_id: '',
      status: 'active',
      condition: 'excellent',
      notes: '',
    }
  }
  showInstallationForm.value = true
}

const saveInstallationForm = async () => {
  try {
    loading.value = true

    if (editingInstallation.value) {
      await updateInstallation(editingInstallation.value.id, installationForm.value)
    } else {
      const installationData = {
        ...installationForm.value,
        property_code: activeProperty.value,
        purchase_price: installationForm.value.purchase_price ? parseFloat(installationForm.value.purchase_price) : null
      }
      await createInstallation(installationData)
    }

    showInstallationForm.value = false
    await loadInstallations()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const handleDeleteInstallation = async (installationId: string) => {
  if (!confirm('Are you sure you want to delete this installation?')) return

  try {
    loading.value = true
    await deleteInstallation(installationId)
    await loadInstallations()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Computed
const filteredInstallations = computed(() => {
  if (!searchTerm.value) return installations.value

  const search = searchTerm.value.toLowerCase()
  return installations.value.filter(inst =>
    inst.serial_number?.toLowerCase().includes(search) ||
    inst.asset_tag?.toLowerCase().includes(search) ||
    inst.brand?.toLowerCase().includes(search) ||
    inst.model?.toLowerCase().includes(search) ||
    inst.location_name?.toLowerCase().includes(search)
  )
})

const getItemLabel = (itemId: string) => {
  const item = itemDefinitions.value.find(i => i.id === itemId)
  return item ? `${item.brand} ${item.model}` : 'Unknown Item'
}

const getHealthBadgeClass = (status: string): string => {
  const classes = {
    healthy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    critical: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    expired: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  }
  return classes[status] || classes.unknown
}

const getStatusBadgeClass = (status: string): string => {
  const classes = {
    active: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    maintenance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    retired: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    disposed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  }
  return classes[status] || classes.active
}

const getWarrantyBadgeClass = (status: string): string => {
  const classes = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    expiring_soon: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    expired: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  }
  return classes[status] || classes.unknown
}

const formatWarrantyStatus = (status: string): string => {
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-2">
        <NuxtLink
          to="/office/inventory"
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          📦 Catalog
        </NuxtLink>
        <span class="text-gray-400">/</span>
        <h1 class="text-3xl font-bold">🏗️ Installations</h1>
      </div>
      <p class="text-gray-600 dark:text-gray-400">Track physical inventory assets installed at locations</p>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-400 p-4 rounded-lg mb-4">
      ❌ {{ error }}
    </div>

    <!-- Filters & Actions -->
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Item Filter -->
        <select
          v-model="selectedItemFilter"
          @change="loadInstallations"
          class="px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
        >
          <option value="">All Items</option>
          <option v-for="item in itemDefinitions" :key="item.id" :value="item.id">
            {{ item.brand }} {{ item.model }}
          </option>
        </select>

        <!-- Status Filter -->
        <select
          v-model="selectedStatusFilter"
          @change="loadInstallations"
          class="px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="maintenance">Maintenance</option>
          <option value="retired">Retired</option>
          <option value="disposed">Disposed</option>
        </select>

        <!-- Health Filter -->
        <select
          v-model="selectedHealthFilter"
          @change="loadInstallations"
          class="px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
        >
          <option value="">All Health</option>
          <option value="healthy">Healthy</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
          <option value="expired">Expired</option>
        </select>

        <!-- Add Button -->
        <button
          @click="openInstallationForm()"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
        >
          ➕ Add Installation
        </button>
      </div>

      <!-- Search -->
      <div class="mt-4">
        <input
          v-model="searchTerm"
          type="text"
          placeholder="Search by serial, asset tag, item, location..."
          class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
        />
      </div>
    </div>

    <!-- Installations List -->
    <div v-if="loading && installations.length === 0" class="space-y-3">
      <div v-for="i in 5" :key="i" class="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>
    </div>

    <div v-else-if="filteredInstallations.length === 0" class="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <span class="text-6xl mb-4 block">📦</span>
      <p class="text-gray-500 dark:text-gray-400 text-lg mb-2">No installations found</p>
      <p class="text-sm text-gray-400">Add your first installation to get started</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="inst in filteredInstallations"
        :key="inst.id"
        class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
        @click="openInstallationForm(inst)"
      >
        <div class="flex items-start justify-between">
          <!-- Left: Item Info -->
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <h3 class="font-semibold text-lg">{{ inst.brand }} {{ inst.model }}</h3>
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ inst.category_name }}</span>
            </div>

            <!-- Details Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
              <!-- Serial/Asset -->
              <div>
                <span class="text-gray-500 dark:text-gray-400 block text-xs">Serial / Asset</span>
                <span class="font-mono">{{ inst.serial_number || '-' }}</span>
                <span v-if="inst.asset_tag" class="text-gray-400 dark:text-gray-500"> / {{ inst.asset_tag }}</span>
              </div>

              <!-- Location -->
              <div>
                <span class="text-gray-500 dark:text-gray-400 block text-xs">Location</span>
                <span>{{ inst.location_name || inst.location_type || '-' }}</span>
              </div>

              <!-- Age -->
              <div>
                <span class="text-gray-500 dark:text-gray-400 block text-xs">Age / Life Remaining</span>
                <span v-if="inst.age_years !== null">{{ inst.age_years }}y / {{ inst.life_remaining_years }}y</span>
                <span v-else>-</span>
              </div>

              <!-- Install Date -->
              <div>
                <span class="text-gray-500 dark:text-gray-400 block text-xs">Installed</span>
                <span>{{ inst.install_date || '-' }}</span>
              </div>
            </div>

            <!-- Badges -->
            <div class="flex items-center gap-2 flex-wrap">
              <!-- Status -->
              <span class="px-2 py-1 text-xs font-medium rounded" :class="getStatusBadgeClass(inst.status)">
                {{ inst.status }}
              </span>

              <!-- Health Status -->
              <span class="px-2 py-1 text-xs font-medium rounded" :class="getHealthBadgeClass(inst.health_status)">
                {{ inst.health_status }}
              </span>

              <!-- Warranty Status -->
              <span class="px-2 py-1 text-xs font-medium rounded" :class="getWarrantyBadgeClass(inst.warranty_status)">
                ⚠️ {{ formatWarrantyStatus(inst.warranty_status) }}
              </span>

              <!-- Condition -->
              <span v-if="inst.condition" class="px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {{ inst.condition }}
              </span>
            </div>
          </div>

          <!-- Right: Actions -->
          <div class="ml-4">
            <button
              @click.stop="handleDeleteInstallation(inst.id)"
              class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- INSTALLATION FORM MODAL -->
    <div
      v-if="showInstallationForm"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      @click.self="showInstallationForm = false"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full my-8">
        <h2 class="text-xl font-bold mb-4">
          {{ editingInstallation ? 'Edit Installation' : 'Add Installation' }}
        </h2>

        <form @submit.prevent="saveInstallationForm" class="space-y-4">
          <!-- Item Selection -->
          <LocationSelector
            v-model="installationForm.item_definition_id"
            :options="itemDefinitions.map(item => ({
              id: item.id,
              name: `${item.category_name} - ${item.brand} ${item.model}`
            }))"
            label="Item"
            placeholder="Select item from catalog..."
            required
          />

          <!-- Serial Number & Asset Tag -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Serial Number</label>
              <input
                v-model="installationForm.serial_number"
                type="text"
                placeholder="e.g. RF28R720123456"
                class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Asset Tag</label>
              <input
                v-model="installationForm.asset_tag"
                type="text"
                placeholder="e.g. WO-REF-0101"
                class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
              />
            </div>
          </div>

          <!-- Install Date & Warranty -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Install Date</label>
              <input
                v-model="installationForm.install_date"
                type="date"
                class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Warranty Expiration</label>
              <input
                v-model="installationForm.warranty_expiration"
                type="date"
                class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
              />
            </div>
          </div>

          <!-- Purchase Price & Supplier -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Purchase Price</label>
              <input
                v-model="installationForm.purchase_price"
                type="number"
                step="0.01"
                placeholder="0.00"
                class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Supplier</label>
              <input
                v-model="installationForm.supplier"
                type="text"
                placeholder="e.g. Home Depot"
                class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
              />
            </div>
          </div>

          <!-- Location -->
          <div class="space-y-4">
            <!-- Location Type -->
            <div>
              <label class="block text-sm font-medium mb-1">Location Type *</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="type in ['unit', 'building', 'common_area']"
                  :key="type"
                  type="button"
                  @click="installationForm.location_type = type; installationForm.location_id = ''"
                  class="px-4 py-3 border-2 rounded-lg font-medium transition-colors capitalize"
                  :class="installationForm.location_type === type
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:border-blue-500'"
                >
                  {{ type === 'common_area' ? 'Common' : type }}
                </button>
              </div>
            </div>

            <!-- Location Selector -->
            <LocationSelector
              v-model="installationForm.location_id"
              :options="locationOptions"
              :label="installationForm.location_type === 'unit' ? 'Unit' : installationForm.location_type === 'building' ? 'Building' : 'Common Area'"
              :placeholder="`Select ${installationForm.location_type === 'common_area' ? 'common area' : installationForm.location_type}...`"
              required
            />
          </div>

          <!-- Status & Condition -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Status *</label>
              <select
                v-model="installationForm.status"
                required
                class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
                <option value="disposed">Disposed</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Condition</label>
              <select
                v-model="installationForm.condition"
                class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium mb-1">Notes</label>
            <textarea
              v-model="installationForm.notes"
              rows="3"
              placeholder="Installation notes, maintenance history, etc."
              class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
            ></textarea>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              @click="showInstallationForm = false"
              class="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {{ loading ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
