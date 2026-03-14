<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSupabaseClient } from '#imports'
import SimpleModal from '../../../../base/components/SimpleModal.vue'

definePageMeta({
  layout: 'dashboard'
})

// Composables
const { activeProperty, userContext } = usePropertyState()

const currentUserId = computed(() => userContext.value?.id ?? null)
const isSuperAdmin = computed(() => userContext.value?.access?.is_super_admin ?? false)

const canDeleteAttachment = (attachment: any) => {
  if (isSuperAdmin.value) return true
  if (!attachment.uploaded_by) return false
  return attachment.uploaded_by === currentUserId.value
}

const canDeleteItem = (item: any) => {
  if (isSuperAdmin.value) return true
  if (!item.created_by) return false
  return item.created_by === currentUserId.value
}
const { fetchCategories, createCategory, updateCategory, deleteCategory } = useInventoryCategories()
const { fetchItemDefinitions, createItemDefinition, updateItemDefinition, deleteItemDefinition } = useInventoryItemDefinitions()
const { addAttachment, fetchAttachments, deleteAttachment } = useAttachments()

// State
const activeTab = ref<'categories' | 'items'>('items')
const categories = ref([])
const items = ref([])
const properties = ref<{ code: string; name: string }[]>([])
const selectedCategoryFilter = ref('')
const searchTerm = ref('')
const loading = ref(false)
const error = ref(null)

// Modals
const showCategoryForm = ref(false)
const showItemForm = ref(false)
const editingCategory = ref(null)
const editingItem = ref(null)

// Form data
const categoryForm = ref({
  name: '',
  description: '',
  expected_life_years: 10,
})

const itemForm = ref<{
  category_id: string
  property_code: string
  expected_life_years: number | null
  brand: string
  model: string
  manufacturer_part_number: string
  description: string
  notes: string
}>({
  category_id: '',
  property_code: activeProperty.value || 'ALL',
  expected_life_years: null,
  brand: '',
  name: '',
  manufacturer_part_number: '',
  description: '',
  notes: '',
})

const itemPhotos = ref([])
const itemDocuments = ref([])
const itemThumbnails = ref(new Map()) // Map<itemId, photoUrl>

// Photo viewer modal
const showPhotoModal = ref(false)
const photoModalUrl  = ref('')
const openPhotoModal = (url: string, e: Event) => {
  e.stopPropagation()
  photoModalUrl.value  = url
  showPhotoModal.value = true
}

// Load data
onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  try {
    loading.value = true
    error.value = null
    const supabase = useSupabaseClient()
    const [cats, { data: props }] = await Promise.all([
      fetchCategories(),
      supabase.from('properties').select('code, name').order('code'),
    ])
    categories.value = cats
    properties.value = props ?? []
    await loadItems()
  } catch (err) {
    error.value = err.message
    console.error('Error loading data:', err)
  } finally {
    loading.value = false
  }
}

const loadItems = async () => {
  const filters: any = {}

  // Scoping by active property also pulls in global 'ALL' items (handled in composable)
  if (activeProperty.value) {
    filters.propertyCode = activeProperty.value
  }
  if (selectedCategoryFilter.value) {
    filters.categoryId = selectedCategoryFilter.value
  }
  if (searchTerm.value) {
    filters.searchTerm = searchTerm.value
  }

  items.value = await fetchItemDefinitions(filters)

  // Load thumbnails for items with photos
  await loadItemThumbnails()
}

const loadItemThumbnails = async () => {
  const itemsWithPhotos = items.value.filter(item => item.photo_count > 0)

  for (const item of itemsWithPhotos) {
    try {
      const photos = await fetchAttachments(item.id, 'inventory_item_definition')
      const firstPhoto = photos.find(p => p.file_type === 'image')
      if (firstPhoto) {
        itemThumbnails.value.set(item.id, firstPhoto.file_url)
      }
    } catch (err) {
      console.error('Error loading thumbnail for item:', item.id, err)
    }
  }
}

const getItemThumbnail = (itemId: string): string => {
  return itemThumbnails.value.get(itemId) || ''
}

