import { useState } from '#imports'
import { useTourSelection, MAX_TOUR_SLOTS } from './useTourSelection'

export { MAX_TOUR_SLOTS }

/**
 * Unified tour state composable.
 * Wraps useTourSelection and adds Presentation Mode toggle.
 *
 * `shortlist`   — alias for selectedUnits (array of unit names, max 4)
 * `activeUnitId` — alias for activeUnit (currently displayed unit)
 * `isPresenting` — hides nav chrome; Dossier fills 100% of screen
 */
export const useTourState = () => {
  const {
    selectedUnits,
    activeUnit,
    isSelected,
    isFull,
    toggle,
    setActive,
    clear,
  } = useTourSelection()

  const isPresenting = useState<boolean>('tour-is-presenting', () => false)

  const togglePresenting = () => {
    isPresenting.value = !isPresenting.value
  }

  return {
    // Presentation mode
    isPresenting,
    togglePresenting,
    // Shortlist (design-doc–aligned aliases)
    shortlist: selectedUnits,
    activeUnitId: activeUnit,
    // Passthrough from useTourSelection
    isSelected,
    isFull,
    toggle,
    setActive,
    clear,
    MAX_TOUR_SLOTS,
  }
}
