import nodemailer from 'nodemailer'
import { serverSupabaseServiceRole } from '#supabase/server'
import { Database } from '../../../../../types/supabase'
import { generateHighFidelityHtmlReport, type PropertySnapshotDeltas, type PropertyRenewalCountsMap } from '../../../../utils/reporting'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { runId } = body

  if (!runId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing runId'
    })
  }

  const config = useRuntimeConfig()
  const client = serverSupabaseServiceRole<Database>(event)

  console.log('[Email API] Using host:', config.public.mailersendServer, 'port:', config.public.mailersendPort)
  
  try {
    // 1. Fetch the Solver Run data
    const { data: run, error: runError } = await client
      .from('solver_runs')
      .select('*')
      .eq('id', runId)
      .single()

    if (runError || !run) throw runError || new Error('Run not found')

    const propertiesProcessed = run.properties_processed || []
    if (propertiesProcessed.length === 0) {
      return { success: true, message: 'No properties to notify' }
    }

    // 2. Fetch all events for this run
    const { data: events, error: eventsError } = await client
      .from('solver_events')
      .select('*')
      .eq('solver_run_id', runId)

    if (eventsError) throw eventsError
    const allEvents = (events || []) as any[]

    // 3. Fetch Operational Data — include property_code in all selects so we can
    //    scope each recipient's summary to only their subscribed properties.

    const uploadDateStr = new Date(run.upload_date).toDateString()

    // 3a. Alerts
    const { data: alertsData } = await client
      .from('view_table_alerts_unified')
      .select('property_code, is_active, created_at')
      .in('property_code', propertiesProcessed)

    // 3b. Work Orders (include call_date to compute overdue = open > 30 days)
    const { data: workOrdersData } = await client
      .from('work_orders')
      .select('property_code, is_active, completion_date, created_at, call_date')
      .in('property_code', propertiesProcessed)

    // 3c. MakeReady Flags
    const { data: makeReadyData } = await client
      .from('unit_flags')
      .select('property_code, severity, resolved_at')
      .in('property_code', propertiesProcessed)
      .ilike('flag_type', 'makeready%')

    // 3d. Delinquencies (include aging buckets for 30+ calculation)
    const { data: delinquenciesData } = await client
      .from('delinquencies')
      .select('property_code, total_unpaid, days_31_60, days_61_90, days_90_plus')
      .in('property_code', propertiesProcessed)
      .eq('is_active', true)

    // 3e. Technical Health (run-wide, not property-scoped)
    const { data: stagingData } = await client
      .from('import_staging')
      .select('report_type, error_log')
      .eq('batch_id', run.batch_id)

    const filesProcessed = stagingData?.length || 0
    const filesWithErrors = stagingData?.filter(s => s.error_log).length || 0

    // 3f. Availability Snapshots — today and yesterday, for day-over-day deltas
    const snapshotDate = new Date(run.upload_date).toISOString().split('T')[0]
    const prevDate = new Date(run.upload_date)
    prevDate.setDate(prevDate.getDate() - 1)
    const prevDateStr = prevDate.toISOString().split('T')[0]

    const { data: snapshotRows } = await client
      .from('availability_snapshots')
      .select('property_code, snapshot_date, available_count, avg_contracted_rent')
      .in('property_code', propertiesProcessed)
      .in('snapshot_date', [snapshotDate, prevDateStr])

    // Build lookup maps: property_code → snapshot for each date
    const todaySnaps = new Map(
      (snapshotRows || [])
        .filter(r => r.snapshot_date === snapshotDate)
        .map(r => [r.property_code, r])
    )
    const prevSnaps = new Map(
      (snapshotRows || [])
        .filter(r => r.snapshot_date === prevDateStr)
        .map(r => [r.property_code, r])
    )

    // Build deltas for all processed properties
    const allSnapshotDeltas: PropertySnapshotDeltas = {}
    for (const code of propertiesProcessed) {
      const today = todaySnaps.get(code)
      if (!today) continue
      const prev = prevSnaps.get(code)
      allSnapshotDeltas[code] = {
        available_count: today.available_count ?? 0,
        available_delta: prev != null ? (today.available_count ?? 0) - (prev.available_count ?? 0) : null,
        avg_contracted_rent: today.avg_contracted_rent ?? 0,
        rent_delta: prev != null ? Math.round((today.avg_contracted_rent ?? 0) - (prev.avg_contracted_rent ?? 0)) : null,
      }
    }

    // 3g. Renewal worksheet items — pending (not offered yet) and offered (awaiting response)
    const { data: renewalItemsData } = await client
      .from('renewal_worksheet_items')
      .select('property_code, status')
      .in('property_code', propertiesProcessed)
      .in('status', ['pending', 'offered'])

    // Build per-property renewal counts for all processed properties
    const allRenewalCounts: PropertyRenewalCountsMap = {}
    for (const code of propertiesProcessed) {
      const items = renewalItemsData?.filter(r => r.property_code === code) || []
      allRenewalCounts[code] = {
        pending: items.filter(r => r.status === 'pending').length,
        offered: items.filter(r => r.status === 'offered').length,
      }
    }

    // Overdue threshold: open WOs with call_date > 3 days before upload_date
    const overdueThreshold = new Date(run.upload_date)
    overdueThreshold.setDate(overdueThreshold.getDate() - 3)

    // 4. Fetch all active daily_summary recipients for these properties
    const { data: recipients, error: recError } = await client
      .from('property_notification_recipients')
      .select('email, property_code')
      .in('property_code', propertiesProcessed)
      .eq('is_active', true)
      .contains('notification_types', ['daily_summary'])

    if (recError) throw recError
    if (!recipients || recipients.length === 0) {
      return { success: true, message: 'No recipients found for these properties' }
    }

    // 4. Consolidate by Email
    const emailToProperties = recipients.reduce((acc, curr) => {
      if (!acc[curr.email]) acc[curr.email] = []
      acc[curr.email].push(curr.property_code)
      return acc
    }, {} as Record<string, string[]>)

    // 5. Setup Transporter
    const transporter = nodemailer.createTransport({
      host: config.public.mailersendServer,
      port: parseInt(config.public.mailersendPort as string),
      auth: {
        user: config.public.mailersendUsername,
        pass: config.mailersendPassword
      }
    })

    const results = []
    const baseUrl = getRequestURL(event).origin

    // 6. Send consolidated emails — each recipient gets a summary scoped to their properties
    for (const [email, propertyCodes] of Object.entries(emailToProperties)) {
      const recipientEvents = allEvents.filter(e => propertyCodes.includes(e.property_code))

      const scopedRun = {
        ...run,
        properties_processed: propertyCodes,
      }

      // Build operational summary scoped to this recipient's properties only
      const ra = alertsData?.filter(a => propertyCodes.includes(a.property_code)) || []
      const rwo = workOrdersData?.filter(w => propertyCodes.includes(w.property_code)) || []
      const rmr = makeReadyData?.filter(f => propertyCodes.includes(f.property_code)) || []
      const rd = delinquenciesData?.filter(d => propertyCodes.includes(d.property_code)) || []

      const scopedOperationalSummary = {
        alerts: {
          active: ra.filter(a => a.is_active).length,
          newToday: ra.filter(a => a.created_at && new Date(a.created_at).toDateString() === uploadDateStr).length,
          closedToday: 0,
        },
        workOrders: {
          open: rwo.filter(w => w.is_active && !w.completion_date).length,
          newToday: rwo.filter(w => w.created_at && new Date(w.created_at).toDateString() === uploadDateStr).length,
          completedToday: rwo.filter(w => w.completion_date && new Date(w.completion_date).toDateString() === uploadDateStr).length,
          overdueOpen: rwo.filter(w => {
            if (!w.is_active || w.completion_date) return false
            const callDate = w.call_date ? new Date(w.call_date) : null
            return callDate != null && callDate < overdueThreshold
          }).length,
        },
        makeReady: {
          active: rmr.filter(f => !f.resolved_at).length,
          overdue: rmr.filter(f => !f.resolved_at && f.severity === 'error').length,
          readyThisWeek: 0,
        },
        delinquencies: {
          count: rd.length,
          totalAmount: rd.reduce((sum, d) => sum + (Number(d.total_unpaid) || 0), 0),
          over90Days: rd.filter(d => Number(d.days_90_plus) > 0).length,
          amount30Plus: rd.reduce((sum, d) =>
            sum + (Number(d.days_31_60) || 0) + (Number(d.days_61_90) || 0) + (Number(d.days_90_plus) || 0), 0),
        },
        technical: {
          filesProcessed,
          filesWithErrors,
          status: run.status,
          errorMessage: run.error_message,
        },
      }

      // Scope snapshot deltas and renewal counts to this recipient's properties
      const scopedSnapshotDeltas: PropertySnapshotDeltas = Object.fromEntries(
        propertyCodes
          .filter(code => allSnapshotDeltas[code])
          .map(code => [code, allSnapshotDeltas[code]])
      )
      const scopedRenewalCounts: PropertyRenewalCountsMap = Object.fromEntries(
        propertyCodes
          .filter(code => allRenewalCounts[code])
          .map(code => [code, allRenewalCounts[code]])
      )

      const htmlContent = generateHighFidelityHtmlReport(scopedRun, recipientEvents, scopedOperationalSummary, baseUrl, scopedSnapshotDeltas, scopedRenewalCounts)

      try {
        await transporter.sendMail({
          from: `"${config.public.mailersendSmtpName || 'EE Manager'}" <${config.public.mailersendUsername || 'noreply@ee-manager.com'}>`,
          to: email,
          subject: `Daily Solver Summary — ${new Date(run.upload_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
          html: htmlContent
        })
        results.push({ email, status: 'sent', propertyCount: propertyCodes.length })
      } catch (sendError: any) {
        console.error(`[Email] Failed to send to ${email}:`, sendError)
        results.push({ email, status: 'failed', error: sendError.message })
      }
    }

    return {
      success: true,
      results
    }
  } catch (error: any) {
    console.error('[Email API] Global error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal Server Error'
    })
  }
})
