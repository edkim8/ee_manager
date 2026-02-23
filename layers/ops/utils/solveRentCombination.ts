/**
 * Pure rent-combination solver extracted from usePricingEngine.
 * No Supabase or Nuxt dependencies — suitable for unit testing.
 */

export interface AmenityOption {
  id: string
  amount: number
}

export interface RentSolverResult {
  /** Selected amenities that best close the target gap */
  combination: AmenityOption[]
  /** targetGap minus sum(combination.amounts) — 0 means exact match */
  remainingGap: number
}

/**
 * Given a target gap (targetOfferedRent − marketRent) and a list of eligible
 * temporary amenities, finds the best combination to close the gap.
 *
 * Algorithm priorities (in order):
 *  1. Always return ≥ 1 amenity — never suggest 0 when any are available
 *  2. Exact match (delta = 0) is always best
 *  3. Among solutions with delta within $5 of each other, prefer fewer amenities
 *  4. Otherwise prefer the smaller delta (reduce the gap more)
 *
 * Combination search constraints:
 *  - Only runs when best single-amenity delta > $10
 *  - Caps at 4 amenities
 *  - Prunes branches that reduce the gap by less than 25% at ≥ 2 amenities
 *
 * @param targetGap          targetOfferedRent − marketRent
 * @param availableAmenities Eligible amenities (already de-duped by caller)
 */
export function solveRentCombination(
  targetGap: number,
  availableAmenities: AmenityOption[],
): RentSolverResult {
  if (availableAmenities.length === 0) {
    return { combination: [], remainingGap: targetGap }
  }

  // Sort by absolute value descending — try the most impactful amenities first
  const sortedTemps = [...availableAmenities].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))

  let bestCombination: AmenityOption[] = []
  let bestDelta = Math.abs(targetGap)
  let bestLength = 0

  const isBetterSolution = (newDelta: number, newLength: number): boolean => {
    // Rule 1: Always prefer at least one amenity over none
    if (bestLength === 0 && newLength > 0) return true
    if (bestLength > 0 && newLength === 0) return false

    // Rule 2: Exact match (delta = 0) is always best
    if (newDelta === 0 && bestDelta !== 0) return true
    if (newDelta !== 0 && bestDelta === 0) return false

    // Rule 3: If gaps are similar (within $5), prefer fewer amenities
    const gapDiff = Math.abs(newDelta - bestDelta)
    if (gapDiff <= 5) return newLength < bestLength

    // Rule 4: Otherwise, prioritize the smaller gap
    return newDelta < bestDelta
  }

  // Step 1: Check all single amenities (most convenient)
  for (const amenity of sortedTemps) {
    const delta = Math.abs(targetGap - amenity.amount)

    if (isBetterSolution(delta, 1)) {
      bestDelta = delta
      bestCombination = [amenity]
      bestLength = 1
    }

    // Perfect single-amenity match — stop immediately
    if (delta === 0) {
      return { combination: bestCombination, remainingGap: 0 }
    }
  }

  // Step 2: Try combinations — only when best single-amenity delta is still significant
  const shouldSearchCombinations = bestDelta > 10

  if (shouldSearchCombinations) {
    const findCombination = (index: number, currentSum: number, currentCombination: AmenityOption[]) => {
      const delta = Math.abs(targetGap - currentSum)
      const currentLength = currentCombination.length

      if (isBetterSolution(delta, currentLength)) {
        bestDelta = delta
        bestCombination = [...currentCombination]
        bestLength = currentLength
      }

      // Early termination: exact match found
      if (delta === 0) return

      // Pruning: max 4 amenities
      if (currentLength >= 4) return

      // Pruning: at ≥ 2 amenities the combo must reduce gap by at least 25%
      const noAmenitiesGap = Math.abs(targetGap)
      const gapReduction = (noAmenitiesGap - delta) / noAmenitiesGap
      if (gapReduction < 0.25 && currentLength >= 2) return

      for (let i = index; i < sortedTemps.length; i++) {
        findCombination(i + 1, currentSum + sortedTemps[i].amount, [...currentCombination, sortedTemps[i]])
        if (bestDelta === 0) return
      }
    }

    findCombination(0, 0, [])
  }

  const finalSum = bestCombination.reduce((acc, a) => acc + a.amount, 0)
  return { combination: bestCombination, remainingGap: targetGap - finalSum }
}
