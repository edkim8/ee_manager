
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
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
                <div>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">Daily Solver Report</h1>
                    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">
                        ${uploadDateStr}
                    </p>
                    <p style="margin: 4px 0 0; opacity: 0.75; font-size: 12px;">
                        Batch: <code style="background: rgba(255,255,255,0.2); padding: 2px 4px; border-radius: 4px;">${run.batch_id}</code>
                    </p>
                </div>
                ${baseUrl ? `
                <div style="display: flex; flex-direction: column; gap: 8px; flex-shrink: 0;">
                    <a href="${baseUrl}/admin/solver/report" style="display: inline-block; background: rgba(255,255,255,0.2); color: white; text-decoration: none; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; white-space: nowrap; border: 1px solid rgba(255,255,255,0.3);">📊 Live Report →</a>
                    <a href="${baseUrl}/admin/solver/report-help" style="display: inline-block; background: rgba(255,255,255,0.1); color: white; text-decoration: none; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; white-space: nowrap; border: 1px solid rgba(255,255,255,0.25);">❓ Report Guide</a>
                </div>
                ` : ''}
            </div>
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
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px;">

                    ${renderSummaryBox('Alerts', '🚨', [
                        { label: 'Open', value: operationalSummary.alerts.active.toString() },
                        { label: 'New Today', value: operationalSummary.alerts.newToday.toString() },
                        { label: 'Closed Today', value: operationalSummary.alerts.closedToday.toString() },
                    ], 'View Alerts', `${baseUrl}/office/alerts`)}

                    ${renderSummaryBox('Work Orders', '🔧', [
                        { label: 'Open', value: operationalSummary.workOrders.open.toString() },
                        { label: 'New Today', value: operationalSummary.workOrders.newToday.toString() },
                        { label: 'Completed Today', value: operationalSummary.workOrders.completedToday.toString() },
                        ...(operationalSummary.workOrders.overdueOpen != null
                            ? [{ label: 'Open > 3 Days', value: operationalSummary.workOrders.overdueOpen.toString(), highlight: operationalSummary.workOrders.overdueOpen > 0 }]
                            : []),
                    ], 'View Work Orders', `${baseUrl}/maintenance/work-orders`)}

                    ${renderSummaryBox('MakeReady', '🏠', [
                        { label: 'Active Units', value: operationalSummary.makeReady.active.toString() },
                        { label: 'Overdue', value: operationalSummary.makeReady.overdue.toString(), highlight: operationalSummary.makeReady.overdue > 0 },
                        { label: 'Ready This Week', value: operationalSummary.makeReady.readyThisWeek > 0 ? operationalSummary.makeReady.readyThisWeek.toString() : '0' },
                    ], 'View MakeReady', `${baseUrl}/office/makeready`)}

                    ${renderSummaryBox('Delinquencies', '💵', [
                        { label: 'Residents', value: operationalSummary.delinquencies.count.toString(), highlight: operationalSummary.delinquencies.count > 0 },
                        { label: 'Total Owed', value: '$' + operationalSummary.delinquencies.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
                        ...(operationalSummary.delinquencies.amount30Plus != null
                            ? [{ label: '30+ Days', value: '$' + operationalSummary.delinquencies.amount30Plus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), highlight: operationalSummary.delinquencies.amount30Plus > 0 }]
                            : [{ label: '90+ Days Count', value: operationalSummary.delinquencies.over90Days.toString(), highlight: operationalSummary.delinquencies.over90Days > 0 }]),
                    ], 'View Delinquencies', `${baseUrl}/office/delinquencies`)}

                </div>
            </div>
            ` : ''}

            <!-- ③ Event Detail Tables -->
            <div>
                <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Today's Activity</h2>
                ${renderEventSection('👤 New Residents', events.filter(e => e.event_type === 'new_tenancy'), renderNewTenancyRow)}
                ${renderEventSection('🔄 Lease Renewals', events.filter(e => e.event_type === 'lease_renewal'), renderLeaseRenewalRow)}
                ${renderEventSection('💰 Price Changes', events.filter(e => e.event_type === 'price_change'), renderPriceChangeRow)}
                ${renderEventSection('📝 New Applications', events.filter(e => e.event_type === 'application_saved'), renderApplicationRow)}
                ${renderNoticesSummarySection(events.filter(e => e.event_type === 'notice_given'))}
                ${!events.length ? '<p style="color: #9ca3af; font-size: 13px; margin: 0;">No activity events recorded for this run.</p>' : ''}
            </div>

            <!-- ④ Technical Health -->
            ${operationalSummary ? `
            <div style="margin-top: 48px;">
                <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">⚙️ Technical Health</h2>
                <div style="background-color: ${operationalSummary.technical.status === 'completed' ? '#ecfdf5' : operationalSummary.technical.status === 'failed' ? '#fef2f2' : '#fef3c7'}; border-radius: 8px; padding: 20px; border: 1px solid ${operationalSummary.technical.status === 'completed' ? '#d1fae5' : operationalSummary.technical.status === 'failed' ? '#fecaca' : '#fde68a'};">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: ${operationalSummary.technical.errorMessage ? '16px' : '0'};">
                        <div>
                            <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Status</div>
                            <div style="font-size: 16px; font-weight: 700; color: ${operationalSummary.technical.status === 'completed' ? '#065f46' : operationalSummary.technical.status === 'failed' ? '#991b1b' : '#92400e'}; margin-top: 4px; text-transform: uppercase;">
                                ${operationalSummary.technical.status === 'completed' ? '✓ SUCCESS' : operationalSummary.technical.status === 'failed' ? '✗ FAILED' : '⋯ RUNNING'}
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Files Processed</div>
                            <div style="font-size: 16px; font-weight: 700; color: #4f46e5; margin-top: 4px;">${operationalSummary.technical.filesProcessed}</div>
                        </div>
                        <div>
                            <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Parse Errors</div>
                            <div style="font-size: 16px; font-weight: 700; color: ${operationalSummary.technical.filesWithErrors > 0 ? '#dc2626' : '#059669'}; margin-top: 4px;">${operationalSummary.technical.filesWithErrors}</div>
                        </div>
                    </div>
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

