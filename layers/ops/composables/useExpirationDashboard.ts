/**
 * Lease Expiration Dashboard Data Fetcher
 *
 * Provides 24-month lease expiration forecast data with target setting
 */

import { ref } from 'vue'
import { useSupabaseClient } from '#imports'

export function useExpirationDashboard(propertyCode: string) {
  const supabase = useSupabaseClient()
  const pending = ref(false)
  const error = ref<any>(null)
  const dashboardData = ref<{
    expirationCounts: Array<{ expiration_month: string; lease_count: number }>
    totalUnits: number
    targetDistribution: Record<string, number>
  } | null>(null)

  const fetch = async () => {
    pending.value = true
    error.value = null

    try {
      // 1. Generate 24-month timeline
      const months: string[] = []
      const today = new Date()
      for (let i = 0; i < 24; i++) {
        const month = new Date(today.getFullYear(), today.getMonth() + i, 1)
        months.push(month.toISOString().substring(0, 7)) // YYYY-MM format
      }

      // 2. Fetch expiration counts by month
      const { data: leaseData, error: leaseError } = await supabase
        .from('leases')
        .select(`
          end_date,
          tenancies!inner(property_code)
        `)
        .eq('tenancies.property_code', propertyCode)
        .eq('lease_status', 'Current')
        .eq('is_active', true)
        .gte('end_date', months[0] + '-01')
        .lte('end_date', months[23] + '-31')

      if (leaseError) {
        console.error('[Dashboard] Lease fetch error:', leaseError)
        throw leaseError
      }

      // Aggregate by month
      const countsByMonth: Record<string, number> = {}
      months.forEach(m => countsByMonth[m] = 0)

      leaseData?.forEach((lease: any) => {
        const endMonth = lease.end_date.substring(0, 7) // YYYY-MM
        if (countsByMonth[endMonth] !== undefined) {
          countsByMonth[endMonth]++
        }
      })

      const expirationCounts = months.map(month => ({
        expiration_month: month,
        lease_count: countsByMonth[month] || 0
      }))

      // 3. Fetch total units for property
      const { count: totalUnits, error: unitsError } = await supabase
        .from('units')
        .select('id', { count: 'exact', head: true })
        .eq('property_code', propertyCode)

      if (unitsError) {
        console.error('[Dashboard] Units count error:', unitsError)
        throw unitsError
      }

      // 4. Fetch saved targets (from renewal_expiration_targets table if exists, else empty)
      // For now, we'll use a JSONB column on properties or a separate table
      // Let's check if renewal_expiration_targets table exists
      const { data: targetsData, error: targetsError } = await supabase
        .from('renewal_expiration_targets')
        .select('month, target_count')
        .eq('property_code', propertyCode)

      let targetDistribution: Record<string, number> = {}

      if (!targetsError && targetsData) {
        targetsData.forEach((t: any) => {
          targetDistribution[t.month] = t.target_count
        })
      } else {
        // Initialize with zeros if no targets exist
        months.forEach(m => targetDistribution[m] = 0)
      }

      dashboardData.value = {
        expirationCounts,
        totalUnits: totalUnits || 0,
        targetDistribution
      }
    } catch (err) {
      error.value = err
      console.error('[Dashboard] Fetch error:', err)
    } finally {
      pending.value = false
    }
  }

  const saveTargets = async (targets: Record<string, number>) => {
    try {
      // Delete existing targets for this property
      await supabase
        .from('renewal_expiration_targets')
        .delete()
        .eq('property_code', propertyCode)

      // Insert new targets
      const targetRecords = Object.entries(targets)
        .filter(([_, count]) => count > 0) // Only save non-zero targets
        .map(([month, target_count]) => ({
          property_code: propertyCode,
          month,
          target_count
        }))

      if (targetRecords.length > 0) {
        const { error } = await supabase
          .from('renewal_expiration_targets')
          .insert(targetRecords)

        if (error) {
          console.error('[Dashboard] Save targets error:', error)
          return false
        }
      }

      // Refresh data
      await fetch()
      return true
    } catch (err) {
      console.error('[Dashboard] Save targets error:', err)
      return false
    }
  }

  return {
    dashboardData,
    pending,
    error,
    fetch,
    saveTargets
  }
}
