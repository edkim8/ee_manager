import { ref } from 'vue'
import { useSupabaseClient, usePropertyState } from '#imports'

export interface AvailabilitySnapshot {
  id: string
  solver_run_id: string | null
  property_code: string
  snapshot_date: string
  available_count: number
  applied_count: number
  leased_count: number
  occupied_count: number
  total_active_count: number
  total_units: number
  avg_market_rent: number | null
  avg_offered_rent: number | null
  avg_days_on_market: number | null
  avg_concession_days: number | null
  avg_concession_amount: number | null
  price_changes_count: number
  created_at: string
}

export interface AvailabilityDailyTrend extends AvailabilitySnapshot {
  vacancy_rate: number
  rent_spread_pct: number
}

export interface AvailabilityWeeklyTrend {
  property_code: string
  week_start: string
  avg_available_count: number
  avg_applied_count: number
  avg_leased_count: number
  avg_occupied_count: number
  avg_total_active: number
  avg_total_units: number
  avg_market_rent: number | null
  avg_offered_rent: number | null
  avg_days_on_market: number | null
  avg_concession_days: number | null
  avg_concession_amount: number | null
  total_price_changes: number
  days_in_week: number
  avg_vacancy_rate: number
  avg_rent_spread_pct: number
}

export interface FloorPlanBreakdown {
  floor_plan_id: string
  floor_plan_name: string
  available: number
  applied: number
  leased: number
  avg_market_rent: number | null
}

export interface PriceChangeEvent {
  id: string
  property_code: string
  event_type: string
  event_date: string
  details: {
    unit_name: string
    unit_id: string
    old_rent: number
    new_rent: number
    change_amount: number
    change_percent: number
  }
}

export interface AllPropertySnapshot {
  property_code: string
  snapshot: AvailabilityDailyTrend | null
}

