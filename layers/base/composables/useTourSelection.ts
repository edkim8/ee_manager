import { computed, watch } from 'vue'
import { useState } from '#imports'

export const MAX_TOUR_SLOTS = 4

const STORAGE_KEY = 'ee-tour-shortlist'

export const useTourSelection = () => {
  const selectedUnits = useState<string[]>('tour-selected-units', () => [])
  const activeUnit = useState<string | null>('tour-active-unit', () => null)

  // ── localStorage persistence (client-only) ─────────────────────────────
  if (import.meta.client) {
    // Hydrate from localStorage on first load if state is empty
    if (selectedUnits.value.length === 0) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) selectedUnits.value = JSON.parse(raw)
      } catch {}
    }

    // Save to localStorage whenever selection changes
    watch(
      selectedUnits,
      (val) => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(val)) } catch {}
      },
      { deep: true }
    )
  }

  const isSelected = (unitCode: string) => selectedUnits.value.includes(unitCode)

  const isFull = computed(() => selectedUnits.value.length >= MAX_TOUR_SLOTS)

  const toggle = (unitCode: string) => {
    if (isSelected(unitCode)) {
      selectedUnits.value = selectedUnits.value.filter(c => c !== unitCode)
      if (activeUnit.value === unitCode) activeUnit.value = null
    } else {
      if (selectedUnits.value.length < MAX_TOUR_SLOTS) {
        selectedUnits.value = [...selectedUnits.value, unitCode]
        activeUnit.value = unitCode
      }
    }
  }

  const setActive = (unitCode: string) => {
    activeUnit.value = activeUnit.value === unitCode ? null : unitCode
  }

  const clear = () => {
    selectedUnits.value = []
    activeUnit.value = null
    if (import.meta.client) {
      try { localStorage.removeItem(STORAGE_KEY) } catch {}
    }
  }

  return {
    selectedUnits,
    activeUnit,
    isSelected,
    isFull,
    toggle,
    setActive,
    clear,
    MAX_TOUR_SLOTS,
  }
}
