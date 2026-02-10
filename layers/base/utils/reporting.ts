
import { getPropertyName } from '../constants/properties'

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
export function generateHighFidelityHtmlReport(run: any, events: SolverEvent[], operationalSummary?: OperationalSummary): string {
    const summaryData = run.summary as Record<string, PropertySummary>
    // Filter out STALE_UPDATE (system operation, not a real property)
    const properties = (run.properties_processed || []).filter((code: string) => code !== 'STALE_UPDATE')

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
                    ${renderStatCard('New Tenancies', events.filter(e => e.event_type === 'new_tenancy').length)}
                    ${renderStatCard('Renewals', events.filter(e => e.event_type === 'lease_renewal').length)}
                </div>
            </div>

            <!-- Detailed Event Tables -->
            ${renderAvailabilitiesSection(events.filter(e => e.event_type === 'price_change'))}
            ${renderEventSection('✍️ New Leases Signed', events.filter(e => e.event_type === 'lease_signed'), renderLeaseSignedRow)}
            ${renderEventSection('🔄 Lease Renewals', events.filter(e => e.event_type === 'lease_renewal'), renderLeaseRenewalRow)}
            ${renderEventSection('💰 Price Changes', events.filter(e => e.event_type === 'price_change'), renderPriceChangeRow)}
            ${renderEventSection('📝 New Applications', events.filter(e => e.event_type === 'application_saved'), renderApplicationRow)}
            ${renderEventSection('📋 Notices Given', events.filter(e => e.event_type === 'notice_given'), renderNoticeRow)}

            <!-- Operational Summaries -->
            <div style="margin-top: 48px;">
                <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Operational Summary</h2>

                ${operationalSummary ? renderSummaryBox('Alerts', '🚨', [
                    { label: 'Open Alerts', value: operationalSummary.alerts.active.toString() },
                    { label: 'New Today', value: operationalSummary.alerts.newToday.toString() },
                    { label: 'Closed Today', value: operationalSummary.alerts.closedToday.toString() }
                ], 'View All Alerts', '/office/alerts') : ''}

                ${operationalSummary ? renderSummaryBox('Work Orders', '🔧', [
                    { label: 'Open Orders', value: operationalSummary.workOrders.open.toString() },
                    { label: 'New Today', value: operationalSummary.workOrders.newToday > 0 ? operationalSummary.workOrders.newToday.toString() : 'N/A' },
                    { label: 'Completed Today', value: operationalSummary.workOrders.completedToday.toString() }
                ], 'View All Work Orders', '/maintenance/work-orders') : ''}

                ${operationalSummary ? renderSummaryBox('MakeReady Status', '🏠', [
                    { label: 'Units in MakeReady', value: operationalSummary.makeReady.active.toString() },
                    { label: 'Overdue Units', value: operationalSummary.makeReady.overdue.toString() },
                    { label: 'Ready This Week', value: operationalSummary.makeReady.readyThisWeek > 0 ? operationalSummary.makeReady.readyThisWeek.toString() : 'N/A' }
                ], 'View MakeReady Dashboard', '/office/makeready') : ''}

                ${operationalSummary ? renderSummaryBox('Delinquencies', '💵', [
                    { label: 'Total Delinquent', value: operationalSummary.delinquencies.count.toString() },
                    { label: 'Total Amount', value: '$' + operationalSummary.delinquencies.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
                    { label: 'Over 90 Days', value: operationalSummary.delinquencies.over90Days.toString() }
                ], 'View Delinquency Report', '/office/delinquencies') : ''}
            </div>

            <!-- 3. Operational Summary -->
            <div style="margin-top: 48px;">
                <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Operational Summary</h2>

                ${operationalSummary ? renderSummaryBox('Alerts', '🚨', [
                    { label: 'Open Alerts', value: operationalSummary.alerts.active.toString() },
                    { label: 'New Today', value: operationalSummary.alerts.newToday.toString() },
                    { label: 'Closed Today', value: operationalSummary.alerts.closedToday.toString() }
                ], 'View All Alerts', '/office/alerts') : ''}

                ${operationalSummary ? renderSummaryBox('Work Orders', '🔧', [
                    { label: 'Open Orders', value: operationalSummary.workOrders.open.toString() },
                    { label: 'New Today', value: operationalSummary.workOrders.newToday > 0 ? operationalSummary.workOrders.newToday.toString() : 'N/A' },
                    { label: 'Completed Today', value: operationalSummary.workOrders.completedToday.toString() }
                ], 'View All Work Orders', '/maintenance/work-orders') : ''}

                ${operationalSummary ? renderSummaryBox('MakeReady Status', '🏠', [
                    { label: 'Units in MakeReady', value: operationalSummary.makeReady.active.toString() },
                    { label: 'Overdue Units', value: operationalSummary.makeReady.overdue.toString() },
                    { label: 'Ready This Week', value: operationalSummary.makeReady.readyThisWeek > 0 ? operationalSummary.makeReady.readyThisWeek.toString() : 'N/A' }
                ], 'View MakeReady Dashboard', '/office/makeready') : ''}

                ${operationalSummary ? renderSummaryBox('Delinquencies', '💵', [
                    { label: 'Total Delinquent', value: operationalSummary.delinquencies.count.toString() },
                    { label: 'Total Amount', value: '$' + operationalSummary.delinquencies.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
                    { label: 'Over 90 Days', value: operationalSummary.delinquencies.over90Days.toString() }
                ], 'View Delinquency Report', '/office/delinquencies') : ''}
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

function renderAvailabilitiesSection(priceChangeEvents: SolverEvent[]) {
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
                <a href="/office/availabilities" style="color: #4f46e5; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-flex; align-items: center; gap: 4px;">
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

    return `
    <div style="margin-bottom: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h4 style="margin: 0; font-size: 15px; color: #111827;">${code} - ${getPropertyName(code)}</h4>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; font-size: 12px;">
            <div>
                <div style="color: #6b7280;">Availabilities</div>
                <div style="font-weight: 600;">+${s.availabilitiesNew} / ${s.availabilitiesUpdated} mod</div>
            </div>
            <div>
                <div style="color: #6b7280;">Tenancies</div>
                <div style="font-weight: 600;">+${s.tenanciesNew} / ${s.tenanciesUpdated} mod</div>
            </div>
            <div>
                <div style="color: #6b7280;">Leases</div>
                <div style="font-weight: 600;">${s.leasesRenewed} renewals</div>
            </div>
            <div>
                <div style="color: #6b7280;">Applications</div>
                <div style="font-weight: 600;">${s.applicationsSaved} total</div>
            </div>
            <div>
                <div style="color: #6b7280;">Flags</div>
                <div style="font-weight: 600;">${s.makereadyFlags + s.applicationFlags} created</div>
            </div>
        </div>
    </div>
    `
}

export function generateMarkdownReport(run: any, events: SolverEvent[]): string {
    const lines: string[] = []
    const summaryData = run.summary as Record<string, PropertySummary>
    const properties = run.properties_processed || []

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
        lines.push('### ✅ New Tenancies')
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
        lines.push(`- **New Tenancies:** ${s.tenanciesNew}`)
        lines.push(`- **Lease Renewals:** ${s.leasesRenewed}`)
        lines.push(`- **Applications:** ${s.applicationsSaved}`)
        lines.push(`- **Flags Created:** ${s.makereadyFlags + s.applicationFlags}`)
        lines.push('')
    }

    return lines.join('\n')
}