// Category actions
const openCategoryForm = (category = null) => {
  if (category) {
    editingCategory.value = category
    categoryForm.value = {
      name: category.name,
      description: category.description || '',
      expected_life_years: category.expected_life_years,
    }
  } else {
    editingCategory.value = null
    categoryForm.value = {
      name: '',
      description: '',
      expected_life_years: 10,
    }
  }
  showCategoryForm.value = true
}

const saveCategoryForm = async () => {
  try {
    loading.value = true
    if (editingCategory.value) {
      await updateCategory(editingCategory.value.id, categoryForm.value)
    } else {
      await createCategory(categoryForm.value)
    }
    showCategoryForm.value = false
    await loadData()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const handleDeleteCategory = async (categoryId: string) => {
  if (!confirm('Are you sure you want to delete this category?')) return
  try {
    loading.value = true
    await deleteCategory(categoryId)
    await loadData()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Item actions
const openItemForm = (item = null) => {
  console.log('📝 Opening item form:', item ? 'EDIT mode' : 'CREATE mode', item)

  if (item) {
    editingItem.value = item
    itemForm.value = {
      category_id: item.category_id,
      property_code: item.property_code || 'ALL',
      expected_life_years: item.item_expected_life_years ?? null,
      brand: item.brand || '',
      name: item.name || '',
      manufacturer_part_number: item.manufacturer_part_number || '',
      description: item.description || '',
      notes: item.notes || '',
    }
    loadItemAttachments(item.id)
    console.log('✅ Edit mode set, editingItem:', editingItem.value?.id)
  } else {
    editingItem.value = null
    itemForm.value = {
      category_id: selectedCategoryFilter.value || '',
      property_code: activeProperty.value || 'ALL',
      expected_life_years: null,
      brand: '',
      name: '',
      manufacturer_part_number: '',
      description: '',
      notes: '',
    }
    itemPhotos.value = []
    itemDocuments.value = []
    console.log('✅ Create mode set, editingItem is null')
  }
  showItemForm.value = true
}

const loadItemAttachments = async (itemId: string) => {
  console.log('📎 Loading attachments for item:', itemId)
  const attachments = await fetchAttachments(itemId, 'inventory_item_definition')
  itemPhotos.value = attachments.filter(a => a.file_type === 'image')
  itemDocuments.value = attachments.filter(a => a.file_type === 'document')
  console.log('✅ Loaded:', itemPhotos.value.length, 'photos,', itemDocuments.value.length, 'documents')
}

const saveItemForm = async () => {
  try {
    loading.value = true
    const payload = {
      ...itemForm.value,
      // Store null when field is cleared so the view falls back to category lifespan
      expected_life_years: itemForm.value.expected_life_years || null,
    }
    if (editingItem.value) {
      await updateItemDefinition(editingItem.value.id, payload)
    } else {
      await createItemDefinition(payload)
    }
    showItemForm.value = false
    await loadItems()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const handleDuplicateItem = async () => {
  if (!editingItem.value) return
  try {
    loading.value = true
    await createItemDefinition({
      category_id: editingItem.value.category_id,
      property_code: editingItem.value.property_code,
      expected_life_years: editingItem.value.item_expected_life_years ?? undefined,
      brand: editingItem.value.brand,
      name: editingItem.value.name ? `${editingItem.value.name} (copy)` : '(copy)',
      manufacturer_part_number: editingItem.value.manufacturer_part_number,
      description: editingItem.value.description,
      notes: editingItem.value.notes,
    })
    showItemForm.value = false
    await loadItems()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const handleDeleteItem = async (itemId: string) => {
  if (!confirm('Are you sure you want to delete this item?')) return
  try {
    loading.value = true
    await deleteItemDefinition(itemId)
    showItemForm.value = false
    await loadItems()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// File upload handlers
const handlePhotoUpload = async (event: Event) => {
  if (!editingItem.value) return
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    loading.value = true
    await addAttachment(editingItem.value.id, 'inventory_item_definition', file, 'image')
    await loadItemAttachments(editingItem.value.id)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const handleDocumentUpload = async (event: Event) => {
  if (!editingItem.value) return
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    loading.value = true
    await addAttachment(editingItem.value.id, 'inventory_item_definition', file, 'document')
    await loadItemAttachments(editingItem.value.id)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const handleDeleteAttachment = async (attachment: any) => {
  if (!confirm('Delete this file?')) return
  try {
    loading.value = true
    await deleteAttachment(attachment)
    if (editingItem.value) {
      await loadItemAttachments(editingItem.value.id)
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Computed
const filteredItems = computed(() => items.value)

const getCategoryName = (categoryId: string) => {
  return categories.value.find(c => c.id === categoryId)?.name || 'Unknown'
}

/** Category default lifespan for the item currently being edited/created */
const selectedCategoryLifeYears = computed<number | null>(() => {
  const cat = categories.value.find(c => c.id === itemForm.value.category_id)
  return cat?.expected_life_years ?? null
})
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold mb-2">📦 Inventory Management</h1>
        <p class="text-gray-600 dark:text-gray-400">Manage item catalog and categories</p>
      </div>
      <NuxtLink
        to="/office/inventory/installations"
        class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap"
      >
        🏗️ View Installations
      </NuxtLink>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-400 p-4 rounded-lg mb-4">
      ❌ {{ error }}
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-800">
      <button
        @click="activeTab = 'items'"
        class="px-4 py-2 font-medium transition-colors"
        :class="activeTab === 'items' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'"
      >
        Items
      </button>
      <button
        @click="activeTab = 'categories'"
        class="px-4 py-2 font-medium transition-colors"
        :class="activeTab === 'categories' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'"
      >
        Categories
      </button>
    </div>

    <!-- ITEMS TAB -->
    <div v-if="activeTab === 'items'" class="space-y-6">
      <!-- Filters & Actions -->
      <div class="flex flex-col sm:flex-row gap-4">
        <!-- Category Filter -->
        <select
          v-model="selectedCategoryFilter"
          @change="loadItems"
          class="px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
        >
          <option value="">All Categories</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>

        <!-- Search -->
        <input
          v-model="searchTerm"
          @input="loadItems"
          type="text"
          placeholder="Search by brand, name, description..."
          class="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
        />

        <!-- Add Button -->
        <button
          @click="openItemForm()"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
        >
          ➕ Add Item
        </button>
      </div>

      <!-- Items Grid -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="i in 6" :key="i" class="h-28 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>
      </div>

      <div v-else-if="filteredItems.length === 0" class="text-center py-12">
        <p class="text-gray-500 dark:text-gray-400 text-lg mb-2">No items found</p>
        <p class="text-sm text-gray-400">Add your first item to get started</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
          @click="openItemForm(item)"
        >
          <!-- Left: Information -->
          <div class="flex-1 p-4 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ item.category_name }}</span>
              <span
                v-if="item.property_code"
                class="text-xs font-mono px-1.5 py-0.5 rounded"
                :class="item.property_code === 'ALL'
                  ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                  : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'"
              >
                {{ item.property_code === 'ALL' ? 'ALL' : item.property_code }}
              </span>
            </div>
            <h3 class="font-semibold text-base leading-tight">{{ item.brand }}</h3>
            <p class="text-gray-600 dark:text-gray-400 text-sm">{{ item.name }}</p>

            <p v-if="item.description" class="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
              {{ item.description }}
            </p>

            <div class="flex items-center gap-3 mt-3 text-xs text-gray-400 dark:text-gray-500">
              <span v-if="item.photo_count > 0">📸 {{ item.photo_count }}</span>
              <span v-if="item.document_count > 0">📄 {{ item.document_count }}</span>
              <span v-if="item.manufacturer_part_number" class="font-mono truncate">
                #{{ item.manufacturer_part_number }}
              </span>
            </div>
          </div>

          <!-- Right: Photo (click to enlarge) -->
          <div class="w-28 flex-shrink-0 bg-gray-100 dark:bg-gray-900">
            <img
              v-if="item.photo_count > 0 && getItemThumbnail(item.id)"
              :src="getItemThumbnail(item.id)"
              :alt="item.brand ?? 'Item photo'"
              loading="lazy"
              class="w-full h-full object-contain cursor-zoom-in"
              @click.stop="openPhotoModal(getItemThumbnail(item.id), $event)"
              @error="($event.target as HTMLImageElement).style.display='none'"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <span class="text-gray-300 dark:text-gray-600 text-3xl">📦</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CATEGORIES TAB -->
    <div v-if="activeTab === 'categories'" class="space-y-6">
      <!-- Add Button -->
      <div class="flex justify-end">
        <button
          @click="openCategoryForm()"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          ➕ Add Category
        </button>
      </div>

      <!-- Categories List -->
      <div v-if="loading" class="space-y-2">
        <div v-for="i in 5" :key="i" class="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>
      </div>

      <div v-else class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-semibold">Name</th>
              <th class="px-4 py-3 text-left text-sm font-semibold">Description</th>
              <th class="px-4 py-3 text-center text-sm font-semibold">Expected Life</th>
              <th class="px-4 py-3 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="category in categories"
              :key="category.id"
              class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
            >
              <td class="px-4 py-3 font-medium">{{ category.name }}</td>
              <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {{ category.description || '-' }}
              </td>
              <td class="px-4 py-3 text-center text-sm">{{ category.expected_life_years }} years</td>
              <td class="px-4 py-3 text-right">
                <button
                  @click="openCategoryForm(category)"
                  class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm mr-3"
                >
                  Edit
                </button>
                <button
                  v-if="isSuperAdmin"
                  @click="handleDeleteCategory(category.id)"
                  class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- CATEGORY FORM MODAL -->
    <div
      v-if="showCategoryForm"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="showCategoryForm = false"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 class="text-xl font-bold mb-4">
          {{ editingCategory ? 'Edit Category' : 'Add Category' }}
        </h2>
        <form @submit.prevent="saveCategoryForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Name *</label>
            <input
              v-model="categoryForm.name"
              type="text"
              required
              class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Description</label>
            <textarea
              v-model="categoryForm.description"
              rows="2"
              class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
            ></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Expected Life (years) *</label>
            <input
              v-model.number="categoryForm.expected_life_years"
              type="number"
              min="1"
              required
              class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
            />
          </div>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              @click="showCategoryForm = false"
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

    <!-- ITEM FORM MODAL -->
    <div
      v-if="showItemForm"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      @click.self="showItemForm = false"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full my-8">
        <h2 class="text-xl font-bold mb-4">
          {{ editingItem ? 'Edit Item' : 'Add Item' }}
        </h2>
        <form @submit.prevent="saveItemForm" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <label class="block text-sm font-medium mb-1">Category *</label>
              <select
                v-model="itemForm.category_id"
                required
                class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
              >
                <option value="">Select category...</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>

            <!-- Property Scope -->
            <div>
              <label class="block text-sm font-medium mb-1">Property Scope *</label>
              <select
                v-model="itemForm.property_code"
                required
                class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
              >
                <option value="ALL">ALL Properties (Global)</option>
                <option v-for="prop in properties" :key="prop.code" :value="prop.code">
                  {{ prop.code }} — {{ prop.name }}
                </option>
              </select>
            </div>

            <!-- Item-Specific Lifespan Override -->
            <div>
              <label class="block text-sm font-medium mb-1">Expected Lifespan (years)</label>
              <input
                v-model.number="itemForm.expected_life_years"
                type="number"
                min="1"
                :placeholder="selectedCategoryLifeYears ? `Category default: ${selectedCategoryLifeYears} yrs` : 'Same as category'"
                class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
              />
              <p class="text-xs text-gray-500 mt-1">
                Leave blank to inherit the category default
                <span v-if="selectedCategoryLifeYears">({{ selectedCategoryLifeYears }} yrs)</span>.
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Brand</label>
              <input
                v-model="itemForm.brand"
                type="text"
                placeholder="e.g. Samsung"
                class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Name</label>
              <input
                v-model="itemForm.name"
                type="text"
                placeholder="e.g. French Door Refrigerator"
                class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
              />
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-medium mb-1">Manufacturer Part Number</label>
              <input
                v-model="itemForm.manufacturer_part_number"
                type="text"
                placeholder="Optional"
                class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
              />
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-medium mb-1">Description</label>
              <textarea
                v-model="itemForm.description"
                rows="2"
                placeholder="Brief description of the item"
                class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
              ></textarea>
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-medium mb-1">Notes</label>
              <textarea
                v-model="itemForm.notes"
                rows="2"
                placeholder="Internal notes"
                class="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
              ></textarea>
            </div>
          </div>

          <!-- Photos (only when editing) -->
          <div v-if="editingItem" class="border-t pt-4">
            <label class="block text-sm font-medium mb-2">📸 Item Photos</label>

            <!-- Photo Grid -->
            <div v-if="itemPhotos.length > 0" class="grid grid-cols-4 gap-2 mb-3">
              <div v-for="photo in itemPhotos" :key="photo.id" class="relative group">
                <img :src="photo.file_url" :alt="photo.file_name" class="w-full h-24 object-cover rounded border border-gray-200 dark:border-gray-700" />
                <button
                  v-if="canDeleteAttachment(photo)"
                  type="button"
                  @click="handleDeleteAttachment(photo)"
                  class="absolute top-1 right-1 bg-red-600 text-white w-6 h-6 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- No Photos State -->
            <div v-else class="bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center mb-3">
              <span class="text-4xl mb-2 block">📷</span>
              <p class="text-sm text-gray-500">No photos yet. Add photos to help identify this item.</p>
            </div>

            <!-- Upload Button -->
            <div class="flex items-center gap-2">
              <label class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer inline-block">
                <input
                  type="file"
                  accept="image/*"
                  @change="handlePhotoUpload"
                  class="hidden"
                />
                ➕ Add Photo
              </label>
              <span class="text-xs text-gray-500">Auto-compressed before upload</span>
            </div>
          </div>

          <!-- Documents (only when editing) -->
          <div v-if="editingItem" class="border-t pt-4">
            <label class="block text-sm font-medium mb-2">Documents (Warranties, Proposals, Invoices)</label>
            <div class="space-y-1 mb-2">
              <div v-for="doc in itemDocuments" :key="doc.id" class="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-2 rounded">
                <a :href="doc.file_url" target="_blank" class="text-sm text-blue-600 hover:underline">
                  📄 {{ doc.file_name }}
                </a>
                <button
                  v-if="canDeleteAttachment(doc)"
                  type="button"
                  @click="handleDeleteAttachment(doc)"
                  class="text-red-600 hover:text-red-800 text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              @change="handleDocumentUpload"
              class="text-sm"
            />
          </div>

          <!-- Create Mode: Photo Notice -->
          <div v-if="!editingItem" class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-400">
            💡 <strong>Tip:</strong> After creating this item, you can click it to add photos and documents.
          </div>

          <div class="flex justify-between gap-2 pt-4 border-t">
            <!-- Left actions: Delete + Duplicate (edit mode only) -->
            <div class="flex gap-2">
              <button
                v-if="editingItem && canDeleteItem(editingItem)"
                type="button"
                @click="handleDeleteItem(editingItem.id)"
                :disabled="loading"
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
              <button
                v-if="editingItem"
                type="button"
                @click="handleDuplicateItem"
                :disabled="loading"
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Duplicate
              </button>
            </div>
            <div v-if="!editingItem" />

            <div class="flex gap-2">
            <button
              type="button"
              @click="showItemForm = false"
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
          </div>
        </form>
      </div>
    </div>

    <!-- Photo Viewer Modal (full-screen on mobile) -->
    <SimpleModal v-model="showPhotoModal" title="Photo" width="sm:max-w-2xl" :no-padding="true">
      <div class="relative w-full">
        <img
          v-if="photoModalUrl"
          :src="photoModalUrl"
          loading="lazy"
          class="w-full h-auto max-h-[80vh] object-contain"
          alt="Item photo"
        />
      </div>
    </SimpleModal>
  </div>
</template>
