<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// Composables
const { fetchCategories } = useInventoryCategories()
const { fetchItems, createItem, fetchItemWithLifecycle, deleteItem } = useInventoryItems()
const { addAttachment, fetchAttachments } = useAttachments()
const { addInstallEvent, fetchHistory } = useInventoryHistory()
const { getHealthColor, getHealthLabel, calculateLifecycleProgress } = useInventoryLifecycle()

// State
const categories = ref([])
const items = ref([])
const selectedItem = ref(null)
const itemPhotos = ref([])
const itemHistory = ref([])
const loading = ref(false)
const error = ref(null)

// Form state
const showForm = ref(false)
const formData = ref({
  category_id: '',
  brand: '',
  model: '',
  serial_number: '',
  seller: '',
  install_date: new Date().toISOString().split('T')[0], // Today
  location_type: 'unit',
  location_id: '00000000-0000-0000-0000-000000000000', // Test UUID
  property_code: 'TEST',
  status: 'active',
  notes: '',
  cost: 0,
  vendor: '',
})
const photoFile = ref(null)

// Load initial data
onMounted(async () => {
  try {
    categories.value = await fetchCategories()
    await loadItems()
  } catch (err) {
    error.value = err.message
    console.error('Error loading data:', err)
  }
})

// Load items
const loadItems = async () => {
  try {
    loading.value = true
    items.value = await fetchItems({ propertyCode: 'TEST' })
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Handle photo file selection
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    photoFile.value = target.files[0]
  }
}

// Create new item
const handleSubmit = async () => {
  try {
    loading.value = true
    error.value = null

    // 1. Create item
    const newItem = await createItem({
      category_id: formData.value.category_id,
      brand: formData.value.brand || null,
      model: formData.value.model || null,
      serial_number: formData.value.serial_number || null,
      seller: formData.value.seller || null,
      install_date: formData.value.install_date || null,
      location_type: formData.value.location_type,
      location_id: formData.value.location_id,
      property_code: formData.value.property_code,
      status: formData.value.status,
      notes: formData.value.notes || null,
    })

    console.log('✅ Item created:', newItem.id)

    // 2. Upload photo if provided
    let attachmentId = null
    if (photoFile.value) {
      const attachment = await addAttachment(
        newItem.id,
        'inventory_item',
        photoFile.value,
        'image'
      )
      attachmentId = attachment.id
      console.log('✅ Photo uploaded:', attachment.id)
    }

    // 3. Log install event
    await addInstallEvent(newItem.id, {
      event_date: formData.value.install_date,
      description: 'Initial installation (Test)',
      cost: formData.value.cost || null,
      vendor: formData.value.vendor || null,
      attachment_id: attachmentId,
    })

    console.log('✅ Install event logged')

    // Reset form
    showForm.value = false
    resetForm()
    await loadItems()

    alert('✅ Item created successfully!')
  } catch (err) {
    error.value = err.message
    console.error('Error creating item:', err)
    alert('❌ Error: ' + err.message)
  } finally {
    loading.value = false
  }
}

// Reset form
const resetForm = () => {
  formData.value = {
    category_id: '',
    brand: '',
    model: '',
    serial_number: '',
    seller: '',
    install_date: new Date().toISOString().split('T')[0],
    location_type: 'unit',
    location_id: '00000000-0000-0000-0000-000000000000',
    property_code: 'TEST',
    status: 'active',
    notes: '',
    cost: 0,
    vendor: '',
  }
  photoFile.value = null
}

