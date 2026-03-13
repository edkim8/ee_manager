import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '../../../../../types/supabase'
import { generateHighFidelityHtmlReport, type PropertySnapshotDeltas, type PropertyRenewalCountsMap, type PipelineMoveOutRow, type PipelineMoveInRow, type PipelineOptions } from '../../../../base/utils/reporting'

export default defineEventHandler(async (event) => {
  const client = serverSupabaseServiceRole<Database>(event)
  const baseUrl = getRequestURL(event).origin

  // Accept optional ?date=YYYY-MM-DD to load a specific day's report.
  // Defaults to the most recent completed run when omitted.
  // Accept optional ?showAll=1 to show full pipeline without truncation.
  const dateParam = (getQuery(event).date as string | undefined) || null
  const showAll = (getQuery(event).showAll as string | undefined) === '1'

  const { data: run, error: runError } = await (() => {
    const base = client
      .from('solver_runs')
      .select('*')
      .eq('status', 'completed')
      .order('upload_date', { ascending: false })
      .limit(1)

    if (dateParam) {
      const nextDay = new Date(dateParam)
      nextDay.setDate(nextDay.getDate() + 1)
      return base
        .gte('upload_date', dateParam)
        .lt('upload_date', nextDay.toISOString().split('T')[0])
        .single()
    }
    return base.single()
  })()

  if (runError || !run) {
    throw createError({
      statusCode: 404,
      statusMessage: dateParam
        ? `No completed solver run found for ${dateParam}`
        : 'No completed solver run found',
    })
  }

  const propertiesProcessed = run.properties_processed || []
  if (propertiesProcessed.length === 0) {
    return { html: '<p>No properties processed in the latest run.</p>', run }
  }

  // Fetch events for this run
  const { data: events } = await client
    .from('solver_events')
    .select('*')
    .eq('solver_run_id', run.id)

  const allEvents = (events || []) as any[]
  const uploadDateStr = new Date(run.upload_date).toDateString()

  // Operational data queries
  const [
    { data: alertsData },
    { data: workOrdersData },
    { data: makeReadyData },
    { data: delinquenciesData },
    { data: stagingData },
    { data: snapshotRows },
    { data: renewalItemsData },
    { data: moveOutPipelineData },
    { data: moveInPipelineData },
  ] = await Promise.all([
    client.from('view_table_alerts_unified')
      .select('property_code, is_active, created_at')
      .in('property_code', propertiesProcessed),

    client.from('work_orders')
      .select('property_code, is_active, completion_date, created_at, call_date')
      .in('property_code', propertiesProcessed),

    client.from('unit_flags')
      .select('unit_id, property_code, severity, resolved_at')
      .in('property_code', propertiesProcessed)
      .ilike('flag_type', 'makeready%'),

    client.from('delinquencies')
      .select('property_code, total_unpaid, days_31_60, days_61_90, days_90_plus')
      .in('property_code', propertiesProcessed)
      .eq('is_active', true),

    client.from('import_staging')
      .select('report_type, error_log')
      .eq('batch_id', run.batch_id),

    (() => {
      const snapshotDate = new Date(run.upload_date).toISOString().split('T')[0]
      const prevDate = new Date(run.upload_date)
      prevDate.setDate(prevDate.getDate() - 1)
      const prevDateStr = prevDate.toISOString().split('T')[0]
      return client.from('availability_snapshots')
        .select('property_code, snapshot_date, available_count, avg_contracted_rent')
        .in('property_code', propertiesProcessed)
        .in('snapshot_date', [snapshotDate, prevDateStr])
    })(),

    client.from('renewal_worksheet_items')
      .select('property_code, status')
      .in('property_code', propertiesProcessed)
      .in('status', ['pending', 'offered']),

    // Move-out pipeline: all Notice tenancies with a move_out_date
    client.from('tenancies')
      .select('id, unit_id, property_code, move_out_date, units(unit_name), residents(name, role)')
      .in('property_code', propertiesProcessed)
      .eq('status', 'Notice')
      .not('move_out_date', 'is', null)
      .order('move_out_date', { ascending: true }),

    // Move-in pipeline: all Future/Applicant tenancies with a move_in_date
    client.from('tenancies')
      .select('id, unit_id, property_code, move_in_date, status, units(unit_name), residents(name, role)')
      .in('property_code', propertiesProcessed)
      .in('status', ['Future', 'Applicant'])
      .not('move_in_date', 'is', null)
      .order('move_in_date', { ascending: true }),
  ])

  const filesProcessed = stagingData?.length || 0
  const filesWithErrors = stagingData?.filter(s => s.error_log).length || 0

  // Build snapshot deltas
  const snapshotDate = new Date(run.upload_date).toISOString().split('T')[0]
  const prevDate = new Date(run.upload_date)
  prevDate.setDate(prevDate.getDate() - 1)
  const prevDateStr = prevDate.toISOString().split('T')[0]

  const todaySnaps = new Map(
    (snapshotRows || []).filter(r => r.snapshot_date === snapshotDate).map(r => [r.property_code, r])
  )
  const prevSnaps = new Map(
    (snapshotRows || []).filter(r => r.snapshot_date === prevDateStr).map(r => [r.property_code, r])
  )

  const snapshotDeltas: PropertySnapshotDeltas = {}
  for (const code of propertiesProcessed) {
    const today = todaySnaps.get(code)
    if (!today) continue
    const prev = prevSnaps.get(code)
    snapshotDeltas[code] = {
      available_count: today.available_count ?? 0,
      available_delta: prev != null ? (today.available_count ?? 0) - (prev.available_count ?? 0) : null,
      avg_contracted_rent: today.avg_contracted_rent ?? 0,
      rent_delta: prev != null ? Math.round((today.avg_contracted_rent ?? 0) - (prev.avg_contracted_rent ?? 0)) : null,
    }
  }

  // Build renewal counts
  const renewalCounts: PropertyRenewalCountsMap = {}
  for (const code of propertiesProcessed) {
    const items = renewalItemsData?.filter(r => r.property_code === code) || []
    renewalCounts[code] = {
      pending: items.filter(r => r.status === 'pending').length,
      offered: items.filter(r => r.status === 'offered').length,
    }
  }

  // Build operational summary
  const overdueThreshold = new Date(run.upload_date)
  overdueThreshold.setDate(overdueThreshold.getDate() - 3)

  const operationalSummary = {
    alerts: {
      active: alertsData?.filter(a => a.is_active).length ?? 0,
      newToday: alertsData?.filter(a => a.created_at && new Date(a.created_at).toDateString() === uploadDateStr).length ?? 0,
      closedToday: 0,
    },
    workOrders: {
      open: workOrdersData?.filter(w => w.is_active && !w.completion_date).length ?? 0,
      newToday: workOrdersData?.filter(w => w.created_at && new Date(w.created_at).toDateString() === uploadDateStr).length ?? 0,
      completedToday: workOrdersData?.filter(w => w.completion_date && new Date(w.completion_date).toDateString() === uploadDateStr).length ?? 0,
      overdueOpen: workOrdersData?.filter(w => {
        if (!w.is_active || w.completion_date) return false
        const callDate = w.call_date ? new Date(w.call_date) : null
        return callDate != null && callDate < overdueThreshold
      }).length ?? 0,
    },
    makeReady: {
      active: makeReadyData?.filter(f => !f.resolved_at).length ?? 0,
      overdue: makeReadyData?.filter(f => !f.resolved_at && f.severity === 'error').length ?? 0,
      readyThisWeek: 0,
    },
    delinquencies: {
      count: delinquenciesData?.length ?? 0,
      totalAmount: delinquenciesData?.reduce((sum, d) => sum + (Number(d.total_unpaid) || 0), 0) ?? 0,
      over90Days: delinquenciesData?.filter(d => Number(d.days_90_plus) > 0).length ?? 0,
      amount30Plus: delinquenciesData?.reduce((sum, d) =>
        sum + (Number(d.days_31_60) || 0) + (Number(d.days_61_90) || 0) + (Number(d.days_90_plus) || 0), 0) ?? 0,
    },
    technical: {
      filesProcessed,
      filesWithErrors,
      status: run.status,
      errorMessage: run.error_message,
    },
  }

  // Build move-out pipeline rows
  const moveOutPipeline: PipelineMoveOutRow[] = (moveOutPipelineData || []).map((t: any) => {
    const primary = (t.residents as any[])?.find((r: any) => r.role === 'Primary')
    return {
      unit_name: (t.units as any)?.unit_name || '?',
      property_code: t.property_code,
      resident_name: primary?.name || 'Unknown',
      move_out_date: t.move_out_date,
    }
  })

  // Build move-in pipeline rows, cross-referencing open make-ready flags
  const makeReadyUnitIds = new Set(
    (makeReadyData || []).filter(f => !f.resolved_at).map(f => (f as any).unit_id as string)
  )
  const moveInPipeline: PipelineMoveInRow[] = (moveInPipelineData || []).map((t: any) => {
    const primary = (t.residents as any[])?.find((r: any) => r.role === 'Primary')
    return {
      unit_name: (t.units as any)?.unit_name || '?',
      property_code: t.property_code,
      resident_name: primary?.name || 'Unknown',
      move_in_date: t.move_in_date,
      status: t.status,
      makeready_conflict: makeReadyUnitIds.has(t.unit_id),
    }
  })

  const pipelineOpts: PipelineOptions | undefined = showAll
    ? undefined
    : { truncateDays: 7, viewAllUrl: `${baseUrl}/solver/report?showAll=1` }

  const html = generateHighFidelityHtmlReport(
    run,
    allEvents,
    operationalSummary,
    baseUrl,
    snapshotDeltas,
    renewalCounts,
    moveOutPipeline,
    moveInPipeline,
    pipelineOpts,
  )

  return { html, run }
})
