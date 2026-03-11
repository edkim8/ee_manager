import { ref, computed } from 'vue'
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

export interface ResidentHistoryRecord {
  tenancy_id: string
  months_on_list: number
  peak_unpaid: number
  prev_month_unpaid: number | null
}

export function useDelinquenciesAnalysis() {
  const supabase = useSupabaseClient()
  const { activeProperty } = usePropertyState()

  const summary = ref<DelinquencySummary | null>(null)
  const snapshots = ref<DelinquencySnapshot[]>([])
  const dailyTrend = ref<DailyTrendPoint[]>([])
  const residentHistory = ref<ResidentHistoryRecord[]>([])
  // Counter-based loading: incremented per in-flight request, loading === true
  // while any request is pending. Prevents premature false from parallel fetches.
  const _loadingCount = ref(0)
  const loading = computed(() => _loadingCount.value > 0)
  const error = ref<string | null>(null)

  async function fetchSummary() {
    if (!activeProperty.value) return

    _loadingCount.value++
    try {
      const { data, error: err } = await supabase
        .from('view_delinquencies_current_summary')
        .select('*')
        .eq('property_code', activeProperty.value)
        .single()

      if (err && err.code !== 'PGRST116') throw err // Ignore "no rows found" error
      summary.value = data || null
    } catch (err: any) {
      error.value = err.message
    } finally {
      _loadingCount.value--
    }
  }

  async function fetchSnapshots(monthsCount: number = 4) {
    if (!activeProperty.value) return

    _loadingCount.value++
    try {
      const { data, error: err } = await supabase
        .rpc('get_delinquencies_monthly_26th_snapshots', {
          p_property_code: activeProperty.value,
          p_months_count: monthsCount
        })

      if (err) throw err
      snapshots.value = data || []
    } catch (err: any) {
      error.value = err.message
    } finally {
      _loadingCount.value--
    }
  }

  async function fetchDailyTrend() {
    if (!activeProperty.value) return

    _loadingCount.value++
    try {
      const { data, error: err } = await supabase
        .from('view_delinquencies_daily_trend')
        .select('*')
        .eq('property_code', activeProperty.value)
        .order('snapshot_date', { ascending: true })

      if (err) throw err
      dailyTrend.value = data || []
    } catch (err: any) {
      error.value = err.message
    } finally {
      _loadingCount.value--
    }
  }

  async function fetchResidentHistory(monthsCount: number = 12) {
    if (!activeProperty.value) return

    _loadingCount.value++
    try {
      const { data, error: err } = await supabase
        .rpc('get_delinquency_resident_history', {
          p_property_code: activeProperty.value,
          p_months_count: monthsCount
        })

      if (err) throw err
      residentHistory.value = data || []
    } catch (err: any) {
      error.value = err.message
    } finally {
      _loadingCount.value--
    }
  }

  return {
    summary,
    snapshots,
    dailyTrend,
    residentHistory,
    loading,
    error,
    fetchSummary,
    fetchSnapshots,
    fetchDailyTrend,
    fetchResidentHistory
  }
}
