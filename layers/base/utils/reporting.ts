
import { getPropertyName, PROPERTY_LIST } from '../constants/properties'

export interface SolverEvent {
    property_code: string
    event_type: string
    details: Record<string, any>
    unit_id?: string
    tenancy_id?: string
    event_date?: string
}

export interface PropertySummary {
    tenanciesNew: number
    tenanciesUpdated: number
    residentsNew: number
    residentsUpdated: number
    leasesNew: number
    leasesUpdated: number
    leasesRenewed: number
    availabilitiesNew: number
    availabilitiesUpdated: number
    noticesProcessed: number
    statusAutoFixes: string[]
    makereadyFlags: number
    applicationFlags: number
    transferFlags: number
    applicationsSaved: number
    priceChanges?: number
}

export interface OperationalSummary {
    alerts: {
        active: number
        newToday: number
        closedToday: number
    }
    workOrders: {
        open: number
        newToday: number
        completedToday: number
        overdueOpen?: number   // open WOs with call_date > 30 days ago
    }
    makeReady: {
        active: number
        overdue: number
        readyThisWeek: number
    }
    delinquencies: {
        count: number
        totalAmount: number
        over90Days: number
        amount30Plus?: number  // total owed 30+ days (days_31_60 + days_61_90 + days_90_plus)
    }
    technical: {
        filesProcessed: number
        filesWithErrors: number
        status: string
        errorMessage: string | null
    }
}

export interface PropertyRenewalCounts {
    pending: number  // worksheet created, offer not yet sent
    offered: number  // offer sent, awaiting resident response
}

export type PropertyRenewalCountsMap = Record<string, PropertyRenewalCounts>

export interface SnapshotDelta {
    available_count: number
    available_delta: number | null  // null = no prior snapshot available
    avg_contracted_rent: number
    rent_delta: number | null
}

export type PropertySnapshotDeltas = Record<string, SnapshotDelta>

export interface PipelineMoveOutRow {
    unit_name: string
    property_code: string
    resident_name: string
    move_out_date: string
}

export interface PipelineMoveInRow {
    unit_name: string
    property_code: string
    resident_name: string
    move_in_date: string
    status: string
    makeready_conflict: boolean
}

export interface PipelineOptions {
    truncateDays?: number   // show only rows with date ≤ today + N days (includes overdue); omit = show all
    viewAllUrl?: string     // "View full pipeline →" link shown when truncated
}

/**
 * Generate a premium HTML report for a Solver run.
 * Optimized for email clients with inline CSS.
 */