// View item details
const viewItem = async (item: any) => {
  try {
    loading.value = true
    selectedItem.value = await fetchItemWithLifecycle(item.id)
    itemPhotos.value = await fetchAttachments(item.id, 'inventory_item')
    itemHistory.value = await fetchHistory(item.id)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Delete item
const handleDelete = async (itemId: string) => {
  if (!confirm('Are you sure you want to delete this item?')) return

  try {
    loading.value = true
    await deleteItem(itemId)
    await loadItems()
    if (selectedItem.value?.id === itemId) {
      selectedItem.value = null
    }
    alert('✅ Item deleted')
  } catch (err) {
    error.value = err.message
    alert('❌ Error: ' + err.message)
  } finally {
    loading.value = false
  }
}

// Event type icons
const eventIcons = {
  install: '🔧',
  refinish: '🎨',
  replace: '🔄',
  repair: '⚙️',
  retire: '🗑️',
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">🧪 Inventory System Test</h1>
      <p class="text-gray-600">Test page for composables verification</p>
    </div>

    <!-- Error Display -->
    <UAlert v-if="error" color="red" icon="i-heroicons-exclamation-triangle" class="mb-4">
      {{ error }}
    </UAlert>

    <!-- Action Bar -->
    <div class="flex gap-4 mb-6">
      <UButton @click="showForm = !showForm" icon="i-heroicons-plus">
        {{ showForm ? 'Cancel' : 'Add Test Item' }}
      </UButton>
      <UButton @click="loadItems" icon="i-heroicons-arrow-path" color="gray" :loading="loading">
        Refresh
      </UButton>
    </div>

    <!-- Create Form -->
    <UCard v-if="showForm" class="mb-6">
      <template #header>
        <h2 class="text-xl font-semibold">Create Test Item</h2>
      </template>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <!-- Category -->
          <UFormGroup label="Category *" required>
            <USelectMenu
              v-model="formData.category_id"
              :options="categories"
              option-attribute="name"
              value-attribute="id"
              placeholder="Select category"
            />
          </UFormGroup>

          <!-- Install Date -->
          <UFormGroup label="Install Date">
            <UInput v-model="formData.install_date" type="date" />
          </UFormGroup>

          <!-- Brand -->
          <UFormGroup label="Brand">
            <UInput v-model="formData.brand" placeholder="e.g. Samsung" />
          </UFormGroup>

          <!-- Model -->
          <UFormGroup label="Model">
            <UInput v-model="formData.model" placeholder="e.g. RF28R7201SR" />
          </UFormGroup>

          <!-- Serial Number -->
          <UFormGroup label="Serial Number">
            <UInput v-model="formData.serial_number" placeholder="e.g. SN123456789" />
          </UFormGroup>

          <!-- Seller -->
          <UFormGroup label="Seller">
            <UInput v-model="formData.seller" placeholder="e.g. Home Depot" />
          </UFormGroup>

          <!-- Cost -->
          <UFormGroup label="Cost">
            <UInput v-model.number="formData.cost" type="number" step="0.01" icon="i-heroicons-currency-dollar" />
          </UFormGroup>

          <!-- Vendor -->
          <UFormGroup label="Vendor">
            <UInput v-model="formData.vendor" placeholder="e.g. ABC Appliances" />
          </UFormGroup>
        </div>

        <!-- Notes -->
        <UFormGroup label="Notes">
          <UTextarea v-model="formData.notes" placeholder="Additional notes..." />
        </UFormGroup>

        <!-- Photo Upload -->
        <UFormGroup label="Photo (Optional)">
          <input
            type="file"
            accept="image/*"
            @change="handleFileChange"
            class="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary-50 file:text-primary-700
              hover:file:bg-primary-100"
          />
          <p class="text-sm text-gray-500 mt-1">Images are auto-compressed before upload (~90% size reduction)</p>
        </UFormGroup>

        <!-- Submit -->
        <div class="flex justify-end gap-2">
          <UButton type="button" color="gray" @click="showForm = false">Cancel</UButton>
          <UButton type="submit" :loading="loading" :disabled="!formData.category_id">
            Create Item
          </UButton>
        </div>
      </form>
    </UCard>

    <!-- Items Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Items List -->
      <div>
        <h2 class="text-xl font-semibold mb-4">Test Items ({{ items.length }})</h2>

        <div v-if="items.length === 0" class="text-center py-12 text-gray-500">
          <p class="text-lg mb-2">No items yet</p>
          <p class="text-sm">Click "Add Test Item" to create one</p>
        </div>

        <div v-else class="space-y-3">
          <UCard
            v-for="item in items"
            :key="item.id"
            :ui="{ body: { padding: 'p-4 sm:p-4' } }"
            class="cursor-pointer hover:shadow-md transition-shadow"
            @click="viewItem(item)"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-semibold">{{ item.category_name }}</h3>
                  <UBadge :color="getHealthColor(item.health_status)" size="xs">
                    {{ getHealthLabel(item.health_status) }}
                  </UBadge>
                </div>
                <p class="text-sm text-gray-600">
                  {{ item.brand }} {{ item.model }}
                </p>
                <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span v-if="item.age_years !== null">Age: {{ item.age_years }}y</span>
                  <span v-if="item.life_remaining_years !== null">
                    Life: {{ item.life_remaining_years }}y
                  </span>
                  <span>📸 {{ item.photo_count }}</span>
                </div>
                <!-- Health Progress Bar -->
                <div v-if="item.install_date" class="mt-2">
                  <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      class="h-full transition-all"
                      :class="{
                        'bg-green-500': item.health_status === 'healthy',
                        'bg-yellow-500': item.health_status === 'warning',
                        'bg-orange-500': item.health_status === 'critical',
                        'bg-red-500': item.health_status === 'expired',
                        'bg-gray-400': item.health_status === 'unknown',
                      }"
                      :style="{ width: calculateLifecycleProgress(item.install_date, item.expected_life_years) + '%' }"
                    />
                  </div>
                </div>
              </div>
              <UButton
                icon="i-heroicons-trash"
                color="red"
                variant="ghost"
                size="sm"
                @click.stop="handleDelete(item.id)"
              />
            </div>
          </UCard>
        </div>
      </div>

      <!-- Item Details -->
      <div v-if="selectedItem">
        <h2 class="text-xl font-semibold mb-4">Item Details</h2>

        <UCard class="mb-4">
          <div class="space-y-3">
            <div>
              <h3 class="font-semibold text-lg">{{ selectedItem.category_name }}</h3>
              <p class="text-gray-600">{{ selectedItem.brand }} {{ selectedItem.model }}</p>
            </div>

            <div class="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span class="text-gray-500">Serial:</span>
                <span class="ml-2">{{ selectedItem.serial_number || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-gray-500">Seller:</span>
                <span class="ml-2">{{ selectedItem.seller || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-gray-500">Install Date:</span>
                <span class="ml-2">{{ selectedItem.install_date || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-gray-500">Status:</span>
                <span class="ml-2">{{ selectedItem.status }}</span>
              </div>
            </div>

            <div v-if="selectedItem.notes" class="pt-2 border-t">
              <p class="text-sm text-gray-600">{{ selectedItem.notes }}</p>
            </div>
          </div>
        </UCard>

        <!-- Photos -->
        <UCard v-if="itemPhotos.length > 0" class="mb-4">
          <template #header>
            <h3 class="font-semibold">Photos ({{ itemPhotos.length }})</h3>
          </template>
          <div class="grid grid-cols-2 gap-2">
            <img
              v-for="photo in itemPhotos"
              :key="photo.id"
              :src="photo.file_url"
              :alt="photo.file_name"
              class="w-full h-32 object-cover rounded"
            />
          </div>
        </UCard>

        <!-- Event History -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">Event History ({{ itemHistory.length }})</h3>
          </template>
          <div v-if="itemHistory.length === 0" class="text-center py-4 text-gray-500 text-sm">
            No events recorded
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="event in itemHistory"
              :key="event.id"
              class="flex gap-3 pb-3 border-b last:border-b-0"
            >
              <span class="text-2xl">{{ eventIcons[event.event_type] }}</span>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium capitalize">{{ event.event_type }}</span>
                  <span class="text-sm text-gray-500">{{ event.event_date }}</span>
                </div>
                <p v-if="event.description" class="text-sm text-gray-600 mt-1">
                  {{ event.description }}
                </p>
                <div v-if="event.cost || event.vendor" class="text-xs text-gray-500 mt-1">
                  <span v-if="event.cost">${{ event.cost }}</span>
                  <span v-if="event.vendor"> • {{ event.vendor }}</span>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
