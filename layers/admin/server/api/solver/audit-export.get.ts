import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '../../../../../types/supabase'

/**
 * GET /api/solver/audit-export?date=YYYY-MM-DD
 *
 * Returns a structured plain-text audit payload built entirely from the
 * database — no console-log copy-paste needed. Defaults to the most recent
 * completed solver run when no date is provided.
 *
 * Response: { text: string, run: object, date: string }
 */
export default defineEventHandler(async (event) => {
  const client = serverSupabaseServiceRole<Database>(event)
  const dateParam = (getQuery(event).date as string | undefined) || null

  // 1. Fetch the target solver run
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
        : 'No completed solver runs found',
    })
  }

  const propertiesProcessed = (run.properties_processed || []) as string[]
  const runDate = new Date(run.upload_date).toISOString().split('T')[0]
  const prevDate = new Date(run.upload_date)
  prevDate.setDate(prevDate.getDate() - 1)
  const prevDateStr = prevDate.toISOString().split('T')[0]
  const uploadDateStr = new Date(run.upload_date).toDateString()

  // 2. Fetch events for this run
  const { data: events } = await client
    .from('solver_events')
    .select('*')
    .eq('solver_run_id', run.id)
    .order('created_at', { ascending: true })

  const allEvents = (events || []) as any[]

  // 3. Fetch operational data in parallel
  const [
    { data: alertsData },
    { data: workOrdersData },
    { data: makeReadyData },
    { data: delinquenciesData },
    { data: stagingData },
    { data: snapshotRows },
  ] = await Promise.all([
    client.from('view_table_alerts_unified')
      .select('property_code, is_active, created_at')
      .in('property_code', propertiesProcessed),

    client.from('work_orders')
      .select('property_code, is_active, completion_date, created_at, call_date')
      .in('property_code', propertiesProcessed),

    client.from('unit_flags')
      .select('property_code, severity, resolved_at, flag_type')
      .in('property_code', propertiesProcessed)
      .ilike('flag_type', 'makeready%'),

    client.from('delinquencies')
      .select('property_code, total_unpaid, days_31_60, days_61_90, days_90_plus')
      .in('property_code', propertiesProcessed)
      .eq('is_active', true),

    client.from('import_staging')
      .select('report_type, error_log')
      .eq('batch_id', run.batch_id),

    client.from('availability_snapshots')
      .select('property_code, snapshot_date, available_count, avg_contracted_rent')
      .in('property_code', propertiesProcessed)
      .in('snapshot_date', [runDate, prevDateStr]),
  ])

  // 4. Derived values
  const filesProcessed = stagingData?.length || 0
  const filesWithErrors = stagingData?.filter(s => s.error_log).length || 0

  const overdueThreshold = new Date(run.upload_date)
  overdueThreshold.setDate(overdueThreshold.getDate() - 3)

  const todaySnaps = new Map(
    (snapshotRows || []).filter(r => r.snapshot_date === runDate).map(r => [r.property_code, r])
  )
  const prevSnaps = new Map(
    (snapshotRows || []).filter(r => r.snapshot_date === prevDateStr).map(r => [r.property_code, r])
  )

  const summaryData = (run.summary || {}) as Record<string, any>

  // 5. Event categorization
  const moveIns       = allEvents.filter(e => e.event_type === 'new_tenancy')
  const moveOuts      = allEvents.filter(e => e.event_type === 'move_out')
  const silentDrops   = allEvents.filter(e => e.event_type === 'silent_drop')
  const discrepancies = allEvents.filter(e => e.event_type === 'discrepancy')
  const priceChanges  = allEvents.filter(e => e.event_type === 'price_change')
  const statusFixes   = allEvents.filter(e => e.event_type === 'status_auto_fix')

  // Data quality: events with missing critical date fields (soft check — not a crash)
  const missingDateEvents = allEvents.filter(e =>
    e.details?.missing_move_in_date === true || e.details?.missing_move_out_date === true
  )

  // Sort: critical events first, then by property
  const eventPriority: Record<string, number> = {
    discrepancy: 0, silent_drop: 1, status_auto_fix: 2,
    move_out: 3, notice_given: 4, new_tenancy: 5,
    lease_renewal: 6, price_change: 7, application_saved: 8,
  }
  const sortedEvents = [...allEvents].sort((a, b) =>
    (eventPriority[a.event_type] ?? 99) - (eventPriority[b.event_type] ?? 99) ||
    (a.property_code || '').localeCompare(b.property_code || '')
  )

  // 6. Formatters
  function fmtEvent(e: any): string {
    const d = e.details || {}
    const prop = e.property_code || '?'
    const unit = d.unit_name ? ` | Unit ${d.unit_name}` : ''
    switch (e.event_type) {
      case 'new_tenancy':
        return `[move_in]         ${prop}${unit} | Resident: ${d.resident_name || '?'} | Status: ${d.status || '?'} | Move-in: ${d.move_in_date || '?'}${d.rent_amount ? ` | Rent: $${d.rent_amount}` : ''}`
      case 'move_out':
        return `[move_out]        ${prop}${unit} | Resident: ${d.resident_name || '?'} | Was: ${d.previous_status || '?'} | Move-out: ${d.move_out_date || 'today'}${d.early_moveout ? ' ⚡ EARLY' : ''} | Moved in: ${d.move_in_date || '?'}`
      case 'notice_given':
        return `[notice_given]    ${prop}${unit} | Tenant: ${d.resident_name || '?'} | Notice Date: ${d.notice_date || d.move_out_date || '?'}`
      case 'price_change': {
        const chg = (d.new_rent || 0) - (d.old_rent || 0)
        const pct = d.old_rent ? ((chg / d.old_rent) * 100).toFixed(1) : '?'
        return `[price_change]    ${prop}${unit} | $${d.old_rent} → $${d.new_rent} (${chg >= 0 ? '+' : ''}$${chg}, ${chg >= 0 ? '+' : ''}${pct}%)`
      }
      case 'lease_renewal':
        return `[lease_renewal]   ${prop}${unit} | Tenant: ${d.resident_name || '?'} | New End: ${d.new_lease_end || '?'} | Rent: $${d.new_rent || '?'}`
      case 'silent_drop':
        return `[silent_drop]     ${prop}${unit} | Tenancy: ${e.tenancy_id || '?'} | Was: ${d.old_status || '?'} → Inferred: ${d.new_status || 'Canceled'}`
      case 'discrepancy':
        return `[discrepancy] ⚠️  ${prop}${unit} | ${d.message || JSON.stringify(d)}`
      case 'status_auto_fix':
        return `[status_auto_fix] ${prop}${unit} | ${d.old_status || '?'} → ${d.new_status || '?'} | Reason: ${d.reason || '?'}`
      case 'application_saved':
        return `[application_saved] ${prop}${unit} | Applicant: ${d.resident_name || '?'}`
      default:
        return `[${e.event_type}] ${prop}${unit} | ${JSON.stringify(d)}`
    }
  }

  function fmtPropertySummary(code: string): string {
    const s = summaryData[code]
    if (!s) return `[${code}]\n  (no summary data)`
    const fixes = Array.isArray(s.statusAutoFixes) && s.statusAutoFixes.length
      ? s.statusAutoFixes.join(', ')
      : 'none'
    return [
      `[${code}]`,
      `  Move-Ins:       ${s.tenanciesNew ?? 0}`,
      `  Move-Outs:      ${s.moveOutsProcessed ?? 0}`,
      `  Tenancies:      +${s.tenanciesNew ?? 0} new | ${s.tenanciesUpdated ?? 0} updated`,
      `  Residents:      +${s.residentsNew ?? 0} new | ${s.residentsUpdated ?? 0} updated`,
      `  Leases:         ${s.leasesNew ?? 0} inserted (gap-fill/new) | ${s.leasesUpdated ?? 0} updated | ${s.leasesRenewed ?? 0} renewed`,
      `  Availabilities: ${s.availabilitiesNew ?? 0} new | ${s.availabilitiesUpdated ?? 0} updated`,
      `  Notices:        ${s.noticesProcessed ?? 0} processed`,
      `  Status Fixes:   [${fixes}]`,
      `  MakeReady:      ${s.makereadyFlags ?? 0} flags`,
      `  Applications:   ${s.applicationsSaved ?? 0} saved | ${s.applicationFlags ?? 0} flagged`,
      `  Price Changes:  ${s.priceChanges ?? 0}`,
      `  Transfers:      ${s.transferFlags ?? 0} flagged`,
    ].join('\n')
  }

  function fmtSnapshot(code: string): string {
    const t = todaySnaps.get(code)
    const p = prevSnaps.get(code)
    if (!t) return `${code}: (no snapshot)`
    const avail = t.available_count ?? 0
    const rent  = Math.round(t.avg_contracted_rent ?? 0)
    const availDelta = p != null ? avail - (p.available_count ?? 0) : null
    const rentDelta  = p != null ? Math.round(rent - (p.avg_contracted_rent ?? 0)) : null
    const ad = availDelta != null ? ` (${availDelta >= 0 ? '+' : ''}${availDelta} from prev)` : ''
    const rd = rentDelta  != null ? ` (${rentDelta  >= 0 ? '+' : ''}$${rentDelta})` : ''
    return `${code}: ${avail} available${ad} | Avg Rent $${rent}${rd}`
  }

  // Operational totals
  const totalDelinqAmount = delinquenciesData?.reduce((s, d) => s + (Number(d.total_unpaid) || 0), 0) ?? 0
  const amount30Plus = delinquenciesData?.reduce((s, d) =>
    s + (Number(d.days_31_60) || 0) + (Number(d.days_61_90) || 0) + (Number(d.days_90_plus) || 0), 0) ?? 0
  const over90Count  = delinquenciesData?.filter(d => Number(d.days_90_plus) > 0).length ?? 0
  const openWOs      = workOrdersData?.filter(w => w.is_active && !w.completion_date).length ?? 0
  const overdueWOs   = workOrdersData?.filter(w => {
    if (!w.is_active || w.completion_date) return false
    const cd = w.call_date ? new Date(w.call_date) : null
    return cd != null && cd < overdueThreshold
  }).length ?? 0
  const newAlertsToday = alertsData?.filter(a =>
    a.created_at && new Date(a.created_at).toDateString() === uploadDateStr
  ).length ?? 0

  const runDateLabel = new Date(run.upload_date).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  // 7. Assemble the text payload
  const lines: string[] = [
    '=== EE MANAGER — DAILY SOLVER AUDIT PAYLOAD ===',
    `Generated from database — no console-log copy-paste required`,
    ``,
    `Date:       ${runDateLabel}`,
    `Run ID:     ${run.id}`,
    `Batch ID:   ${run.batch_id}`,
    `Status:     ${run.status.toUpperCase()}`,
    `Properties: ${propertiesProcessed.join(', ')}`,
    `Files:      ${filesProcessed} in batch | ${filesWithErrors} parse errors`,
    ``,
    `=== PROPERTY SUMMARIES ===`,
    ``,
    ...propertiesProcessed.map(code => fmtPropertySummary(code) + '\n'),
    `=== EVENT LOG (${allEvents.length} total) ===`,
    ``,
    ...(sortedEvents.length ? sortedEvents.map(fmtEvent) : ['  (no events)']),
    ``,
    `=== MOVE-INS (${moveIns.length}) ===`,
    ...(moveIns.length === 0
      ? ['  None']
      : moveIns.map(e => {
          const d = e.details || {}
          return `  ${e.property_code} | Unit ${d.unit_name || '?'} | ${d.resident_name || '?'} | Status: ${d.status || '?'} | Move-in: ${d.move_in_date || '?'}${d.rent_amount ? ` | $${d.rent_amount}/mo` : ''}`
        })),
    ``,
    `=== MOVE-OUTS (${moveOuts.length}) ===`,
    ...(moveOuts.length === 0
      ? ['  None']
      : moveOuts.map(e => {
          const d = e.details || {}
          return `  ${e.property_code} | Unit ${d.unit_name || '?'} | ${d.resident_name || '?'} | Was: ${d.previous_status || '?'} | Move-in: ${d.move_in_date || '?'} | Move-out: ${d.move_out_date || 'today'}${d.early_moveout ? ' ⚡ EARLY' : ''}`
        })),
    ``,
    `=== SILENT DROPS (${silentDrops.length}) ===`,
    ...(silentDrops.length === 0
      ? ['  None']
      : silentDrops.map(e => {
          const d = e.details || {}
          const unit = d.unit_name ? `Unit ${d.unit_name}` : `Tenancy ${e.tenancy_id || '?'}`
          return `  - ${e.property_code} | ${unit} | ${d.old_status || '?'} → ${d.new_status || 'Canceled'}`
        })),
    ``,
    `=== DISCREPANCIES (${discrepancies.length}) ===`,
    ...(discrepancies.length === 0
      ? ['  None']
      : discrepancies.map(e => `  ⚠️ ${e.property_code}: ${e.details?.message || JSON.stringify(e.details)}`)),
    ``,
    `=== STATUS AUTO-FIXES (${statusFixes.length}) ===`,
    ...(statusFixes.length === 0
      ? ['  None']
      : statusFixes.map(e => {
          const d = e.details || {}
          return `  - ${e.property_code} | ${d.unit_name ? 'Unit ' + d.unit_name : '?'}: ${d.old_status || '?'} → ${d.new_status || '?'}`
        })),
    ``,
    `=== PRICE CHANGES (${priceChanges.length}) ===`,
    ...(priceChanges.length === 0
      ? ['  None']
      : [
          `Unit | Property | Old Rent | New Rent | Change | % Change`,
          ...priceChanges.map(e => {
            const d = e.details || {}
            const chg = (d.new_rent || 0) - (d.old_rent || 0)
            const pct = d.old_rent ? ((chg / d.old_rent) * 100).toFixed(1) : '?'
            return `${d.unit_name || '?'} | ${e.property_code} | $${d.old_rent} | $${d.new_rent} | ${chg >= 0 ? '+' : ''}$${chg} | ${chg >= 0 ? '+' : ''}${pct}%`
          }),
        ]),
    ``,
    `=== AVAILABILITY SNAPSHOTS ===`,
    ...propertiesProcessed.map(fmtSnapshot),
    ``,
    `=== DATA QUALITY — MISSING DATES (${missingDateEvents.length}) ===`,
    `NOTE: move_in_date comes from 5p_Residents_Status. move_out_date comes from 5p_Notices / 5p_Residents_Status.`,
    `      During the transitional data-loading period some records may be incomplete.`,
    `      These are soft warnings — runs are not aborted. Resolve by ensuring Yardi files`,
    `      include full date fields or by manually updating the affected tenancy records.`,
    ...(missingDateEvents.length === 0
      ? ['  None — all move-in and move-out dates present ✓']
      : missingDateEvents.map(e => {
          const d = e.details || {}
          const flags = [
            d.missing_move_in_date  ? 'move_in_date missing'  : null,
            d.missing_move_out_date ? 'move_out_date missing' : null,
          ].filter(Boolean).join(', ')
          return `  ⚠️ [${e.event_type}] ${e.property_code} | Unit ${d.unit_name || '?'} | ${d.resident_name || '?'} | ${flags}`
        })),
    ``,
    `=== OPERATIONAL HEALTH ===`,
    `Alerts:         ${alertsData?.filter(a => a.is_active).length ?? 0} active | ${newAlertsToday} new today`,
    `Work Orders:    ${openWOs} open | ${overdueWOs} open > 3 days`,
    `MakeReady:      ${makeReadyData?.filter(f => !f.resolved_at).length ?? 0} active | ${makeReadyData?.filter(f => !f.resolved_at && f.severity === 'error').length ?? 0} overdue`,
    `Delinquencies:  ${delinquenciesData?.length ?? 0} residents | $${totalDelinqAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} total | ${over90Count} over 90 days | $${amount30Plus.toFixed(2)} at 30+ days`,
    ``,
    `=== END PAYLOAD ===`,
  ]

  return {
    text: lines.join('\n'),
    run,
    date: runDate,
  }
})
