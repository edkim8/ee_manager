/**
 * Inventory Lifecycle Composable
 * Helper utilities for calculating lifecycle metrics and health status
 */
export const useInventoryLifecycle = () => {
  /**
   * Calculate age in years from install date
   */
  const calculateAge = (installDate: string | null): number | null => {
    if (!installDate) return null

    const install = new Date(installDate)
    const now = new Date()
    const diffMs = now.getTime() - install.getTime()
    const ageYears = diffMs / (1000 * 60 * 60 * 24 * 365.25)

    return Math.floor(ageYears)
  }

  /**
   * Calculate life remaining in years
   */
  const calculateLifeRemaining = (
    installDate: string | null,
    expectedLifeYears: number
  ): number | null => {
    const age = calculateAge(installDate)
    if (age === null) return expectedLifeYears

    return expectedLifeYears - age
  }

  /**
   * Calculate health status based on age and expected life
   */
  const calculateHealthStatus = (
    installDate: string | null,
    expectedLifeYears: number
  ): 'healthy' | 'warning' | 'critical' | 'expired' | 'unknown' => {
    const age = calculateAge(installDate)

    if (age === null) return 'unknown'
    if (age >= expectedLifeYears) return 'expired'
    if (age >= expectedLifeYears * 0.8) return 'critical'
    if (age >= expectedLifeYears * 0.6) return 'warning'
    return 'healthy'
  }

  /**
   * Get health status color (for badges, progress bars)
   */
  const getHealthColor = (
    status: 'healthy' | 'warning' | 'critical' | 'expired' | 'unknown'
  ): string => {
    const colors = {
      healthy: 'green',
      warning: 'yellow',
      critical: 'orange',
      expired: 'red',
      unknown: 'gray',
    }
    return colors[status]
  }

  /**
   * Get health status label
   */
  const getHealthLabel = (
    status: 'healthy' | 'warning' | 'critical' | 'expired' | 'unknown'
  ): string => {
    const labels = {
      healthy: 'Healthy',
      warning: 'Monitor',
      critical: 'Replace Soon',
      expired: 'Overdue',
      unknown: 'Unknown',
    }
    return labels[status]
  }

  /**
   * Calculate lifecycle progress percentage (0-100)
   * Used for progress bars
   */
  const calculateLifecycleProgress = (
    installDate: string | null,
    expectedLifeYears: number
  ): number => {
    const age = calculateAge(installDate)
    if (age === null) return 0

    const progress = (age / expectedLifeYears) * 100
    return Math.min(Math.max(progress, 0), 100) // Clamp to 0-100
  }

  /**
   * Format years remaining as human-readable string
   */
  const formatLifeRemaining = (
    installDate: string | null,
    expectedLifeYears: number
  ): string => {
    const remaining = calculateLifeRemaining(installDate, expectedLifeYears)

    if (remaining === null) return 'Unknown'
    if (remaining <= 0) return 'Expired'
    if (remaining === 1) return '1 year remaining'
    return `${remaining} years remaining`
  }

  /**
   * Get recommended action based on health status
   */
  const getRecommendedAction = (
    status: 'healthy' | 'warning' | 'critical' | 'expired' | 'unknown'
  ): string => {
    const actions = {
      healthy: 'No action needed',
      warning: 'Schedule inspection',
      critical: 'Budget for replacement',
      expired: 'Replace immediately',
      unknown: 'Record install date',
    }
    return actions[status]
  }

  /**
   * Calculate total cost of ownership
   * Initial cost + sum of all maintenance/repair costs
   */
  const calculateTotalCostOfOwnership = (
    initialCost: number,
    maintenanceCosts: number[]
  ): number => {
    const maintenanceTotal = maintenanceCosts.reduce((sum, cost) => sum + cost, 0)
    return initialCost + maintenanceTotal
  }

  /**
   * Calculate annual cost (for budgeting)
   * Total cost / age in years
   */
  const calculateAnnualCost = (
    totalCost: number,
    installDate: string | null
  ): number | null => {
    const age = calculateAge(installDate)
    if (age === null || age === 0) return null

    return totalCost / age
  }

  /**
   * Determine if item needs attention (warning, critical, or expired)
   */
  const needsAttention = (
    status: 'healthy' | 'warning' | 'critical' | 'expired' | 'unknown'
  ): boolean => {
    return ['warning', 'critical', 'expired'].includes(status)
  }

  /**
   * Get priority level for replacement planning (1-5, 5 = most urgent)
   */
  const getPriorityLevel = (
    status: 'healthy' | 'warning' | 'critical' | 'expired' | 'unknown'
  ): number => {
    const priorities = {
      expired: 5,
      critical: 4,
      warning: 3,
      healthy: 1,
      unknown: 2, // Medium priority - need to assess
    }
    return priorities[status]
  }

  return {
    // Calculations
    calculateAge,
    calculateLifeRemaining,
    calculateHealthStatus,
    calculateLifecycleProgress,
    calculateTotalCostOfOwnership,
    calculateAnnualCost,

    // Display helpers
    getHealthColor,
    getHealthLabel,
    formatLifeRemaining,
    getRecommendedAction,

    // Decision helpers
    needsAttention,
    getPriorityLevel,
  }
}
