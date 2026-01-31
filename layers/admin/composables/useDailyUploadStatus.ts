import { ref, onMounted } from 'vue'

export type UploadStatus = {
  lastUpload: string | null
  isToday: boolean
}

const STORAGE_KEY = 'ee_manager_upload_status'

// Global State (Singleton)
const statuses = ref<Record<string, UploadStatus>>({
  leased_units: { lastUpload: null, isToday: false },
  residents_status: { lastUpload: null, isToday: false },
  availables: { lastUpload: null, isToday: false },
  notices: { lastUpload: null, isToday: false },
  applications: { lastUpload: null, isToday: false },
  expiring_leases: { lastUpload: null, isToday: false },
  alerts: { lastUpload: null, isToday: false },
  work_orders: { lastUpload: null, isToday: false },
  delinquencies: { lastUpload: null, isToday: false },
  transfers: { lastUpload: null, isToday: false },
  make_ready: { lastUpload: null, isToday: false },
  yardi_report: { lastUpload: null, isToday: false }
})

export function useDailyUploadStatus() {
  const isLoading = ref(false)

  function loadFromStorage() {
    if (typeof localStorage === 'undefined') return

    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const stored = JSON.parse(raw)
        const todayStr = new Date().toDateString()

        // Iterate known keys to populate valid statuses
        for (const key in statuses.value) {
            if (stored[key]) {
                 const date = new Date(stored[key])
                 statuses.value[key] = {
                     lastUpload: date.toLocaleString(),
                     isToday: date.toDateString() === todayStr
                 }
            }
            // If not in storage, keep default (or null) - but existing default is null
        }
      }
    } catch (e) {
      console.error('Failed to parse upload status from localStorage', e)
    }
  }

  function markAsUploaded(key: string) {
      const now = new Date()
      
      // Update Reactive State
      statuses.value[key] = {
          lastUpload: now.toLocaleString(),
          isToday: true
      }
      
      // Persist
      if (typeof localStorage !== 'undefined') {
          try {
              const raw = localStorage.getItem(STORAGE_KEY)
              const stored = raw ? JSON.parse(raw) : {}
              
              stored[key] = now.toISOString()
              
              localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
          } catch (e) {
              console.error('Failed to save upload status', e)
          }
      }
  }

  onMounted(() => {
    loadFromStorage()
  })

  return {
    statuses,
    isLoading,
    refreshAll: loadFromStorage,
    markAsUploaded
  }
}

