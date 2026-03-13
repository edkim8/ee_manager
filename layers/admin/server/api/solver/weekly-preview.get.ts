import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '../../../../../types/supabase'
import {
  generateWeeklyHtmlReport,
  type WeeklyOccupancyRow,
  type WeeklyActivitySummary,
  type WeeklyMakeReadyStats,
  type WeeklyWorkOrderStats,
  type WeeklyDelinquencyRow,
  type PipelineMoveOutRow,
  type PipelineMoveInRow,
  type PipelineOptions,
} from '../../../../base/utils/reporting'
import { PROPERTY_LIST } from '../../../../base/constants/properties'

/**
 * GET /api/solver/weekly-preview?date=YYYY-MM-DD
 *
 * Returns { html, weekStartDate, weekEndDate } for the weekly report page.
 * The ?date param should be a Monday (week start). Defaults to the most
 * recent Monday when omitted.
 */
export default defineEventHandler(async (event) => {
  const client = serverSupabaseServiceRole<Database>(event)
  const baseUrl = getRequestURL(event).origin
  const dateParam = (getQuery(event).date as string | undefined) || null
  const showAll = (getQuery(event).showAll as string | undefined) === '1'

  // Anchor to Monday. If date provided use it; otherwise find most recent Monday.
  function toMonday(isoDate: string): string {
    const d = new Date(isoDate + 'T12:00:00')
    const day = d.getDay() // 0=Sun, 1=Mon
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return d.toISOString().split('T')[0]
  }

  function todayISO(): string {
    return new Date().toISOString().split('T')[0]
  }

  const weekStartDate = dateParam ? toMonday(dateParam) : toMonday(todayISO())
  const weekEndRaw = new Date(weekStartDate + 'T12:00:00')
  weekEndRaw.setDate(weekEndRaw.getDate() + 6)
  const weekEndDate = weekEndRaw.toISOString().split('T')[0]

  const allPropertyCodes = PROPERTY_LIST.map(p => p.code) as string[]

  const overdueThresholdDate = new Date(weekEndDate + 'T12:00:00')
  overdueThresholdDate.setDate(overdueThresholdDate.getDate() - 3)
  const overdueThresholdStr = overdueThresholdDate.toISOString().split('T')[0]

  const [
    { data: snapshotRows },
    { data: solverEvents },
    { data: makeReadyFlags },
    { data: workOrdersData },
    { data: delinquenciesData },
    { data: moveOutTenancies },
    { data: moveInTenancies },
  ] = await Promise.all([
    client.from('availability_snapshots')
      .select('property_code, snapshot_date, available_count, avg_contracted_rent')
      .in('property_code', allPropertyCodes)
      .in('snapshot_date', [weekEndDate, weekStartDate]),

    client.from('solver_events')
      .select('property_code, event_type, details, created_at')
      .in('property_code', allPropertyCodes)
      .in('event_type', ['move_out', 'new_tenancy', 'notice_given', 'lease_renewal', 'silent_drop'])
      .gte('created_at', weekStartDate)
      .lte('created_at', weekEndDate + 'T23:59:59'),

    client.from('unit_flags')
      .select('unit_id, property_code, severity, resolved_at, flag_type')
      .in('property_code', allPropertyCodes)
      .ilike('flag_type', 'makeready%'),

    client.from('work_orders')
      .select('property_code, is_active, completion_date, created_at, call_date')
      .in('property_code', allPropertyCodes),

    client.from('delinquencies')
      .select('property_code, total_unpaid, days_31_60, days_61_90, days_90_plus')
      .in('property_code', allPropertyCodes)
      .eq('is_active', true),

    client.from('tenancies')
      .select('id, unit_id, property_code, move_out_date, units(unit_name), residents(name, role)')
      .in('property_code', allPropertyCodes)
      .eq('status', 'Notice')
      .not('move_out_date', 'is', null)
      .order('move_out_date', { ascending: true }),

    client.from('tenancies')
      .select('id, unit_id, property_code, move_in_date, status, units(unit_name), residents(name, role)')
      .in('property_code', allPropertyCodes)
      .in('status', ['Future', 'Applicant'])
      .not('move_in_date', 'is', null)
      .order('move_in_date', { ascending: true }),
  ])

  // Occupancy WoW
  const todaySnaps = new Map(
    (snapshotRows || []).filter(r => r.snapshot_date === weekEndDate).map(r => [r.property_code, r])
  )
  const prevSnaps = new Map(
    (snapshotRows || []).filter(r => r.snapshot_date === weekStartDate).map(r => [r.property_code, r])
  )

  const occupancy: WeeklyOccupancyRow[] = allPropertyCodes.map(code => {
    const today = todaySnaps.get(code)
    const prev = prevSnaps.get(code)
    return {
      property_code: code,
      available_today: today?.available_count ?? 0,
      available_7d_ago: prev?.available_count ?? null,
      available_delta: today && prev ? (today.available_count ?? 0) - (prev.available_count ?? 0) : null,
      avg_rent_today: today?.avg_contracted_rent ?? 0,
      avg_rent_7d_ago: prev?.avg_contracted_rent ?? null,
      rent_delta: today && prev ? Math.round((today.avg_contracted_rent ?? 0) - (prev.avg_contracted_rent ?? 0)) : null,
    }
  })

  // Leasing activity
  const activity: WeeklyActivitySummary[] = allPropertyCodes.map(code => {
    const events = (solverEvents || []).filter(e => e.property_code === code)
    return {
      property_code: code,
      move_ins: events.filter(e => e.event_type === 'new_tenancy' && (e.details as any)?.status === 'Current').length,
      move_outs: events.filter(e => e.event_type === 'move_out').length,
      silent_drops: events.filter(e => e.event_type === 'silent_drop').length,
      notices_given: events.filter(e => e.event_type === 'notice_given').length,
      renewals: events.filter(e => e.event_type === 'lease_renewal').length,
      pipeline_added: events.filter(e =>
        e.event_type === 'new_tenancy' && ['Future', 'Applicant'].includes((e.details as any)?.status)
      ).length,
    }
  })

  // Make-ready
  const makeReady: WeeklyMakeReadyStats[] = allPropertyCodes.map(code => {
    const flags = (makeReadyFlags || []).filter(f => f.property_code === code)
    return {
      property_code: code,
      completed_this_week: flags.filter(f => f.resolved_at != null && f.resolved_at >= weekStartDate).length,
      currently_overdue: flags.filter(f => !f.resolved_at && f.severity === 'error').length,
    }
  })

  // Work orders
  const workOrders: WeeklyWorkOrderStats[] = allPropertyCodes.map(code => {
    const wos = (workOrdersData || []).filter(w => w.property_code === code)
    return {
      property_code: code,
      opened_this_week: wos.filter(w => w.created_at && w.created_at >= weekStartDate).length,
      completed_this_week: wos.filter(w => w.completion_date && w.completion_date >= weekStartDate).length,
      currently_overdue: wos.filter(w => {
        if (!w.is_active || w.completion_date) return false
        return w.call_date != null && w.call_date < overdueThresholdStr
      }).length,
    }
  })

  // Delinquencies
  const delinquencies: WeeklyDelinquencyRow[] = allPropertyCodes
    .map(code => {
      const rows = (delinquenciesData || []).filter(d => d.property_code === code)
      if (rows.length === 0) return null
      return {
        property_code: code,
        count: rows.length,
        total_unpaid: rows.reduce((s, d) => s + (Number(d.total_unpaid) || 0), 0),
        amount_30_plus: rows.reduce((s, d) =>
          s + (Number(d.days_31_60) || 0) + (Number(d.days_61_90) || 0) + (Number(d.days_90_plus) || 0), 0),
      }
    })
    .filter(Boolean) as WeeklyDelinquencyRow[]

  // Pipelines
  const openMakeReadyUnitIds = new Set(
    (makeReadyFlags || []).filter(f => !f.resolved_at).map(f => (f as any).unit_id as string)
  )

  const moveOutPipeline: PipelineMoveOutRow[] = (moveOutTenancies || []).map((t: any) => {
    const primary = (t.residents as any[])?.find((r: any) => r.role === 'Primary')
    return {
      unit_name: (t.units as any)?.unit_name || '?',
      property_code: t.property_code,
      resident_name: primary?.name || 'Unknown',
      move_out_date: t.move_out_date,
    }
  })

  const moveInPipeline: PipelineMoveInRow[] = (moveInTenancies || []).map((t: any) => {
    const primary = (t.residents as any[])?.find((r: any) => r.role === 'Primary')
    return {
      unit_name: (t.units as any)?.unit_name || '?',
      property_code: t.property_code,
      resident_name: primary?.name || 'Unknown',
      move_in_date: t.move_in_date,
      status: t.status,
      makeready_conflict: openMakeReadyUnitIds.has(t.unit_id),
    }
  })

  const pipelineOpts: PipelineOptions | undefined = showAll
    ? undefined
    : { truncateDays: 7, viewAllUrl: `${baseUrl}/solver/weekly-report?showAll=1` }

  const html = generateWeeklyHtmlReport({
    weekEndDate,
    weekStartDate,
    propertyCodes: allPropertyCodes,
    occupancy,
    activity,
    moveOutPipeline,
    moveInPipeline,
    makeReady,
    workOrders,
    delinquencies,
    baseUrl,
    pipelineOpts,
  })

  return { html, weekStartDate, weekEndDate }
})
