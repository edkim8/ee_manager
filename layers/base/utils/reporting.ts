
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
    }
    technical: {
        filesProcessed: number
        filesWithErrors: number
        status: string
        errorMessage: string | null
    }
}

/**
 * Generate a premium HTML report for a Solver run.
 * Optimized for email clients with inline CSS.
 */
export function generateHighFidelityHtmlReport(run: any, events: SolverEvent[], operationalSummary?: OperationalSummary, baseUrl: string = ''): string {
    const summaryData = run.summary as Record<string, PropertySummary>
    const knownCodes = new Set(PROPERTY_LIST.map(p => p.code))
    // Filter to known property codes only — excludes STALE_UPDATE and any staging artifacts
    const properties = (run.properties_processed || []).filter((code: string) => knownCodes.has(code))

    let html = `
    <div style="font-family: 'Inter', sans-serif, system-ui; max-width: 800px; margin: 0 auto; color: #1f2937; line-height: 1.5;">
        <!-- Header -->
        <div style="background-color: #4f46e5; padding: 32px; border-radius: 12px 12px 0 0; color: white;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">Daily Solver Report</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">
                Batch ID: <code style="background: rgba(255,255,255,0.2); padding: 2px 4px; border-radius: 4px;">${run.batch_id}</code>
            </p>
            <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">
                Processed at: ${new Date(run.upload_date).toLocaleString()}
            </p>
        </div>

        <div style="padding: 32px; background-color: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">

            <!-- 1. Property Breakdown (MOVED TO TOP) -->
            <div style="margin-bottom: 48px;">
                <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Property Breakdown</h2>
                ${properties.map((code: string) => renderPropertySummary(code, summaryData[code])).join('')}
            </div>

            <!-- 2. System Overview - Details -->
            <div style="margin-bottom: 40px;">
                <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">System Overview - Details</h2>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
                    ${renderStatCard('Properties', properties.length)}
                    ${renderStatCard('New Residents', events.filter(e => e.event_type === 'new_tenancy').length)}
                    ${renderStatCard('Renewals', events.filter(e => e.event_type === 'lease_renewal').length)}
                </div>
            </div>

            <!-- Detailed Event Tables -->
            ${renderAvailabilitiesSection(events.filter(e => e.event_type === 'price_change'), baseUrl)}
            ${renderEventSection('✍️ New Leases Signed Today', events.filter(e => e.event_type === 'lease_signed'), renderLeaseSignedRow)}
            ${renderEventSection('🔄 Lease Renewals', events.filter(e => e.event_type === 'lease_renewal'), renderLeaseRenewalRow)}
            ${renderEventSection('💰 Price Changes', events.filter(e => e.event_type === 'price_change'), renderPriceChangeRow)}
            ${renderEventSection('📝 New Applications', events.filter(e => e.event_type === 'application_saved'), renderApplicationRow)}
            ${renderNoticesSummarySection(events.filter(e => e.event_type === 'notice_given'))}

            <!-- Operational Summaries -->
            <div style="margin-top: 48px;">
                <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Operational Summary</h2>

                ${operationalSummary ? renderSummaryBox('Alerts', '🚨', [
                    { label: 'Open Alerts', value: operationalSummary.alerts.active.toString() },
                    { label: 'New Today', value: operationalSummary.alerts.newToday.toString() },
                    { label: 'Closed Today', value: operationalSummary.alerts.closedToday.toString() }
                ], 'View All Alerts', `${baseUrl}/office/alerts`) : ''}

                ${operationalSummary ? renderSummaryBox('Work Orders', '🔧', [
                    { label: 'Open Orders', value: operationalSummary.workOrders.open.toString() },
                    { label: 'New Today', value: operationalSummary.workOrders.newToday > 0 ? operationalSummary.workOrders.newToday.toString() : 'N/A' },
                    { label: 'Completed Today', value: operationalSummary.workOrders.completedToday.toString() }
                ], 'View All Work Orders', `${baseUrl}/maintenance/work-orders`) : ''}

                ${operationalSummary ? renderSummaryBox('MakeReady Status', '🏠', [
                    { label: 'Units in MakeReady', value: operationalSummary.makeReady.active.toString() },
                    { label: 'Overdue Units', value: operationalSummary.makeReady.overdue.toString() },
                    { label: 'Ready This Week', value: operationalSummary.makeReady.readyThisWeek > 0 ? operationalSummary.makeReady.readyThisWeek.toString() : 'N/A' }
                ], 'View MakeReady Dashboard', `${baseUrl}/office/makeready`) : ''}

                ${operationalSummary ? renderSummaryBox('Delinquencies', '💵', [
                    { label: 'Total Delinquent', value: operationalSummary.delinquencies.count.toString() },
                    { label: 'Total Amount', value: '$' + operationalSummary.delinquencies.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
                    { label: 'Over 90 Days', value: operationalSummary.delinquencies.over90Days.toString() }
                ], 'View Delinquency Report', `${baseUrl}/office/delinquencies`) : ''}
            </div>

            <!-- 4. Technical Health -->
            ${operationalSummary ? `
            <div style="margin-top: 48px;">
                <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
                    ⚙️ Technical Health
                </h2>
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
                            <div style="font-size: 16px; font-weight: 700; color: #4f46e5; margin-top: 4px;">
                                ${operationalSummary.technical.filesProcessed}
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Parse Errors</div>
                            <div style="font-size: 16px; font-weight: 700; color: ${operationalSummary.technical.filesWithErrors > 0 ? '#dc2626' : '#059669'}; margin-top: 4px;">
                                ${operationalSummary.technical.filesWithErrors}
                            </div>
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

function renderStatCard(label: string, value: number) {
    return `
    <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #f3f4f6; text-align: center;">
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">${label}</div>
        <div style="font-size: 24px; font-weight: 700; color: #4f46e5; margin-top: 4px;">${value}</div>
    </div>
    `
}

function renderAvailabilitiesSection(priceChangeEvents: SolverEvent[], baseUrl: string = '') {
    // Show availabilities summary based on price change events
    // This gives a snapshot of units that had pricing updates

    return `
    <div style="margin-bottom: 40px;">
        <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 12px; display: flex; align-items: center;">
            🏢 Current Availabilities
            ${priceChangeEvents.length > 0 ? `<span style="margin-left: 8px; background: #e0e7ff; color: #4338ca; font-size: 12px; padding: 2px 8px; border-radius: 9999px;">${priceChangeEvents.length} pricing updates</span>` : ''}
        </h3>
        <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px;">
                ${priceChangeEvents.length > 0
                    ? `${priceChangeEvents.length} units had pricing updates today. Price changes are tracked in the section below.`
                    : 'No pricing updates today. All availabilities remain at current market rates.'}
            </p>
            <div style="padding: 12px; background-color: white; border-radius: 6px; border: 1px solid #e5e7eb; text-align: center;">
                <a href="${baseUrl}/office/availabilities" style="color: #4f46e5; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-flex; align-items: center; gap: 4px;">
                    View Full Availabilities Dashboard →
                </a>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af;">
                    See all available units, market rents, and leasing pipeline
                </p>
            </div>
        </div>
    </div>
    `
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

function renderLeaseSignedRow(e: SolverEvent) {
    const d = e.details
    return `
    <tr>
        <td style="${cellStyle}"><strong>${d.resident_name}</strong></td>
        <td style="${cellStyle}">${d.unit_name}</td>
        <td style="${cellStyle}">${e.property_code}</td>
        <td style="${cellStyle}">${d.move_in_date || 'TBD'}</td>
        <td style="${cellStyle}">$${d.rent_amount ? d.rent_amount.toFixed(0) : 'N/A'}</td>
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

    const rows = Array.from(byProp.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([code, info]) => `
            <tr>
                <td style="padding: 8px 10px; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${code} — ${getPropertyName(code)}</td>
                <td style="padding: 8px 10px; border-bottom: 1px solid #f3f4f6; text-align: center;">${info.count}</td>
                <td style="padding: 8px 10px; border-bottom: 1px solid #f3f4f6;">${info.earliest || '—'}</td>
                <td style="padding: 8px 10px; border-bottom: 1px solid #f3f4f6;">${info.latest  || '—'}</td>
            </tr>
        `).join('')

    return `
    <div style="margin-bottom: 40px;">
        <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 12px; display: flex; align-items: center;">
            📋 Notices on File
            <span style="margin-left: 8px; background: #fff7ed; color: #c2410c; font-size: 12px; padding: 2px 8px; border-radius: 9999px;">${noticeEvents.length} total</span>
        </h3>
        <div style="overflow-x: auto; margin-bottom: 12px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                        <th style="padding: 8px 10px; text-align: left; font-weight: 600; color: #4b5563;">Property</th>
                        <th style="padding: 8px 10px; text-align: center; font-weight: 600; color: #4b5563;">Count</th>
                        <th style="padding: 8px 10px; text-align: left; font-weight: 600; color: #4b5563;">Earliest Move-Out</th>
                        <th style="padding: 8px 10px; text-align: left; font-weight: 600; color: #4b5563;">Latest Move-Out</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        <div style="padding: 12px; background-color: #fff7ed; border-radius: 6px; border: 1px solid #fed7aa; font-size: 12px; color: #9a3412;">
            Individual notice details will be available in the Notices page (coming soon).
        </div>
    </div>
    `
}

function renderSummaryBox(title: string, icon: string, items: {label: string, value: string}[], linkText: string = 'View Details', linkUrl: string = '#') {
    return `
    <div style="margin-bottom: 32px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; padding: 20px;">
        <h3 style="font-size: 15px; font-weight: 600; color: #374151; margin: 0 0 16px 0; display: flex; align-items: center;">
            <span style="margin-right: 8px;">${icon}</span> ${title}
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px;">
            ${items.map(item => `
                <div>
                    <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">${item.label}</div>
                    <div style="font-size: 20px; font-weight: 700; color: #4f46e5; margin-top: 4px;">${item.value}</div>
                </div>
            `).join('')}
        </div>
        <a href="${linkUrl}" style="display: inline-block; padding: 8px 16px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;">
            ${linkText} →
        </a>
    </div>
    `
}

function renderPropertySummary(code: string, s: PropertySummary) {
    if (!s) return ''

    const pill = (n: number, label: string, color = '#4f46e5') =>
        n > 0
            ? `<span style="background:${color}15; color:${color}; font-size:11px; font-weight:700; padding:2px 7px; border-radius:9999px; margin-left:4px;">${n} ${label}</span>`
            : ''

    return `
    <div style="margin-bottom: 16px; padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h4 style="margin: 0; font-size: 15px; color: #111827;">${code} — ${getPropertyName(code)}</h4>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; font-size: 12px;">
            <div>
                <div style="color: #6b7280; font-weight:600; text-transform:uppercase; font-size:10px; letter-spacing:0.05em;">Availabilities</div>
                <div style="font-weight: 600; margin-top:3px;">
                    ${s.availabilitiesNew > 0 ? `${s.availabilitiesNew} new` : '—'}
                    ${s.availabilitiesUpdated > 0 ? `· ${s.availabilitiesUpdated} updated` : ''}
                </div>
            </div>
            <div>
                <div style="color: #6b7280; font-weight:600; text-transform:uppercase; font-size:10px; letter-spacing:0.05em;">Residents</div>
                <div style="font-weight: 600; margin-top:3px;">
                    ${s.tenanciesNew > 0 ? `${s.tenanciesNew} new` : '—'}
                    ${s.tenanciesUpdated > 0 ? `· ${s.tenanciesUpdated} updated` : ''}
                </div>
            </div>
            <div>
                <div style="color: #6b7280; font-weight:600; text-transform:uppercase; font-size:10px; letter-spacing:0.05em;">Lease Renewals</div>
                <div style="font-weight: 600; margin-top:3px;">${s.leasesRenewed > 0 ? s.leasesRenewed : '—'}</div>
            </div>
            <div>
                <div style="color: #6b7280; font-weight:600; text-transform:uppercase; font-size:10px; letter-spacing:0.05em;">Applications</div>
                <div style="font-weight: 600; margin-top:3px;">${s.applicationsSaved > 0 ? s.applicationsSaved : '—'}</div>
            </div>
            <div>
                <div style="color: #6b7280; font-weight:600; text-transform:uppercase; font-size:10px; letter-spacing:0.05em;">Notices</div>
                <div style="font-weight: 600; margin-top:3px;">${s.noticesProcessed > 0 ? s.noticesProcessed : '—'}</div>
            </div>
            <div>
                <div style="color: #6b7280; font-weight:600; text-transform:uppercase; font-size:10px; letter-spacing:0.05em;">Flags</div>
                <div style="font-weight: 600; margin-top:3px;">${(s.makereadyFlags + s.applicationFlags) > 0 ? (s.makereadyFlags + s.applicationFlags) : '—'}</div>
            </div>
        </div>
    </div>
    `
}

export function generateMarkdownReport(run: any, events: SolverEvent[]): string {
    const lines: string[] = []
    const summaryData = run.summary as Record<string, PropertySummary>
    const knownCodes = new Set(PROPERTY_LIST.map(p => p.code))
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
