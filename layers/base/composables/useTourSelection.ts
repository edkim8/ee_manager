import { computed } from 'vue'
import { useState } from '#imports'

export const MAX_TOUR_SLOTS = 4

export const useTourSelection = () => {
  // Selected unit codes — persists across page navigation within the session
  const selectedUnits = useState<string[]>('tour-selected-units', () => [])

  // Currently highlighted unit (drives table row highlight when clicking a slot button)
  const activeUnit = useState<string | null>('tour-active-unit', () => null)

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