export function useAvailabilityAnalysis() {
  const supabase = useSupabaseClient()
  const { activeProperty } = usePropertyState()

  const latestSnapshot     = ref<AvailabilitySnapshot | null>(null)
  const dailyTrend         = ref<AvailabilityDailyTrend[]>([])
  const weeklyTrend        = ref<AvailabilityWeeklyTrend[]>([])
  const floorPlanBreakdown = ref<FloorPlanBreakdown[]>([])
  const priceChangeEvents  = ref<PriceChangeEvent[]>([])
  const allPropertySnapshots = ref<AllPropertySnapshot[]>([])
  const loading = ref(false)
  const error   = ref<string | null>(null)

  async function fetchLatestSnapshot(propertyCode?: string) {
    const pCode = propertyCode || activeProperty.value
    if (!pCode) return

    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('availability_snapshots')
        .select('*')
        .eq('property_code', pCode)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single()

      if (err && err.code !== 'PGRST116') throw err
      latestSnapshot.value = data || null
    } catch (err: any) {
      console.error('Error fetching latest availability snapshot:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  async function fetchDailyTrend(propertyCode?: string) {
    const pCode = propertyCode || activeProperty.value
    if (!pCode) return

    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('view_availability_daily_trend')
        .select('*')
        .eq('property_code', pCode)
        .order('snapshot_date', { ascending: true })

      if (err) throw err
      dailyTrend.value = data || []
    } catch (err: any) {
      console.error('Error fetching availability daily trend:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  async function fetchWeeklyTrend(propertyCode?: string) {
    const pCode = propertyCode || activeProperty.value
    if (!pCode) return

    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('view_availability_weekly_trend')
        .select('*')
        .eq('property_code', pCode)
        .order('week_start', { ascending: true })

      if (err) throw err
      weeklyTrend.value = data || []
    } catch (err: any) {
      console.error('Error fetching availability weekly trend:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  async function fetchFloorPlanBreakdown(propertyCode?: string) {
    const pCode = propertyCode || activeProperty.value
    if (!pCode) return

    loading.value = true
    try {
      // Two separate queries to avoid PostgREST 3-level join disambiguation issues
      // 1. Units with floor plan names for this property
      const { data: unitsData, error: unitsErr } = await supabase
        .from('units')
        .select('id, floor_plan_id, floor_plans(name)')
        .eq('property_code', pCode)
        .eq('is_active', true)

      if (unitsErr) throw unitsErr

      // Build unit → floor plan lookup
      const unitFpMap = new Map<string, { floor_plan_id: string; floor_plan_name: string }>()
      for (const u of (unitsData || [])) {
        const fp = u.floor_plans as any
        unitFpMap.set(u.id, {
          floor_plan_id:   u.floor_plan_id || 'unknown',
          floor_plan_name: fp?.name || 'Unknown Floor Plan'
        })
      }

      // 2. Active availabilities with unit_id + status + rent
      const { data: availsData, error: availsErr } = await supabase
        .from('availabilities')
        .select('unit_id, status, rent_market')
        .eq('property_code', pCode)
        .eq('is_active', true)
        .in('status', ['Available', 'Applied', 'Leased'])

      if (availsErr) throw availsErr

      // Group by floor plan client-side
      const grouped = new Map<string, {
        floor_plan_id: string
        floor_plan_name: string
        available: number
        applied: number
        leased: number
        rents: number[]
      }>()

      for (const row of (availsData || [])) {
        const fpInfo = unitFpMap.get(row.unit_id) ?? { floor_plan_id: 'unknown', floor_plan_name: 'Unknown Floor Plan' }
        const key = fpInfo.floor_plan_id

        if (!grouped.has(key)) {
          grouped.set(key, { ...fpInfo, available: 0, applied: 0, leased: 0, rents: [] })
        }

        const entry = grouped.get(key)!
        if (row.status === 'Available')     entry.available++
        else if (row.status === 'Applied')  entry.applied++
        else if (row.status === 'Leased')   entry.leased++

        if (row.rent_market && row.rent_market > 0) {
          entry.rents.push(Number(row.rent_market))
        }
      }

      floorPlanBreakdown.value = Array.from(grouped.values()).map(g => ({
        floor_plan_id:   g.floor_plan_id,
        floor_plan_name: g.floor_plan_name,
        available:       g.available,
        applied:         g.applied,
        leased:          g.leased,
        avg_market_rent: g.rents.length ? Math.round(g.rents.reduce((s, r) => s + r, 0) / g.rents.length) : null
      })).sort((a, b) => b.available - a.available)
    } catch (err: any) {
      console.error('Error fetching floor plan breakdown:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  async function fetchPriceChangeEvents(propertyCode?: string, days = 90) {
    const pCode = propertyCode || activeProperty.value
    if (!pCode) return

    loading.value = true
    try {
      const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      const { data, error: err } = await supabase
        .from('solver_events')
        .select('id, property_code, event_type, created_at, details')
        .eq('property_code', pCode)
        .eq('event_type', 'price_change')
        .gte('created_at', sinceDate)
        .order('created_at', { ascending: true })

      if (err) throw err
      priceChangeEvents.value = (data || []).map(e => ({
        id:            e.id,
        property_code: e.property_code,
        event_type:    e.event_type,
        event_date:    e.created_at,
        details:       e.details as any
      }))
    } catch (err: any) {
      console.error('Error fetching price change events:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  async function fetchAllPropertySnapshots(propertyCodes: string[]) {
    if (!propertyCodes.length) return

    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('view_availability_daily_trend')
        .select('*')
        .in('property_code', propertyCodes)
        .order('snapshot_date', { ascending: false })

      if (err) throw err

      // Get latest snapshot per property
      const latestPerProp = new Map<string, AvailabilityDailyTrend>()
      for (const row of (data || [])) {
        if (!latestPerProp.has(row.property_code)) {
          latestPerProp.set(row.property_code, row as AvailabilityDailyTrend)
        }
      }

      allPropertySnapshots.value = propertyCodes.map(code => ({
        property_code: code,
        snapshot: latestPerProp.get(code) || null
      }))
    } catch (err: any) {
      console.error('Error fetching all property snapshots:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  return {
    latestSnapshot,
    dailyTrend,
    weeklyTrend,
    floorPlanBreakdown,
    priceChangeEvents,
    allPropertySnapshots,
    loading,
    error,
    fetchLatestSnapshot,
    fetchDailyTrend,
    fetchWeeklyTrend,
    fetchFloorPlanBreakdown,
    fetchPriceChangeEvents,
    fetchAllPropertySnapshots
  }
}