function renderEventSection(title: string, events: SolverEvent[], rowRenderer: (e: SolverEvent) => string) {
    if (events.length === 0) return ''

    return `
    <div style="margin-bottom: 40px;">
        <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 12px; display: flex; align-items: center;">
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
        <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 12px; display: flex; align-items: center;">
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
    return `
    <div style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; padding: 20px;">
        <h3 style="font-size: 14px; font-weight: 700; color: #374151; margin: 0 0 14px 0; display: flex; align-items: center; text-transform: uppercase; letter-spacing: 0.05em;">
            <span style="margin-right: 6px;">${icon}</span> ${title}
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; margin-bottom: 14px;">
            ${items.map(item => `
                <div>
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">${item.label}</div>
                    <div style="font-size: 18px; font-weight: 700; color: ${item.highlight ? '#dc2626' : '#4f46e5'}; margin-top: 3px;">${item.value}</div>
                </div>
            `).join('')}
        </div>
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
const moduleGrid  = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; font-size: 12px;'
const metricLabel = 'color: #6b7280; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em;'
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
            <div style="${moduleGrid}">
                <div>
                    <div style="${metricLabel}">Available Units</div>
                    <div style="${metricValue}">${availUnits}</div>
                </div>
                <div>
                    <div style="${metricLabel}">Applications</div>
                    <div style="${metricValue}">${s.applicationsSaved}</div>
                </div>
                <div>
                    <div style="${metricLabel}">Notices</div>
                    <div style="${metricValue}">${s.noticesProcessed}</div>
                </div>
                ${avgRent ? `
                <div>
                    <div style="${metricLabel}">Avg Contracted Rent</div>
                    <div style="${metricValue}">${avgRent}</div>
                </div>` : ''}
            </div>
        </div>

        <!-- Renewals module -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 12px;">
            <div style="${moduleLabel}">Renewals</div>
            <div style="${moduleGrid}">
                <div>
                    <div style="${metricLabel}">Offer Pending</div>
                    <div style="${metricValue}; color: ${(renewals?.pending ?? 0) > 0 ? '#d97706' : 'inherit'}">${renewals?.pending ?? 0}</div>
                </div>
                <div>
                    <div style="${metricLabel}">Awaiting Response</div>
                    <div style="${metricValue}; color: ${(renewals?.offered ?? 0) > 0 ? '#4f46e5' : 'inherit'}">${renewals?.offered ?? 0}</div>
                </div>
                <div>
                    <div style="${metricLabel}">Completed This Run</div>
                    <div style="${metricValue}">${s.leasesRenewed}</div>
                </div>
            </div>
        </div>
    </div>
    `
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
