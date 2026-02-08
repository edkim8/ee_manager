import { ref } from 'vue'
import { useSupabaseClient, usePropertyState } from '#imports'

export interface DelinquencySummary {
  property_code: string
  total_unpaid_sum: number
  days_0_30_sum: number
  days_31_60_sum: number
  days_61_90_sum: number
  days_90_plus_sum: number
  prepays_sum: number
  balance_sum: number
  resident_count: number
}

export interface DelinquencySnapshot {
  snapshot_date: string
  total_unpaid: number
  days_0_30: number
  days_31_60: number
  days_61_90: number
  days_90_plus: number
  prepays: number
  balance: number
}

export interface DailyTrendPoint {
  snapshot_date: string
  total_unpaid_sum: number
  balance_sum: number
}

export function useDelinquenciesAnalysis() {
  const supabase = useSupabaseClient()
  const { activeProperty } = usePropertyState()

  const summary = ref<DelinquencySummary | null>(null)
  const snapshots = ref<DelinquencySnapshot[]>([])
  const dailyTrend = ref<DailyTrendPoint[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchSummary() {
    if (!activeProperty.value) return
    
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('view_delinquencies_current_summary')
        .select('*')
        .eq('property_code', activeProperty.value)
        .single()

      if (err && err.code !== 'PGRST116') throw err // Ignore "no rows found" error
      summary.value = data || null
    } catch (err: any) {
      console.error('Error fetching delinquency summary:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  async function fetchSnapshots(monthsCount: number = 4) {
    if (!activeProperty.value) return
    
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .rpc('get_delinquencies_monthly_26th_snapshots', {
          p_property_code: activeProperty.value,
          p_months_count: monthsCount
        })

      if (err) throw err
      snapshots.value = data || []
    } catch (err: any) {
      console.error('Error fetching delinquency snapshots:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  async function fetchDailyTrend() {
    if (!activeProperty.value) return
    
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('view_delinquencies_daily_trend')
        .select('*')
        .eq('property_code', activeProperty.value)

      if (err) throw err
      dailyTrend.value = data || []
    } catch (err: any) {
      console.error('Error fetching daily trend:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  return {
    summary,
    snapshots,
    dailyTrend,
    loading,
    error,
    fetchSummary,
    fetchSnapshots,
    fetchDailyTrend
  }
}
