import { ref, watch } from 'vue'
import type { Database } from '~/types/supabase'

export const useDashboardData = () => {
  const supabase = useSupabaseClient<any>()
  const { activeProperty } = usePropertyState()
  
  const latestRun = ref<any>(null)
  const availabilityStats = ref<any>(null)
  const delinquencyStats = ref<any>(null)
  const alertsStats = ref<any>(null)
  const workOrdersStats = ref<any>(null)
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
        supabase.from('tenancies').select('status, move_out_date').eq('property_code', activeProperty.value).in('status', ['Current', 'Notice', 'Future', 'Applicant']),
        supabase.from('view_availabilities_metrics').select('*').eq('property_code', activeProperty.value)
      ])

      const totalUnits = unitsResult.count || 0
      const tenancies = tenanciesResult.data || []
      const metrics = metricsResult.data || []

      // Occupancy: Current + Notice tenancies
      const occupiedTenancies = tenancies.filter((t: any) => ['Current', 'Notice'].includes(t.status))
      const occupied = occupiedTenancies.length
      const notice = tenancies.filter((t: any) => t.status === 'Notice').length
      
      // Vacant: Units with no 'Current' or 'Notice' tenancy
      // A more robust way: Total Units - Occupied
      const vacant = Math.max(0, totalUnits - occupied)

      // Availability Pipeline (from view_availabilities_metrics)
      const totalAvailable = metrics.filter((m: any) => m.operational_status === 'Available').length
      const applicants = metrics.filter((m: any) => m.operational_status === 'Applied').length
      const future = metrics.filter((m: any) => m.future_status === 'Future').length
      
      // "Ready" is often defined as vacant + move_in_date passed or similar.
      // For now, let's just use the metrics for ready_date if available.
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
        occupancyPct: totalUnits > 0 ? (occupied / totalUnits) * 100 : 0,
        leasedPct: totalUnits > 0 ? ((totalUnits - totalAvailable) / totalUnits) * 100 : 0
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

  const fetchWorkOrdersStats = async () => {
    if (!activeProperty.value) return
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, created_at, status, is_active')
        .eq('property_code', activeProperty.value)
        .eq('is_active', true)
        .neq('status', 'Completed')

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
    fetchDelinquencyStats()
    fetchAlertsStats()
    fetchWorkOrdersStats()
  })

  return {
    activeProperty,
    latestRun,
    availabilityStats,
    delinquencyStats,
    alertsStats,
    workOrdersStats,
    isLoading,
    fetchLatestRun,
    fetchAvailabilityStats,
    fetchDelinquencyStats,
    fetchAlertsStats,
    fetchWorkOrdersStats
  }
}