export function generateHighFidelityHtmlReport(
    run: any,
    events: SolverEvent[],
    operationalSummary?: OperationalSummary,
    baseUrl: string = '',
    snapshotDeltas?: PropertySnapshotDeltas,
    renewalCountsMap?: PropertyRenewalCountsMap,
    moveOutPipeline?: PipelineMoveOutRow[],
    moveInPipeline?: PipelineMoveInRow[],
    pipelineOpts?: PipelineOptions,
): string {
    const summaryData = run.summary as Record<string, PropertySummary>
    const knownCodes = new Set<string>(PROPERTY_LIST.map(p => p.code))
    // Filter to known property codes only — excludes STALE_UPDATE and any staging artifacts
    const properties = (run.properties_processed || []).filter((code: string) => knownCodes.has(code))

    const uploadDateStr = new Date(run.upload_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

    let html = `
    <div style="font-family: 'Inter', sans-serif, system-ui; max-width: 800px; margin: 0 auto; color: #1f2937; line-height: 1.5;">
        <!-- Header -->
        <div style="background-color: #4f46e5; padding: 32px; border-radius: 12px 12px 0 0; color: white;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="vertical-align: top;">
                        <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; color: white;">Daily Solver Report</h1>
                        <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px; color: white;">
                            ${uploadDateStr}
                        </p>
                        <p style="margin: 4px 0 0; opacity: 0.75; font-size: 12px; color: white;">
                            Batch: <code style="background: rgba(255,255,255,0.2); padding: 2px 4px; border-radius: 4px;">${run.batch_id}</code>
                        </p>
                    </td>
                    ${baseUrl ? `
                    <td style="vertical-align: top; text-align: right; white-space: nowrap; padding-left: 16px; width: 1%;">
                        <table style="border-collapse: collapse; margin-left: auto;">
                            <tr><td style="padding-bottom: 6px;"><a href="${baseUrl}/solver/report" style="display: inline-block; background: rgba(255,255,255,0.2); color: white; text-decoration: none; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; border: 1px solid rgba(255,255,255,0.3);">📊 Today Report →</a></td></tr>
                            <tr><td style="padding-bottom: 6px;"><a href="${baseUrl}/office/availabilities/analysis" style="display: inline-block; background: rgba(255,255,255,0.15); color: white; text-decoration: none; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; border: 1px solid rgba(255,255,255,0.25);">📈 Availability Analysis →</a></td></tr>
                            <tr><td><a href="${baseUrl}/solver/report-help" style="display: inline-block; background: rgba(255,255,255,0.1); color: white; text-decoration: none; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; border: 1px solid rgba(255,255,255,0.25);">❓ Report Guide</a></td></tr>
                        </table>
                    </td>
                    ` : ''}
                </tr>
            </table>
        </div>

        <div style="padding: 32px; background-color: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">

            <!-- ① Property Breakdown -->
            <div style="margin-bottom: 32px;">
                <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Property Breakdown</h2>
                ${properties.map((code: string) => renderPropertySummary(code, summaryData[code], snapshotDeltas?.[code], renewalCountsMap?.[code])).join('')}
            </div>

            <!-- ② Ops block (conditional) -->
            ${operationalSummary ? `
            <div style="margin-bottom: 48px;">
                <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Operational Summary</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 50%; padding: 0 8px 8px 0; vertical-align: top;">
                            ${renderSummaryBox('Alerts', '🚨', [
                                { label: 'Open', value: operationalSummary.alerts.active.toString() },
                                { label: 'New Today', value: operationalSummary.alerts.newToday.toString() },
                                { label: 'Closed Today', value: operationalSummary.alerts.closedToday.toString() },
                            ], 'View Alerts', `${baseUrl}/office/alerts`)}
                        </td>
                        <td style="width: 50%; padding: 0 0 8px 8px; vertical-align: top;">
                            ${renderSummaryBox('Work Orders', '🔧', [
                                { label: 'Open', value: operationalSummary.workOrders.open.toString() },
                                { label: 'New Today', value: operationalSummary.workOrders.newToday.toString() },
                                { label: 'Completed Today', value: operationalSummary.workOrders.completedToday.toString() },
                                ...(operationalSummary.workOrders.overdueOpen != null
                                    ? [{ label: 'Open > 3 Days', value: operationalSummary.workOrders.overdueOpen.toString(), highlight: operationalSummary.workOrders.overdueOpen > 0 }]
                                    : []),
                            ], 'View Work Orders', `${baseUrl}/maintenance/work-orders`)}
                        </td>
                    </tr>
                    <tr>
                        <td style="width: 50%; padding: 0 8px 0 0; vertical-align: top;">
                            ${renderSummaryBox('MakeReady', '🏠', [
                                { label: 'Active Units', value: operationalSummary.makeReady.active.toString() },
                                { label: 'Overdue', value: operationalSummary.makeReady.overdue.toString(), highlight: operationalSummary.makeReady.overdue > 0 },
                                { label: 'Ready This Week', value: operationalSummary.makeReady.readyThisWeek > 0 ? operationalSummary.makeReady.readyThisWeek.toString() : '0' },
                            ], 'View MakeReady', `${baseUrl}/office/makeready`)}
                        </td>
                        <td style="width: 50%; padding: 0 0 0 8px; vertical-align: top;">
                            ${renderSummaryBox('Delinquencies', '💵', [
                                { label: 'Residents', value: operationalSummary.delinquencies.count.toString(), highlight: operationalSummary.delinquencies.count > 0 },
                                { label: 'Total Owed', value: '$' + operationalSummary.delinquencies.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
                                ...(operationalSummary.delinquencies.amount30Plus != null
                                    ? [{ label: '30+ Days', value: '$' + operationalSummary.delinquencies.amount30Plus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), highlight: operationalSummary.delinquencies.amount30Plus > 0 }]
                                    : [{ label: '90+ Days Count', value: operationalSummary.delinquencies.over90Days.toString(), highlight: operationalSummary.delinquencies.over90Days > 0 }]),
                            ], 'View Delinquencies', `${baseUrl}/office/delinquencies`)}
                        </td>
                    </tr>
                </table>
            </div>
            ` : ''}

            <!-- ③ Pipeline Sections -->
            ${renderMoveOutPipeline(moveOutPipeline || [], pipelineOpts)}
            ${renderMoveInPipeline(moveInPipeline || [], pipelineOpts)}

            <!-- ④ Event Detail Tables -->
            <div>
                <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Today's Activity</h2>
                ${renderEventSection('👤 New Residents', events.filter(e => e.event_type === 'new_tenancy'), renderNewTenancyRow)}
                ${renderEventSection('🔄 Lease Renewals', events.filter(e => e.event_type === 'lease_renewal'), renderLeaseRenewalRow)}
                ${renderEventSection('💰 Price Changes', events.filter(e => e.event_type === 'price_change'), renderPriceChangeRow)}
                ${renderEventSection('📝 New Applications', events.filter(e => e.event_type === 'application_saved'), renderApplicationRow)}
                ${renderNoticesSummarySection(events.filter(e => e.event_type === 'notice_given'))}
                ${!events.length ? '<p style="color: #9ca3af; font-size: 13px; margin: 0;">No activity events recorded for this run.</p>' : ''}
            </div>

            <!-- ⑤ Technical Health -->
            ${operationalSummary ? `
            <div style="margin-top: 48px;">
                <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">⚙️ Technical Health</h2>
                <div style="background-color: ${operationalSummary.technical.status === 'completed' ? '#ecfdf5' : operationalSummary.technical.status === 'failed' ? '#fef2f2' : '#fef3c7'}; border-radius: 8px; padding: 20px; border: 1px solid ${operationalSummary.technical.status === 'completed' ? '#d1fae5' : operationalSummary.technical.status === 'failed' ? '#fecaca' : '#fde68a'};">
                    <table style="border-collapse: collapse; width: 100%; margin-bottom: ${operationalSummary.technical.errorMessage ? '16px' : '0'};">
                        <tr>
                            <td style="vertical-align: top; padding-right: 24px; white-space: nowrap;">
                                <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Status</div>
                                <div style="font-size: 16px; font-weight: 700; color: ${operationalSummary.technical.status === 'completed' ? '#065f46' : operationalSummary.technical.status === 'failed' ? '#991b1b' : '#92400e'}; margin-top: 4px; text-transform: uppercase;">
                                    ${operationalSummary.technical.status === 'completed' ? '✓ SUCCESS' : operationalSummary.technical.status === 'failed' ? '✗ FAILED' : '⋯ RUNNING'}
                                </div>
                            </td>
                            <td style="vertical-align: top; padding-right: 24px; white-space: nowrap;">
                                <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Files Processed</div>
                                <div style="font-size: 16px; font-weight: 700; color: #4f46e5; margin-top: 4px;">${operationalSummary.technical.filesProcessed}</div>
                            </td>
                            <td style="vertical-align: top; white-space: nowrap;">
                                <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Parse Errors</div>
                                <div style="font-size: 16px; font-weight: 700; color: ${operationalSummary.technical.filesWithErrors > 0 ? '#dc2626' : '#059669'}; margin-top: 4px;">${operationalSummary.technical.filesWithErrors}</div>
                            </td>
                        </tr>
                    </table>
                    ${operationalSummary.technical.errorMessage ? `
                        <div style="margin-top: 12px; padding: 12px; background-color: rgba(0,0,0,0.05); border-radius: 6px; font-size: 13px; color: #991b1b; font-family: 'Courier New', monospace;">
                            <strong>Error:</strong> ${operationalSummary.technical.errorMessage}
                        </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}

            <!-- Footer -->
            <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                <p>This is an automated operational report from <strong>EE Manager V2</strong>.</p>
                <p>Generated by the Solver Ingestion Environment.</p>
            </div>
        </div>
    </div>
    `
    return html
}

function renderMoveOutPipeline(rows: PipelineMoveOutRow[], opts?: PipelineOptions): string {
    if (rows.length === 0) return ''

    const today = new Date().toISOString().split('T')[0]
    const thStyle = 'padding: 10px; text-align: left; font-weight: 600; color: #4b5563; font-size: 12px;'

    // Apply truncation: show only rows that are overdue OR within truncateDays
    let visibleRows = rows
    let hiddenCount = 0
    if (opts?.truncateDays !== undefined) {
        const cutoffDate = new Date(today + 'T12:00:00')
        cutoffDate.setDate(cutoffDate.getDate() + opts.truncateDays)
        const cutoffStr = cutoffDate.toISOString().split('T')[0]
        visibleRows = rows.filter(r => r.move_out_date <= cutoffStr)
        hiddenCount = rows.length - visibleRows.length
    }

    if (visibleRows.length === 0) return ''

    const rowsHtml = visibleRows.map(r => {
        const daysUntil = Math.round((new Date(r.move_out_date).getTime() - new Date(today).getTime()) / 86400000)
        const isOverdue = daysUntil < 0
        const isUrgent = daysUntil >= 0 && daysUntil <= 3
        const dateColor = isOverdue ? '#dc2626' : isUrgent ? '#d97706' : '#374151'
        const dateBadge = isOverdue
            ? `<span style="background:#fee2e2;color:#dc2626;font-size:10px;padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:600;">OVERDUE</span>`
            : isUrgent
            ? `<span style="background:#fff7ed;color:#c2410c;font-size:10px;padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:600;">${daysUntil}d</span>`
            : `<span style="color:#6b7280;font-size:11px;margin-left:6px;">(${daysUntil}d)</span>`
        return `
        <tr>
            <td style="${cellStyle}"><strong>${r.resident_name}</strong></td>
            <td style="${cellStyle}">${r.unit_name}</td>
            <td style="${cellStyle}">${r.property_code}</td>
            <td style="${cellStyle};color:${dateColor};font-weight:600;">${r.move_out_date}${dateBadge}</td>
        </tr>`
    }).join('')

    const viewMoreLink = hiddenCount > 0 && opts?.viewAllUrl
        ? `<p style="margin-top:10px;font-size:12px;color:#4b5563;">
            ${hiddenCount} more move-out${hiddenCount > 1 ? 's' : ''} not shown —
            <a href="${opts.viewAllUrl}" style="color:#4f46e5;font-weight:600;">View full pipeline →</a>
           </p>`
        : ''

    return `
    <div style="margin-bottom: 32px;">
        <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
            Move-Out Pipeline
            <span style="margin-left: 8px; background: #fff7ed; color: #c2410c; font-size: 12px; padding: 2px 8px; border-radius: 9999px; font-weight: 500;">${rows.length} on notice</span>
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
                <tr style="background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                    <th style="${thStyle}">Resident</th>
                    <th style="${thStyle}">Unit</th>
                    <th style="${thStyle}">Property</th>
                    <th style="${thStyle}">Move-Out Date</th>
                </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>
        ${viewMoreLink}
    </div>`
}

function renderMoveInPipeline(rows: PipelineMoveInRow[], opts?: PipelineOptions): string {
    if (rows.length === 0) return ''

    const today = new Date().toISOString().split('T')[0]
    const thStyle = 'padding: 10px; text-align: left; font-weight: 600; color: #4b5563; font-size: 12px;'

    // Apply truncation: show only rows that are overdue OR within truncateDays
    let visibleRows = rows
    let hiddenCount = 0
    if (opts?.truncateDays !== undefined) {
        const cutoffDate = new Date(today + 'T12:00:00')
        cutoffDate.setDate(cutoffDate.getDate() + opts.truncateDays)
        const cutoffStr = cutoffDate.toISOString().split('T')[0]
        visibleRows = rows.filter(r => r.move_in_date <= cutoffStr)
        hiddenCount = rows.length - visibleRows.length
    }

    if (visibleRows.length === 0) return ''

    const rowsHtml = visibleRows.map(r => {
        const daysUntil = Math.round((new Date(r.move_in_date).getTime() - new Date(today).getTime()) / 86400000)
        const isOverdue = daysUntil < 0
        const isUrgent = daysUntil >= 0 && daysUntil <= 3
        const dateColor = isOverdue ? '#dc2626' : isUrgent ? '#d97706' : '#374151'
        const dateBadge = isOverdue
            ? `<span style="background:#fee2e2;color:#dc2626;font-size:10px;padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:600;">OVERDUE</span>`
            : isUrgent
            ? `<span style="background:#fff7ed;color:#c2410c;font-size:10px;padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:600;">${daysUntil}d</span>`
            : `<span style="color:#6b7280;font-size:11px;margin-left:6px;">(${daysUntil}d)</span>`
        const conflictBadge = r.makeready_conflict
            ? `<span style="background:#fef2f2;color:#dc2626;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:600;">MakeReady Open</span>`
            : `<span style="background:#ecfdf5;color:#065f46;font-size:10px;padding:2px 6px;border-radius:4px;">Ready</span>`
        const statusBadge = `<span style="background:#e0e7ff;color:#3730a3;font-size:10px;padding:2px 6px;border-radius:4px;">${r.status}</span>`
        return `
        <tr>
            <td style="${cellStyle}"><strong>${r.resident_name}</strong></td>
            <td style="${cellStyle}">${r.unit_name}</td>
            <td style="${cellStyle}">${r.property_code}</td>
            <td style="${cellStyle}">${statusBadge}</td>
            <td style="${cellStyle};color:${dateColor};font-weight:600;">${r.move_in_date}${dateBadge}</td>
            <td style="${cellStyle}">${conflictBadge}</td>
        </tr>`
    }).join('')

    const conflicts = rows.filter(r => r.makeready_conflict).length

    const viewMoreLink = hiddenCount > 0 && opts?.viewAllUrl
        ? `<p style="margin-top:10px;font-size:12px;color:#4b5563;">
            ${hiddenCount} more move-in${hiddenCount > 1 ? 's' : ''} not shown —
            <a href="${opts.viewAllUrl}" style="color:#4f46e5;font-weight:600;">View full pipeline →</a>
           </p>`
        : ''

    return `
    <div style="margin-bottom: 32px;">
        <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
            Move-In Pipeline
            <span style="margin-left: 8px; background: #e0e7ff; color: #3730a3; font-size: 12px; padding: 2px 8px; border-radius: 9999px; font-weight: 500;">${rows.length} incoming</span>
            ${conflicts > 0 ? `<span style="margin-left: 6px; background: #fee2e2; color: #dc2626; font-size: 12px; padding: 2px 8px; border-radius: 9999px; font-weight: 600;">${conflicts} make-ready conflict${conflicts > 1 ? 's' : ''}</span>` : ''}
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
                <tr style="background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                    <th style="${thStyle}">Resident</th>
                    <th style="${thStyle}">Unit</th>
                    <th style="${thStyle}">Property</th>
                    <th style="${thStyle}">Status</th>
                    <th style="${thStyle}">Move-In Date</th>
                    <th style="${thStyle}">Make-Ready</th>
                </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>
        ${viewMoreLink}
    </div>`
}

function renderEventSection(title: string, events: SolverEvent[], rowRenderer: (e: SolverEvent) => string) {
    if (events.length === 0) return ''

    return `
    <div style="margin-bottom: 40px;">
        <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 12px;">
            ${title}
            <span style="margin-left: 8px; background: #e0e7ff; color: #4338ca; font-size: 12px; padding: 2px 8px; border-radius: 9999px;">${events.length}</span>
        </h3>
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                        ${getTableHeaders(events[0].event_type)}
                    </tr>
                </thead>
                <tbody>
                    ${events.map(rowRenderer).join('')}
                </tbody>
            </table>
        </div>
    </div>
    `
}

function getTableHeaders(type: string) {
    const headerStyle = 'padding: 10px; text-align: left; font-weight: 600; color: #4b5563;'
    switch (type) {
        case 'lease_renewal':
            return `
                <th style="${headerStyle}">Resident</th>
                <th style="${headerStyle}">Unit</th>
                <th style="${headerStyle}">Property</th>
                <th style="${headerStyle}">Old Rent</th>
                <th style="${headerStyle}">New Rent</th>
                <th style="${headerStyle}">Change</th>
            `
        case 'price_change':
            return `
                <th style="${headerStyle}">Unit</th>
                <th style="${headerStyle}">Property</th>
                <th style="${headerStyle}">Old Rent</th>
                <th style="${headerStyle}">New Rent</th>
                <th style="${headerStyle}">Change</th>
            `
        case 'new_tenancy':
            return `
                <th style="${headerStyle}">Resident</th>
                <th style="${headerStyle}">Unit</th>
                <th style="${headerStyle}">Property</th>
                <th style="${headerStyle}">Status</th>
                <th style="${headerStyle}">Move-In</th>
            `
        case 'notice_given':
            return `
                <th style="${headerStyle}">Resident</th>
                <th style="${headerStyle}">Unit</th>
                <th style="${headerStyle}">Property</th>
                <th style="${headerStyle}">Move-Out</th>
                <th style="${headerStyle}">Status</th>
            `
        case 'application_saved':
            return `
                <th style="${headerStyle}">Applicant</th>
                <th style="${headerStyle}">Unit</th>
                <th style="${headerStyle}">Property</th>
                <th style="${headerStyle}">Date</th>
                <th style="${headerStyle}">Result</th>
            `
        case 'lease_signed':
            return `
                <th style="${headerStyle}">Resident</th>
                <th style="${headerStyle}">Unit</th>
                <th style="${headerStyle}">Property</th>
                <th style="${headerStyle}">Move-In</th>
                <th style="${headerStyle}">Rent</th>
            `
        default:
            return `<th style="${headerStyle}">Event Details</th>`
    }
}

const cellStyle = 'padding: 10px; border-bottom: 1px solid #f3f4f6;'

function renderLeaseRenewalRow(e: SolverEvent) {
    const d = e.details
    const rentChange = d.new_lease.rent_amount - d.old_lease.rent_amount
    const changeColor = rentChange > 0 ? '#059669' : rentChange < 0 ? '#dc2626' : '#6b7280'
    const changeIcon = rentChange > 0 ? '↑' : rentChange < 0 ? '↓' : ''

    return `
    <tr>
        <td style="${cellStyle}"><strong>${d.resident_name || 'Unknown'}</strong></td>
        <td style="${cellStyle}">${d.unit_name}</td>
        <td style="${cellStyle}">${e.property_code}</td>
        <td style="${cellStyle}">$${d.old_lease.rent_amount}</td>
        <td style="${cellStyle}">$${d.new_lease.rent_amount}</td>
        <td style="${cellStyle}; color: ${changeColor}; font-weight: 600;">
            ${changeIcon} $${Math.abs(rentChange)}
        </td>
    </tr>
    `
}

function renderPriceChangeRow(e: SolverEvent) {
    const d = e.details
    const changeColor = d.change_amount > 0 ? '#059669' : '#dc2626'
    const changeIcon = d.change_amount > 0 ? '↑' : '↓'

    return `
    <tr>
        <td style="${cellStyle}"><strong>${d.unit_name}</strong></td>
        <td style="${cellStyle}">${e.property_code}</td>
        <td style="${cellStyle}">$${d.old_rent.toFixed(0)}</td>
        <td style="${cellStyle}">$${d.new_rent.toFixed(0)}</td>
        <td style="${cellStyle}; color: ${changeColor}; font-weight: 600;">
            ${changeIcon} $${Math.abs(d.change_amount).toFixed(0)} (${d.change_percent.toFixed(1)}%)
        </td>
    </tr>
    `
}

function renderNewTenancyRow(e: SolverEvent) {
    const d = e.details
    return `
    <tr>
        <td style="${cellStyle}"><strong>${d.resident_name}</strong></td>
        <td style="${cellStyle}">${d.unit_name}</td>
        <td style="${cellStyle}">${e.property_code}</td>
        <td style="${cellStyle}"><span style="background: #ecfdf5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${d.status}</span></td>
        <td style="${cellStyle}">${d.move_in_date || 'TBD'}</td>
    </tr>
    `
}

function renderNoticeRow(e: SolverEvent) {
    const d = e.details
    return `
    <tr>
        <td style="${cellStyle}"><strong>${d.resident_name || 'Unknown'}</strong></td>
        <td style="${cellStyle}">${d.unit_name}</td>
        <td style="${cellStyle}">${e.property_code}</td>
        <td style="${cellStyle}">${d.move_out_date || 'TBD'}</td>
        <td style="${cellStyle}"><span style="background: #fff7ed; color: #9a3412; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${d.status_change || 'Notice'}</span></td>
    </tr>
    `
}

function renderApplicationRow(e: SolverEvent) {
    const d = e.details
    return `
    <tr>
        <td style="${cellStyle}"><strong>${d.applicant_name}</strong></td>
        <td style="${cellStyle}">${d.unit_name}</td>
        <td style="${cellStyle}">${e.property_code}</td>
        <td style="${cellStyle}">${d.application_date}</td>
        <td style="${cellStyle}">${d.screening_result || 'Pending'}</td>
    </tr>
    `
}

function renderNoticesSummarySection(noticeEvents: SolverEvent[]) {
    if (noticeEvents.length === 0) return ''

    // Sort by property_code, then by move_out_date ascending
    const sorted = [...noticeEvents].sort((a, b) => {
        const propCmp = (a.property_code || '').localeCompare(b.property_code || '')
        if (propCmp !== 0) return propCmp
        const dateA = a.details?.move_out_date || ''
        const dateB = b.details?.move_out_date || ''
        return dateA.localeCompare(dateB)
    })

    // Aggregate per property
    const byProp = new Map<string, { count: number; earliest: string; latest: string }>()
    for (const e of sorted) {
        const code = e.property_code || '—'
        const d = e.details?.move_out_date || ''
        if (!byProp.has(code)) {
            byProp.set(code, { count: 0, earliest: d, latest: d })
        }
        const entry = byProp.get(code)!
        entry.count++
        if (d && (!entry.earliest || d < entry.earliest)) entry.earliest = d
        if (d && (!entry.latest  || d > entry.latest))   entry.latest  = d
    }

    const thStyle = 'padding: 8px 10px; text-align: left; font-weight: 600; color: #4b5563;'

    const summaryRows = Array.from(byProp.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([code, info]) => `
            <tr>
                <td style="padding: 8px 10px; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${code} — ${getPropertyName(code)}</td>
                <td style="padding: 8px 10px; border-bottom: 1px solid #f3f4f6; text-align: center;">${info.count}</td>
                <td style="padding: 8px 10px; border-bottom: 1px solid #f3f4f6;">${info.earliest || '—'}</td>
                <td style="padding: 8px 10px; border-bottom: 1px solid #f3f4f6;">${info.latest  || '—'}</td>
            </tr>
        `).join('')

    const detailRows = sorted.map(e => renderNoticeRow(e)).join('')

    return `
    <div style="margin-bottom: 40px;">
        <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 12px;">
            📋 Notices on File
            <span style="margin-left: 8px; background: #fff7ed; color: #c2410c; font-size: 12px; padding: 2px 8px; border-radius: 9999px;">${noticeEvents.length} total</span>
        </h3>
        <div style="overflow-x: auto; margin-bottom: 16px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                        <th style="${thStyle}">Property</th>
                        <th style="padding: 8px 10px; text-align: center; font-weight: 600; color: #4b5563;">Count</th>
                        <th style="${thStyle}">Earliest Move-Out</th>
                        <th style="${thStyle}">Latest Move-Out</th>
                    </tr>
                </thead>
                <tbody>${summaryRows}</tbody>
            </table>
        </div>
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                        <th style="${thStyle}">Resident</th>
                        <th style="${thStyle}">Unit</th>
                        <th style="${thStyle}">Property</th>
                        <th style="${thStyle}">Move-Out</th>
                        <th style="${thStyle}">Status</th>
                    </tr>
                </thead>
                <tbody>${detailRows}</tbody>
            </table>
        </div>
    </div>
    `
}

function renderSummaryBox(title: string, icon: string, items: {label: string, value: string, highlight?: boolean}[], linkText: string = 'View Details', linkUrl: string = '#') {
    const metricCells = items.map(item => `
        <td style="padding: 0 10px 0 0; vertical-align: top; white-space: nowrap;">
            <div style="font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">${item.label}</div>
            <div style="font-size: 18px; font-weight: 700; color: ${item.highlight ? '#dc2626' : '#4f46e5'}; margin-top: 3px;">${item.value}</div>
        </td>`).join('')
    return `
    <div style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; padding: 20px;">
        <div style="font-size: 14px; font-weight: 700; color: #374151; margin: 0 0 14px 0; text-transform: uppercase; letter-spacing: 0.05em;">
            ${icon} ${title}
        </div>
        <table style="border-collapse: collapse; margin-bottom: 14px; width: 100%;">
            <tr>${metricCells}</tr>
        </table>
        <a href="${linkUrl}" style="display: inline-block; padding: 6px 14px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 500;">
            ${linkText} →
        </a>
    </div>
    `
}

function renderDelta(delta: number | null, invert = false): string {
    if (delta === null) return ''
    if (delta === 0) return '<span style="color: #9ca3af; font-size: 10px; font-weight: 400; margin-left: 4px;">no change</span>'
    // invert: for available units, fewer is better (units leased); for rent, higher is better
    const positive = invert ? delta < 0 : delta > 0
    const color = positive ? '#059669' : '#dc2626'
    const sign = delta > 0 ? '+' : ''
    return `<span style="color: ${color}; font-size: 10px; font-weight: 600; margin-left: 4px;">(${sign}${delta})</span>`
}

function renderRentDelta(delta: number | null): string {
    if (delta === null) return ''
    if (delta === 0) return '<span style="color: #9ca3af; font-size: 10px; font-weight: 400; margin-left: 4px;">no change</span>'
    const color = delta > 0 ? '#059669' : '#dc2626'
    const sign = delta > 0 ? '+' : ''
    return `<span style="color: ${color}; font-size: 10px; font-weight: 600; margin-left: 4px;">(${sign}$${Math.abs(delta).toFixed(0)})</span>`
}

const moduleLabel = 'font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 10px;'
const metricLabel = 'color: #6b7280; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; padding-right: 16px;'
const metricValue = 'font-weight: 700; margin-top: 3px; font-size: 14px;'

function renderPropertySummary(code: string, s: PropertySummary, delta?: SnapshotDelta, renewals?: PropertyRenewalCounts) {
    if (!s) return ''

    const availUnits = delta
        ? `${delta.available_count} units${renderDelta(delta.available_delta, true)}`
        : `${s.availabilitiesNew} new · ${s.availabilitiesUpdated} updated`

    const avgRent = delta
        ? `$${delta.avg_contracted_rent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}${renderRentDelta(delta.rent_delta)}`
        : null

    return `
    <div style="margin-bottom: 12px; padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
        <h4 style="margin: 0 0 14px; font-size: 14px; font-weight: 700; color: #111827;">${code} — ${getPropertyName(code)}</h4>

        <!-- Availabilities module -->
        <div style="margin-bottom: 14px;">
            <div style="${moduleLabel}">Availabilities</div>
            <table style="border-collapse: collapse; font-size: 12px; width: 100%;">
                <tr>
                    <td style="vertical-align: top; padding-right: 20px; white-space: nowrap;">
                        <div style="${metricLabel}">Available Units</div>
                        <div style="${metricValue}">${availUnits}</div>
                    </td>
                    <td style="vertical-align: top; padding-right: 20px; white-space: nowrap;">
                        <div style="${metricLabel}">Applications</div>
                        <div style="${metricValue}">${s.applicationsSaved}</div>
                    </td>
                    <td style="vertical-align: top; padding-right: 20px; white-space: nowrap;">
                        <div style="${metricLabel}">Notices</div>
                        <div style="${metricValue}">${s.noticesProcessed}</div>
                    </td>
                    ${avgRent ? `
                    <td style="vertical-align: top; white-space: nowrap;">
                        <div style="${metricLabel}">Avg Contracted Rent</div>
                        <div style="${metricValue}">${avgRent}</div>
                    </td>` : ''}
                </tr>
            </table>
        </div>

        <!-- Renewals module -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 12px;">
            <div style="${moduleLabel}">Renewals</div>
            <table style="border-collapse: collapse; font-size: 12px; width: 100%;">
                <tr>
                    <td style="vertical-align: top; padding-right: 20px; white-space: nowrap;">
                        <div style="${metricLabel}">Offer Pending</div>
                        <div style="${metricValue}; color: ${(renewals?.pending ?? 0) > 0 ? '#d97706' : 'inherit'}">${renewals?.pending ?? 0}</div>
                    </td>
                    <td style="vertical-align: top; padding-right: 20px; white-space: nowrap;">
                        <div style="${metricLabel}">Awaiting Response</div>
                        <div style="${metricValue}; color: ${(renewals?.offered ?? 0) > 0 ? '#4f46e5' : 'inherit'}">${renewals?.offered ?? 0}</div>
                    </td>
                    <td style="vertical-align: top; white-space: nowrap;">
                        <div style="${metricLabel}">Completed This Run</div>
                        <div style="${metricValue}">${s.leasesRenewed}</div>
                    </td>
                </tr>
            </table>
        </div>
    </div>
    `
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly Summary Report
// ─────────────────────────────────────────────────────────────────────────────

export interface WeeklyOccupancyRow {
    property_code: string
    available_today: number
    available_7d_ago: number | null
    available_delta: number | null
    avg_rent_today: number
    avg_rent_7d_ago: number | null
    rent_delta: number | null
}

export interface WeeklyActivitySummary {
    property_code: string
    move_ins: number          // new_tenancy events where status = 'Current'
    move_outs: number         // move_out events
    silent_drops: number      // silent_drop events
    notices_given: number     // notice_given events
    renewals: number          // lease_renewal events
    pipeline_added: number    // new_tenancy events where status = 'Future' | 'Applicant'
}

export interface WeeklyMakeReadyStats {
    property_code: string
    completed_this_week: number
    currently_overdue: number
}

export interface WeeklyWorkOrderStats {
    property_code: string
    opened_this_week: number
    completed_this_week: number
    currently_overdue: number
}

export interface WeeklyDelinquencyRow {
    property_code: string
    count: number
    total_unpaid: number
    amount_30_plus: number
}

export interface WeeklyReportInput {
    weekEndDate: string          // ISO date string (Sunday)
    weekStartDate: string        // ISO date string (Monday 7 days prior)
    propertyCodes: string[]
    occupancy: WeeklyOccupancyRow[]
    activity: WeeklyActivitySummary[]
    moveOutPipeline: PipelineMoveOutRow[]
    moveInPipeline: PipelineMoveInRow[]
    makeReady: WeeklyMakeReadyStats[]
    workOrders: WeeklyWorkOrderStats[]
    delinquencies: WeeklyDelinquencyRow[]
    baseUrl?: string
    pipelineOpts?: PipelineOptions
}

export function generateWeeklyHtmlReport(input: WeeklyReportInput): string {
    const {
        weekEndDate, weekStartDate, propertyCodes,
        occupancy, activity, moveOutPipeline, moveInPipeline,
        makeReady, workOrders, delinquencies, baseUrl = '', pipelineOpts,
    } = input

    const weekLabel = `${new Date(weekStartDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${new Date(weekEndDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

    const thStyle = 'padding: 10px; text-align: left; font-weight: 600; color: #4b5563; font-size: 12px;'
    const tdStyle = 'padding: 10px; border-bottom: 1px solid #f3f4f6; font-size: 13px;'
    const sectionHead = (title: string, badge?: string) => `
        <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin: 32px 0 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
            ${title}${badge ? ` <span style="margin-left:8px;background:#e0e7ff;color:#3730a3;font-size:12px;padding:2px 8px;border-radius:9999px;font-weight:500;">${badge}</span>` : ''}
        </h2>`

    // ── Occupancy WoW ──────────────────────────────────────────────────────────
    const occupancyRows = propertyCodes.map(code => {
        const row = occupancy.find(r => r.property_code === code)
        if (!row) return `<tr><td style="${tdStyle}" colspan="5">${code} — no snapshot</td></tr>`
        const availDelta = row.available_delta
        const rentDelta = row.rent_delta
        const availColor = availDelta != null && availDelta < 0 ? '#059669' : availDelta != null && availDelta > 0 ? '#dc2626' : '#6b7280'
        const rentColor = rentDelta != null && rentDelta > 0 ? '#059669' : rentDelta != null && rentDelta < 0 ? '#dc2626' : '#6b7280'
        return `
        <tr>
            <td style="${tdStyle}"><strong>${code}</strong> — ${getPropertyName(code)}</td>
            <td style="${tdStyle};font-weight:600;">${row.available_today}</td>
            <td style="${tdStyle};color:${availColor};font-weight:600;">${availDelta != null ? (availDelta > 0 ? '+' : '') + availDelta : '—'}</td>
            <td style="${tdStyle};">$${row.avg_rent_today.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
            <td style="${tdStyle};color:${rentColor};font-weight:600;">${rentDelta != null ? (rentDelta > 0 ? '+$' : '-$') + Math.abs(rentDelta) : '—'}</td>
        </tr>`
    }).join('')

    // ── Leasing Activity ───────────────────────────────────────────────────────
    const activityRows = propertyCodes.map(code => {
        const a = activity.find(r => r.property_code === code) ?? { move_ins: 0, move_outs: 0, silent_drops: 0, notices_given: 0, renewals: 0, pipeline_added: 0, property_code: code }
        return `
        <tr>
            <td style="${tdStyle}"><strong>${code}</strong></td>
            <td style="${tdStyle};text-align:center;color:${a.move_ins > 0 ? '#059669' : '#6b7280'};font-weight:${a.move_ins > 0 ? '700' : '400'};">${a.move_ins}</td>
            <td style="${tdStyle};text-align:center;color:${a.move_outs > 0 ? '#dc2626' : '#6b7280'};">${a.move_outs}</td>
            <td style="${tdStyle};text-align:center;color:${a.silent_drops > 0 ? '#d97706' : '#6b7280'};">${a.silent_drops}</td>
            <td style="${tdStyle};text-align:center;color:${a.notices_given > 0 ? '#7c3aed' : '#6b7280'};">${a.notices_given}</td>
            <td style="${tdStyle};text-align:center;color:${a.renewals > 0 ? '#0891b2' : '#6b7280'};">${a.renewals}</td>
            <td style="${tdStyle};text-align:center;">${a.pipeline_added}</td>
        </tr>`
    }).join('')

    // ── Make-Ready ─────────────────────────────────────────────────────────────
    const makeReadyRows = propertyCodes.map(code => {
        const mr = makeReady.find(r => r.property_code === code) ?? { completed_this_week: 0, currently_overdue: 0, property_code: code }
        return `
        <tr>
            <td style="${tdStyle}"><strong>${code}</strong> — ${getPropertyName(code)}</td>
            <td style="${tdStyle};text-align:center;color:${mr.completed_this_week > 0 ? '#059669' : '#6b7280'};font-weight:${mr.completed_this_week > 0 ? '700' : '400'};">${mr.completed_this_week}</td>
            <td style="${tdStyle};text-align:center;color:${mr.currently_overdue > 0 ? '#dc2626' : '#059669'};font-weight:${mr.currently_overdue > 0 ? '700' : '400'};">${mr.currently_overdue}</td>
        </tr>`
    }).join('')

    // ── Work Orders ────────────────────────────────────────────────────────────
    const workOrderRows = propertyCodes.map(code => {
        const wo = workOrders.find(r => r.property_code === code) ?? { opened_this_week: 0, completed_this_week: 0, currently_overdue: 0, property_code: code }
        return `
        <tr>
            <td style="${tdStyle}"><strong>${code}</strong></td>
            <td style="${tdStyle};text-align:center;">${wo.opened_this_week}</td>
            <td style="${tdStyle};text-align:center;color:${wo.completed_this_week > 0 ? '#059669' : '#6b7280'};">${wo.completed_this_week}</td>
            <td style="${tdStyle};text-align:center;color:${wo.currently_overdue > 0 ? '#dc2626' : '#059669'};font-weight:${wo.currently_overdue > 0 ? '700' : '400'};">${wo.currently_overdue}</td>
        </tr>`
    }).join('')

    // ── Delinquencies ──────────────────────────────────────────────────────────
    const deliqRows = delinquencies.length > 0
        ? delinquencies.map(d => `
        <tr>
            <td style="${tdStyle}"><strong>${d.property_code}</strong> — ${getPropertyName(d.property_code)}</td>
            <td style="${tdStyle};text-align:center;color:${d.count > 0 ? '#dc2626' : '#059669'};font-weight:600;">${d.count}</td>
            <td style="${tdStyle};">$${d.total_unpaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="${tdStyle};color:${d.amount_30_plus > 0 ? '#dc2626' : '#6b7280'};">$${d.amount_30_plus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>`).join('')
        : `<tr><td style="${tdStyle}" colspan="4">No active delinquencies.</td></tr>`

    const totalMoveIns = activity.reduce((s, a) => s + a.move_ins, 0)
    const totalMoveOuts = activity.reduce((s, a) => s + a.move_outs + a.silent_drops, 0)
    const totalRenewals = activity.reduce((s, a) => s + a.renewals, 0)
    const totalOverdueMR = makeReady.reduce((s, m) => s + m.currently_overdue, 0)
    const totalDelinq = delinquencies.reduce((s, d) => s + d.total_unpaid, 0)

    return `
    <div style="font-family: 'Inter', sans-serif, system-ui; max-width: 800px; margin: 0 auto; color: #1f2937; line-height: 1.5;">

        <!-- Header -->
        <div style="background-color: #1e40af; padding: 32px; border-radius: 12px 12px 0 0; color: white;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="vertical-align: top;">
                        <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; color: white;">Weekly Operational Summary</h1>
                        <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px; color: white;">${weekLabel}</p>
                        <p style="margin: 8px 0 0; opacity: 0.75; font-size: 12px; color: white;">
                            ${totalMoveIns} move-in${totalMoveIns !== 1 ? 's' : ''} &nbsp;·&nbsp;
                            ${totalMoveOuts} move-out${totalMoveOuts !== 1 ? 's' : ''} &nbsp;·&nbsp;
                            ${totalRenewals} renewal${totalRenewals !== 1 ? 's' : ''}
                            ${totalOverdueMR > 0 ? ` &nbsp;·&nbsp; <strong style="color:#fbbf24;">${totalOverdueMR} overdue make-ready</strong>` : ''}
                        </p>
                    </td>
                    ${baseUrl ? `
                    <td style="vertical-align: top; text-align: right; padding-left: 16px; width: 1%; white-space: nowrap;">
                        <table style="border-collapse: collapse; margin-left: auto;">
                            <tr><td style="padding-bottom: 6px;"><a href="${baseUrl}/solver/weekly-report" style="display:inline-block;background:rgba(255,255,255,0.2);color:white;text-decoration:none;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;border:1px solid rgba(255,255,255,0.3);">📅 Weekly Report →</a></td></tr>
                            <tr><td style="padding-bottom: 6px;"><a href="${baseUrl}/office/availabilities/analysis" style="display:inline-block;background:rgba(255,255,255,0.15);color:white;text-decoration:none;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;border:1px solid rgba(255,255,255,0.25);">📈 Availability Analysis →</a></td></tr>
                            <tr><td><a href="${baseUrl}/solver/weekly-report-help" style="display:inline-block;background:rgba(255,255,255,0.1);color:white;text-decoration:none;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;border:1px solid rgba(255,255,255,0.25);">❓ Report Guide</a></td></tr>
                        </table>
                    </td>
                    ` : ''}
                </tr>
            </table>
        </div>

        <div style="padding: 32px; background-color: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">

            <!-- Delinquency call-out (if any) -->
            ${totalDelinq > 0 ? `
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
                <strong style="color:#dc2626;">Delinquencies:</strong>
                <span style="color:#7f1d1d;font-size:14px;">
                    ${delinquencies.reduce((s, d) => s + d.count, 0)} residents owe a combined
                    $${totalDelinq.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} across all properties.
                </span>
            </div>
            ` : ''}

            <!-- ① Occupancy WoW -->
            ${sectionHead('Occupancy — Week over Week')}
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:32px;">
                <thead>
                    <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
                        <th style="${thStyle}">Property</th>
                        <th style="${thStyle}">Available Now</th>
                        <th style="${thStyle}">WoW Change</th>
                        <th style="${thStyle}">Avg Rent</th>
                        <th style="${thStyle}">Rent Change</th>
                    </tr>
                </thead>
                <tbody>${occupancyRows}</tbody>
            </table>

            <!-- ② Leasing Activity -->
            ${sectionHead('Leasing Activity', 'This Week')}
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:32px;">
                <thead>
                    <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
                        <th style="${thStyle}">Property</th>
                        <th style="${thStyle};text-align:center;">Move-Ins</th>
                        <th style="${thStyle};text-align:center;">Move-Outs</th>
                        <th style="${thStyle};text-align:center;">Silent Drops</th>
                        <th style="${thStyle};text-align:center;">Notices Given</th>
                        <th style="${thStyle};text-align:center;">Renewals</th>
                        <th style="${thStyle};text-align:center;">Pipeline Added</th>
                    </tr>
                </thead>
                <tbody>${activityRows}</tbody>
            </table>

            <!-- ③ Move-Out Pipeline -->
            ${renderMoveOutPipeline(moveOutPipeline, pipelineOpts)}

            <!-- ④ Move-In Pipeline -->
            ${renderMoveInPipeline(moveInPipeline, pipelineOpts)}

            <!-- ⑤ Make-Ready -->
            ${sectionHead('Make-Ready Status')}
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:32px;">
                <thead>
                    <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
                        <th style="${thStyle}">Property</th>
                        <th style="${thStyle};text-align:center;">Completed This Week</th>
                        <th style="${thStyle};text-align:center;">Currently Overdue</th>
                    </tr>
                </thead>
                <tbody>${makeReadyRows}</tbody>
            </table>

            <!-- ⑥ Work Orders -->
            ${sectionHead('Work Orders', 'This Week')}
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:32px;">
                <thead>
                    <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
                        <th style="${thStyle}">Property</th>
                        <th style="${thStyle};text-align:center;">Opened</th>
                        <th style="${thStyle};text-align:center;">Completed</th>
                        <th style="${thStyle};text-align:center;">Overdue (Open > 3d)</th>
                    </tr>
                </thead>
                <tbody>${workOrderRows}</tbody>
            </table>

            <!-- ⑦ Delinquencies -->
            ${sectionHead('Delinquencies — Current')}
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:32px;">
                <thead>
                    <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
                        <th style="${thStyle}">Property</th>
                        <th style="${thStyle};text-align:center;">Residents</th>
                        <th style="${thStyle}">Total Owed</th>
                        <th style="${thStyle}">30+ Days</th>
                    </tr>
                </thead>
                <tbody>${deliqRows}</tbody>
            </table>

            <!-- Footer -->
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                <p>Weekly Operational Summary from <strong>EE Manager V2</strong> &nbsp;·&nbsp; Week ending ${weekEndDate}</p>
            </div>
        </div>
    </div>`
}

export function generateMarkdownReport(run: any, events: SolverEvent[]): string {
    const lines: string[] = []
    const summaryData = run.summary as Record<string, PropertySummary>
    const knownCodes = new Set<string>(PROPERTY_LIST.map(p => p.code))
    // Filter to known property codes only — excludes STALE_UPDATE and any staging artifacts
    const properties = (run.properties_processed || []).filter((code: string) => knownCodes.has(code))

    lines.push('# Solver Run Summary')
    lines.push('')
    lines.push(`**Date:** ${new Date(run.upload_date).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}`)
    lines.push(`**Batch ID:** \`${run.batch_id}\``)
    lines.push('')
    lines.push('---')
    lines.push('')

    // Executive Summary
    lines.push('## 📊 Executive Summary - Daily Changes')
    lines.push('')

    // Reuse patterns from useSolverReportGenerator.ts but enriched
    const newTenancies = events.filter(e => e.event_type === 'new_tenancy')
    if (newTenancies.length > 0) {
        lines.push('### ✅ New Residents')
        lines.push('')
        lines.push('| Resident | Unit | Property | Status | Move-In |')
        lines.push('|----------|------|----------|--------|---------|')
        newTenancies.forEach(e => {
            const d = e.details
            lines.push(`| **${d.resident_name}** | ${d.unit_name} | ${e.property_code} | ${d.status} | ${d.move_in_date || 'TBD'} |`)
        })
        lines.push('')
    }

    const renewals = events.filter(e => e.event_type === 'lease_renewal')
    if (renewals.length > 0) {
        lines.push('### 🔄 Lease Renewals')
        lines.push('')
        lines.push('| Resident | Unit | Property | Old Rent | New Rent | Change |')
        lines.push('|----------|------|----------|----------|----------|--------|')
        renewals.forEach(e => {
            const d = e.details
            const rentChange = d.new_lease.rent_amount - d.old_lease.rent_amount
            const changeSymbol = rentChange > 0 ? '↑' : rentChange < 0 ? '↓' : '='
            lines.push(`| **${d.resident_name || 'Unknown'}** | ${d.unit_name} | ${e.property_code} | $${d.old_lease.rent_amount} | $${d.new_lease.rent_amount} | ${changeSymbol} $${Math.abs(rentChange)} |`)
        })
        lines.push('')
    }

    const priceChanges = events.filter(e => e.event_type === 'price_change')
    if (priceChanges.length > 0) {
        lines.push('### 💰 Availability Price Changes')
        lines.push('')
        lines.push('| Unit | Property | Old Rent | New Rent | Change | % Change |')
        lines.push('|------|----------|----------|----------|--------|----------|')
        priceChanges.forEach(e => {
            const d = e.details
            const changeSymbol = d.change_amount > 0 ? '↑' : '↓'
            const changeColor = d.change_amount > 0 ? '🟢' : '🔴'
            lines.push(`| **${d.unit_name}** | ${e.property_code} | $${d.old_rent.toFixed(0)} | $${d.new_rent.toFixed(0)} | ${changeColor} ${changeSymbol} $${Math.abs(d.change_amount).toFixed(0)} | ${d.change_percent.toFixed(1)}% |`)
        })
        lines.push('')
    }

    lines.push('---')
    lines.push('')

    for (const code of properties) {
        const s = summaryData[code]
        lines.push(`## Property: ${code} - ${getPropertyName(code)}`)
        lines.push('')
        lines.push(`- **New Residents:** ${s.tenanciesNew}`)
        lines.push(`- **Lease Renewals:** ${s.leasesRenewed}`)
        lines.push(`- **Applications:** ${s.applicationsSaved}`)
        lines.push(`- **Notices on File:** ${s.noticesProcessed}`)
        lines.push(`- **Flags Created:** ${s.makereadyFlags + s.applicationFlags}`)
        lines.push('')
    }

    return lines.join('\n')
}
