<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
  layout: 'dashboard'
})

// Composables
const { activeProperty } = usePropertyState()
const { fetchCategories } = useInventoryCategories()
const { fetchItemDefinitions, createItemDefinition } = useInventoryItemDefinitions()

// State
const categories = ref([])
const items = ref([])
const loading = ref(false)
const error = ref(null)
const showForm = ref(false)

// Simple form data
const formData = ref({
  category_id: '',
  brand: '',
  model: '',
  manufacturer_part_number: '',
  description: '',
  notes: '',
})

// Load initial data
onMounted(async () => {
  try {
    loading.value = true
    categories.value = await fetchCategories()
    items.value = await fetchItemDefinitions({ propertyCode: activeProperty.value })
    console.log('✅ Loaded:', categories.value.length, 'categories,', items.value.length, 'items')
  } catch (err) {
    error.value = err.message
    console.error('Error:', err)
  } finally {
    loading.value = false
  }
})

// Create item
const handleSubmit = async () => {
  if (!formData.value.category_id) {
    alert('Please select a category')
    return
  }

  try {
    loading.value = true
    const newItem = await createItemDefinition({
      property_code: activeProperty.value,
      category_id: formData.value.category_id,
      brand: formData.value.brand || null,
      model: formData.value.model || null,
      manufacturer_part_number: formData.value.manufacturer_part_number || null,
      description: formData.value.description || null,
      notes: formData.value.notes || null,
    })
    console.log('✅ Item created:', newItem.id)

    // Reload items
    items.value = await fetchItemDefinitions({ propertyCode: activeProperty.value })
    showForm.value = false
    alert('✅ Item created successfully!')
  } catch (err) {
    error.value = err.message
    alert('❌ Error: ' + err.message)
  } finally {
    loading.value = false
  }
}

// No health status in catalog pattern
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">🧪 Inventory System Test</h1>
      <p class="text-gray-600">Composables verification & quick testing</p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border">
        <div class="text-sm text-gray-500">Categories</div>
        <div class="text-2xl font-bold">{{ categories.length }}</div>
      </div>
      <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border">
        <div class="text-sm text-gray-500">Test Items</div>
        <div class="text-2xl font-bold">{{ items.length }}</div>
      </div>
      <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border">
        <div class="text-sm text-gray-500">Status</div>
        <div class="text-lg font-semibold" :class="loading ? 'text-yellow-600' : 'text-green-600'">
          {{ loading ? 'Loading...' : 'Ready' }}
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-4">
      ❌ {{ error }}
    </div>

    <!-- Actions -->
    <div class="mb-6">
      <button
        @click="showForm = !showForm"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mr-2"
      >
        {{ showForm ? 'Cancel' : '➕ Add Test Item' }}
      </button>
    </div>

    <!-- Simple Form -->
    <div v-if="showForm" class="bg-white dark:bg-gray-800 p-6 rounded-lg border mb-6">
      <h2 class="text-xl font-semibold mb-4">Create Test Item</h2>
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Category -->
        <div>
          <label class="block text-sm font-medium mb-1">Category *</label>
          <select
            v-model="formData.category_id"
            class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
            required
          >
            <option value="">Select category...</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.name }} ({{ cat.expected_life_years }}y)
            </option>
          </select>
        </div>

        <!-- Brand -->
        <div>
          <label class="block text-sm font-medium mb-1">Brand</label>
          <input
            v-model="formData.brand"
            type="text"
            placeholder="e.g. Samsung"
            class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
          />
        </div>

        <!-- Model -->
        <div>
          <label class="block text-sm font-medium mb-1">Model</label>
          <input
            v-model="formData.model"
            type="text"
            placeholder="e.g. RF28R7201SR"
            class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
          />
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium mb-1">Description</label>
          <textarea
            v-model="formData.description"
            rows="2"
            class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
          ></textarea>
        </div>

        <!-- Submit -->
        <div class="flex gap-2">
          <button
            type="button"
            @click="showForm = false"
            class="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="loading || !formData.category_id"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Creating...' : 'Create Item' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Items List -->
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg border">
      <h2 class="text-xl font-semibold mb-4">Test Items ({{ items.length }})</h2>

      <div v-if="items.length === 0" class="text-center py-8 text-gray-500">
        <p class="text-lg mb-2">No items yet</p>
        <p class="text-sm">Click "Add Test Item" to create one</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="item in items"
          :key="item.id"
          class="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="font-semibold">{{ item.category_name }}</h3>
                <span v-if="item.property_code" class="px-2 py-0.5 text-xs font-mono rounded bg-blue-100 text-blue-700">
                  {{ item.property_code }}
                </span>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ item.brand }} {{ item.model }}
              </p>
              <p v-if="item.description" class="text-xs text-gray-500 mt-1">
                {{ item.description }}
              </p>
              <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span v-if="item.photo_count > 0">📸 {{ item.photo_count }}</span>
                <span v-if="item.document_count > 0">📄 {{ item.document_count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
