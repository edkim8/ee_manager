import { ref, watch } from 'vue'
import type { Database } from '~/types/supabase'

export const useDashboardData = () => {
  const supabase = useSupabaseClient<any>()
  const { activeProperty } = usePropertyState()
  
  const latestRun = ref<any>(null)
  const availabilityStats = ref<any>(null)
  const availabilityTrend = ref<any>(null)
  const delinquencyStats = ref<any>(null)
  const alertsStats = ref<any>(null)
  const workOrdersStats = ref<any>(null)
  const renewalsStats = ref<any>(null)
  const inventoryStats = ref<any>(null)
  const makeReadyStats = ref<any>(null)
  const isLoading = ref(false)

  const fetchLatestRun = async () => {
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('solver_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (error) throw error
      latestRun.value = data
    } catch (e) {
      console.error('Failed to fetch latest solver run', e)
    } finally {
      isLoading.value = false
    }
  }

  const fetchAvailabilityStats = async () => {
    if (!activeProperty.value) return
    isLoading.value = true
    try {
      const today = new Date().toISOString().split('T')[0] as string
      
      const [unitsResult, tenanciesResult, metricsResult] = await Promise.all([
        supabase.from('units').select('id', { count: 'exact', head: true }).eq('property_code', activeProperty.value),
        supabase.from('tenancies').select('unit_id, status, move_out_date').eq('property_code', activeProperty.value).in('status', ['Current', 'Notice', 'Future', 'Applicant']),
        supabase.from('view_availabilities_metrics').select('status, operational_status, future_status, ready_date').eq('property_code', activeProperty.value)
      ])

      const totalUnits = unitsResult.count || 0
      const tenancies = tenanciesResult.data || []
      const metrics = metricsResult.data || []

      // Occupancy: unique unit_ids with Current or Notice status.
      // Must deduplicate by unit_id — multiple tenancy records can exist per unit
      // (overlapping Yardi sync records), which would inflate a simple .length count.
      const occupiedUnitIds = new Set(
        tenancies.filter((t: any) => ['Current', 'Notice'].includes(t.status)).map((t: any) => t.unit_id)
      )
      const occupied = occupiedUnitIds.size
      const noticeUnitIds = new Set(
        tenancies.filter((t: any) => t.status === 'Notice').map((t: any) => t.unit_id)
      )
      const notice = noticeUnitIds.size

      // Vacant: physical units with no active occupant
      const vacant = Math.max(0, totalUnits - occupied)

      // Leased: unique unit_ids with Current, Notice, or Future status.
      // This is the "economic leased rate" — units that have a signed present or upcoming lease.
      const leasedUnitIds = new Set(
        tenancies.filter((t: any) => ['Current', 'Notice', 'Future'].includes(t.status)).map((t: any) => t.unit_id)
      )

      // Availability pipeline counts (from availabilities table via view)
      // Use stored `status` (not derived `operational_status`) to match what the Availabilities Table shows
      const totalAvailable = metrics.filter((m: any) => m.status === 'Available').length
      const applicants = metrics.filter((m: any) => m.status === 'Applied').length
      const future = metrics.filter((m: any) => m.future_status === 'Future').length
      const ready = metrics.filter((m: any) => m.ready_date && m.ready_date <= today).length

      availabilityStats.value = {
        totalUnits,
        occupied,
        notice,
        vacant,
        totalAvailable,
        applicants,
        future,
        ready,
        // Physical occupancy: unique occupied units / total units
        occupancyPct: totalUnits > 0 ? (occupied / totalUnits) * 100 : 0,
        // Economic leased rate: units with a signed current or future lease / total units
        leasedPct: totalUnits > 0 ? (leasedUnitIds.size / totalUnits) * 100 : 0
      }
    } catch (e) {
      console.error('Failed to fetch availability stats', e)
    } finally {
      isLoading.value = false
    }
  }

  const fetchDelinquencyStats = async () => {
    if (!activeProperty.value) return
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('view_delinquencies_current_summary')
        .select('*')
        .eq('property_code', activeProperty.value)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      delinquencyStats.value = data || null
    } catch (e) {
      console.error('Failed to fetch delinquency stats', e)
    } finally {
      isLoading.value = false
    }
  }

  const fetchAlertsStats = async () => {
    if (!activeProperty.value) return
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('view_table_alerts_unified')
        .select('*')
        .eq('property_code', activeProperty.value)
        .eq('is_active', true)

      if (error) throw error
      
      const totalActive = data?.length || 0
      const overdue = data?.filter((a: any) => a.is_overdue).length || 0
      
      alertsStats.value = {
        totalActive,
        overdue
      }
    } catch (e) {
      console.error('Failed to fetch alerts stats', e)
    } finally {
      isLoading.value = false
    }
  }

  const fetchAvailabilityTrend = async () => {
    if (!activeProperty.value) return
    try {
      const { data, error } = await supabase
        .from('availability_snapshots')
        .select('occupied_count, total_units, snapshot_date')
        .eq('property_code', activeProperty.value)
        .order('snapshot_date', { ascending: false })
        .limit(2)

      if (error) throw error
      if (!data || data.length < 2) {
        availabilityTrend.value = null
        return
      }

      const current = data[0]
      const previous = data[1]
      const currentRate = current.total_units > 0 ? current.occupied_count / current.total_units : 0
      const previousRate = previous.total_units > 0 ? previous.occupied_count / previous.total_units : 0
      const delta = currentRate - previousRate

      availabilityTrend.value = {
        direction: delta > 0.001 ? 'up' : delta < -0.001 ? 'down' : 'flat',
        delta: Math.abs(delta * 100).toFixed(1),
        previousDate: previous.snapshot_date
      }
    } catch (e) {
      console.error('Failed to fetch availability trend', e)
    }
  }

  const fetchRenewalsStats = async () => {
    if (!activeProperty.value) return
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('renewal_worksheet_items')
        .select('status')
        .eq('property_code', activeProperty.value)
        .neq('status', 'expired')

      if (error) throw error

      const items = data || []
      const offered = items.filter((i: any) => i.status === 'offered').length
      const pending = items.filter((i: any) => i.status === 'pending').length
      const accepted = items.filter((i: any) => ['accepted', 'manually_accepted'].includes(i.status)).length
      const declined = items.filter((i: any) => ['declined', 'manually_declined'].includes(i.status)).length

      renewalsStats.value = {
        total: items.length,
        offered,
        pending,
        accepted,
        declined
      }
    } catch (e) {
      console.error('Failed to fetch renewals stats', e)
    } finally {
      isLoading.value = false
    }
  }

  const fetchInventoryStats = async () => {
    if (!activeProperty.value) return
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('view_inventory_installations')
        .select('health_status')
        .eq('property_code', activeProperty.value)

      if (error) throw error

      const items = data || []
      const healthy = items.filter((i: any) => i.health_status === 'healthy').length
      const warning = items.filter((i: any) => i.health_status === 'warning').length
      const critical = items.filter((i: any) => i.health_status === 'critical').length
      const expired = items.filter((i: any) => i.health_status === 'expired').length
      const unknown = items.filter((i: any) => i.health_status === 'unknown').length

      inventoryStats.value = {
        total: items.length,
        healthy,
        warning,
        critical,
        expired,
        unknown,
        atRisk: critical + expired
      }
    } catch (e) {
      console.error('Failed to fetch inventory stats', e)
    } finally {
      isLoading.value = false
    }
  }

  const fetchMakeReadyStats = async () => {
    if (!activeProperty.value) return
    try {
      const { count, error } = await supabase
        .from('unit_flags')
        .select('*', { count: 'exact', head: true })
        .eq('property_code', activeProperty.value)
        .eq('flag_type', 'makeready_overdue')
        .is('resolved_at', null)

      if (error) throw error
      makeReadyStats.value = { count: count || 0 }
    } catch (e) {
      console.error('Failed to fetch makeready stats', e)
    }
  }

  const fetchWorkOrdersStats = async () => {
    if (!activeProperty.value) return
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, created_at, status, is_active')
        .eq('property_code', activeProperty.value)
        .eq('is_active', true)

      if (error) throw error
      
      const now = new Date()
      const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000))
      
      const totalOpen = data?.length || 0
      const overdue = data?.filter((wo: any) => new Date(wo.created_at) < threeDaysAgo).length || 0
      
      workOrdersStats.value = {
        totalOpen,
        overdue
      }
    } catch (e) {
      console.error('Failed to fetch work orders stats', e)
    } finally {
      isLoading.value = false
    }
  }

  watch(activeProperty, () => {
    fetchLatestRun()
    fetchAvailabilityStats()
    fetchAvailabilityTrend()
    fetchDelinquencyStats()
    fetchAlertsStats()
    fetchWorkOrdersStats()
    fetchRenewalsStats()
    fetchInventoryStats()
    fetchMakeReadyStats()
  })

  return {
    activeProperty,
    latestRun,
    availabilityStats,
    availabilityTrend,
    delinquencyStats,
    alertsStats,
    workOrdersStats,
    renewalsStats,
    inventoryStats,
    makeReadyStats,
    isLoading,
    fetchLatestRun,
    fetchAvailabilityStats,
    fetchAvailabilityTrend,
    fetchDelinquencyStats,
    fetchAlertsStats,
    fetchWorkOrdersStats,
    fetchRenewalsStats,
    fetchInventoryStats,
    fetchMakeReadyStats
  }
}

