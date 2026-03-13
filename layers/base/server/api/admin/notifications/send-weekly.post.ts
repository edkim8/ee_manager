import nodemailer from 'nodemailer'
import { serverSupabaseServiceRole } from '#supabase/server'
import { Database } from '../../../../../types/supabase'
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
} from '../../../../utils/reporting'
import { PROPERTY_LIST } from '../../../../constants/properties'

/**
 * POST /api/admin/notifications/send-weekly
 *
 * Generates and emails the Monday Weekly Operational Summary.
 * Optionally accepts a `date` body param (YYYY-MM-DD) to anchor the week end date.
 * Defaults to today.
 *
 * Recipients: property_notification_recipients with 'weekly_summary' in notification_types.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const config = useRuntimeConfig()
  const client = serverSupabaseServiceRole<Database>(event)
  const baseUrl = getRequestURL(event).origin

  // Week window: weekEndDate (today or supplied) and 7 days prior
  const weekEndDate = (body?.date as string | undefined) || new Date().toISOString().split('T')[0]
  const weekStart = new Date(weekEndDate + 'T12:00:00')
  weekStart.setDate(weekStart.getDate() - 6)
  const weekStartDate = weekStart.toISOString().split('T')[0]

  const allPropertyCodes = PROPERTY_LIST.map(p => p.code) as string[]

  // ── 1. Fetch all data in parallel ──────────────────────────────────────────
  const overdueThresholdDate = new Date(weekEndDate + 'T12:00:00')
  overdueThresholdDate.setDate(overdueThresholdDate.getDate() - 3)
  const overdueThresholdStr = overdueThresholdDate.toISOString().split('T')[0]

  const sevenDaysAgoDate = weekStartDate

  const [
    { data: snapshotRows },
    { data: solverEvents },
    { data: makeReadyFlags },
    { data: workOrdersData },
    { data: delinquenciesData },
    { data: moveOutTenancies },
    { data: moveInTenancies },
  ] = await Promise.all([
    // Occupancy snapshots: today + 7 days ago
    client.from('availability_snapshots')
      .select('property_code, snapshot_date, available_count, avg_contracted_rent')
      .in('property_code', allPropertyCodes)
      .in('snapshot_date', [weekEndDate, weekStartDate]),

    // Solver events for the past 7 days
    client.from('solver_events')
      .select('property_code, event_type, details, created_at')
      .in('property_code', allPropertyCodes)
      .in('event_type', ['move_out', 'new_tenancy', 'notice_given', 'lease_renewal', 'silent_drop'])
      .gte('created_at', weekStartDate),

    // Make-ready flags: both resolved this week and all unresolved
    client.from('unit_flags')
      .select('property_code, severity, resolved_at, flag_type')
      .in('property_code', allPropertyCodes)
      .ilike('flag_type', 'makeready%'),

    // Work orders
    client.from('work_orders')
      .select('property_code, is_active, completion_date, created_at, call_date')
      .in('property_code', allPropertyCodes),

    // Active delinquencies
    client.from('delinquencies')
      .select('property_code, total_unpaid, days_31_60, days_61_90, days_90_plus')
      .in('property_code', allPropertyCodes)
      .eq('is_active', true),

    // Move-out pipeline: Notice tenancies with move_out_date
    client.from('tenancies')
      .select('id, unit_id, property_code, move_out_date, units(unit_name), residents(name, role)')
      .in('property_code', allPropertyCodes)
      .eq('status', 'Notice')
      .not('move_out_date', 'is', null)
      .order('move_out_date', { ascending: true }),

    // Move-in pipeline: Future/Applicant tenancies with move_in_date
    client.from('tenancies')
      .select('id, unit_id, property_code, move_in_date, status, units(unit_name), residents(name, role)')
      .in('property_code', allPropertyCodes)
      .in('status', ['Future', 'Applicant'])
      .not('move_in_date', 'is', null)
      .order('move_in_date', { ascending: true }),
  ])

  // ── 2. Build occupancy WoW ─────────────────────────────────────────────────
  const todaySnaps = new Map(
    (snapshotRows || []).filter(r => r.snapshot_date === weekEndDate).map(r => [r.property_code, r])
  )
  const sevenDaySnaps = new Map(
    (snapshotRows || []).filter(r => r.snapshot_date === weekStartDate).map(r => [r.property_code, r])
  )

  const occupancy: WeeklyOccupancyRow[] = allPropertyCodes.map(code => {
    const today = todaySnaps.get(code)
    const prev = sevenDaySnaps.get(code)
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

  // ── 3. Build activity summary from solver_events ───────────────────────────
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
        e.event_type === 'new_tenancy' &&
        ['Future', 'Applicant'].includes((e.details as any)?.status)
      ).length,
    }
  })

  // ── 4. Build make-ready stats ──────────────────────────────────────────────
  const makeReady: WeeklyMakeReadyStats[] = allPropertyCodes.map(code => {
    const flags = (makeReadyFlags || []).filter(f => f.property_code === code)
    return {
      property_code: code,
      completed_this_week: flags.filter(f =>
        f.resolved_at != null && f.resolved_at >= sevenDaysAgoDate
      ).length,
      currently_overdue: flags.filter(f => !f.resolved_at && f.severity === 'error').length,
    }
  })

  // ── 5. Build work order stats ──────────────────────────────────────────────
  const workOrders: WeeklyWorkOrderStats[] = allPropertyCodes.map(code => {
    const wos = (workOrdersData || []).filter(w => w.property_code === code)
    return {
      property_code: code,
      opened_this_week: wos.filter(w => w.created_at && w.created_at >= sevenDaysAgoDate).length,
      completed_this_week: wos.filter(w => w.completion_date && w.completion_date >= sevenDaysAgoDate).length,
      currently_overdue: wos.filter(w => {
        if (!w.is_active || w.completion_date) return false
        const callDate = w.call_date
        return callDate != null && callDate < overdueThresholdStr
      }).length,
    }
  })

  // ── 6. Build delinquency rows ──────────────────────────────────────────────
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

  // ── 7. Build pipeline rows ─────────────────────────────────────────────────
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

  // ── 8. Fetch weekly_summary recipients ────────────────────────────────────
  const { data: recipients, error: recError } = await client
    .from('property_notification_recipients')
    .select('email, property_code')
    .in('property_code', allPropertyCodes)
    .eq('is_active', true)
    .contains('notification_types', ['weekly_summary'])

  if (recError) {
    throw createError({ statusCode: 500, statusMessage: recError.message })
  }
  if (!recipients || recipients.length === 0) {
    return { success: true, message: 'No weekly_summary recipients configured' }
  }

  // Consolidate by email, collect subscribed property codes
  const emailToProperties = recipients.reduce((acc, r) => {
    if (!acc[r.email]) acc[r.email] = new Set<string>()
    acc[r.email].add(r.property_code)
    return acc
  }, {} as Record<string, Set<string>>)

  // ── 9. Send emails ────────────────────────────────────────────────────────
  const transporter = nodemailer.createTransport({
    host: config.public.mailersendServer,
    port: parseInt(config.public.mailersendPort as string),
    auth: {
      user: config.public.mailersendUsername,
      pass: config.mailersendPassword,
    },
  })

  const results = []
  const subject = `Weekly Summary — Week of ${new Date(weekStartDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}–${new Date(weekEndDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

  for (const [email, propSet] of Object.entries(emailToProperties)) {
    const propertyCodes = [...propSet]

    // Scope all data to this recipient's subscribed properties
    const pipelineOpts: PipelineOptions = {
      truncateDays: 7,
      viewAllUrl: `${baseUrl}/solver/weekly-report?showAll=1`,
    }

    const scopedInput = {
      weekEndDate,
      weekStartDate,
      propertyCodes,
      occupancy: occupancy.filter(r => propertyCodes.includes(r.property_code)),
      activity: activity.filter(a => propertyCodes.includes(a.property_code)),
      moveOutPipeline: moveOutPipeline.filter(r => propertyCodes.includes(r.property_code)),
      moveInPipeline: moveInPipeline.filter(r => propertyCodes.includes(r.property_code)),
      makeReady: makeReady.filter(r => propertyCodes.includes(r.property_code)),
      workOrders: workOrders.filter(r => propertyCodes.includes(r.property_code)),
      delinquencies: delinquencies.filter(r => propertyCodes.includes(r.property_code)),
      baseUrl,
      pipelineOpts,
    }

    const htmlContent = generateWeeklyHtmlReport(scopedInput)

    try {
      await transporter.sendMail({
        from: `"${config.public.mailersendSmtpName || 'EE Manager'}" <${config.public.mailersendUsername || 'noreply@ee-manager.com'}>`,
        to: email,
        subject,
        html: htmlContent,
      })
      results.push({ email, status: 'sent', propertyCount: propertyCodes.length })
    } catch (sendError: any) {
      console.error(`[Weekly Email] Failed to send to ${email}:`, sendError)
      results.push({ email, status: 'failed', error: sendError.message })
    }
  }

  return { success: true, results, weekStartDate, weekEndDate }
})
