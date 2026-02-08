interface SolverEvent {
    property_code: string
    event_type: string
    details: Record<string, any>
    unit_id?: string
    tenancy_id?: string
}

interface PropertySummary {
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
    // ========== TRACKING ENHANCEMENTS ==========
    priceChanges: number
    // ========== END TRACKING ENHANCEMENTS ==========
}

export const useSolverReportGenerator = () => {
    /**
     * Generate markdown report from summary data
     */
    const generateMarkdown = (
        batchId: string,
        uploadDate: string,
        propertySummaries: Record<string, PropertySummary>,
        events: SolverEvent[]
    ): string => {
        const lines: string[] = []

        // Header
        lines.push('# Solver Run Summary')
        lines.push('')
        lines.push(`**Date:** ${new Date(uploadDate).toLocaleString('en-US', {
            dateStyle: 'full',
            timeStyle: 'short'
        })}`)
        lines.push(`**Batch ID:** \`${batchId}\``)
        lines.push('')
        lines.push('---')
        lines.push('')

        // Overview
        lines.push('## Overview')
        lines.push('')

        const properties = Object.keys(propertySummaries).sort()

        const totalTenancies = properties.reduce((sum, p) => sum + propertySummaries[p].tenanciesNew + propertySummaries[p].tenanciesUpdated, 0)
        const totalResidents = properties.reduce((sum, p) => sum + propertySummaries[p].residentsNew + propertySummaries[p].residentsUpdated, 0)
        const totalApplications = properties.reduce((sum, p) => sum + propertySummaries[p].applicationsSaved, 0)
        const totalRenewals = properties.reduce((sum, p) => sum + propertySummaries[p].leasesRenewed, 0)
        const totalNotices = properties.reduce((sum, p) => sum + propertySummaries[p].noticesProcessed, 0)
        const totalFlags = properties.reduce((sum, p) =>
            sum + propertySummaries[p].makereadyFlags + propertySummaries[p].applicationFlags + propertySummaries[p].transferFlags, 0)
        // ========== TRACKING ENHANCEMENTS ==========
        const totalPriceChanges = properties.reduce((sum, p) => sum + (propertySummaries[p].priceChanges || 0), 0)
        // ========== END TRACKING ENHANCEMENTS ==========

        lines.push(`- **Properties Processed:** ${properties.length} (${properties.join(', ')})`)
        lines.push(`- **Total Tenancies:** ${totalTenancies}`)
        lines.push(`- **Total Residents:** ${totalResidents}`)
        lines.push(`- **Total Applications:** ${totalApplications}`)
        lines.push(`- **Lease Renewals:** ${totalRenewals}`)
        lines.push(`- **Notices Processed:** ${totalNotices}`)
        lines.push(`- **Flags Created:** ${totalFlags}`)
        // ========== TRACKING ENHANCEMENTS ==========
        lines.push(`- **Price Changes:** ${totalPriceChanges}`)
        // ========== END TRACKING ENHANCEMENTS ==========
        lines.push('')
        lines.push('---')
        lines.push('')

        // ==========================================
        // TRACKING ENHANCEMENTS - Executive Summary Section
        // ==========================================
        lines.push('## 📊 Executive Summary - Daily Changes')
        lines.push('')

        // New Tenancies
        const allNewTenancies = events.filter(e => e.event_type === 'new_tenancy')
        if (allNewTenancies.length > 0) {
            lines.push('### ✅ New Tenancies')
            lines.push('')
            lines.push('| Resident | Unit | Property | Status | Move-In | Source |')
            lines.push('|----------|------|----------|--------|---------|--------|')
            allNewTenancies.forEach(event => {
                const d = event.details
                lines.push(`| **${d.resident_name}** | ${d.unit_name} | ${event.property_code} | ${d.status} | ${d.move_in_date || 'TBD'} | ${d.source} |`)
            })
            lines.push('')
        }

        // Lease Renewals
        const allRenewals = events.filter(e => e.event_type === 'lease_renewal')
        if (allRenewals.length > 0) {
            lines.push('### 🔄 Lease Renewals')
            lines.push('')
            lines.push('| Resident | Unit | Property | Old Rent | New Rent | Change |')
            lines.push('|----------|------|----------|----------|----------|--------|')
            allRenewals.forEach(event => {
                const d = event.details
                const rentChange = d.new_lease.rent_amount - d.old_lease.rent_amount
                const changeSymbol = rentChange > 0 ? '↑' : rentChange < 0 ? '↓' : '='
                lines.push(`| **${d.resident_name || 'Unknown'}** | ${d.unit_name} | ${event.property_code} | $${d.old_lease.rent_amount} | $${d.new_lease.rent_amount} | ${changeSymbol} $${Math.abs(rentChange)} |`)
            })
            lines.push('')
        }

        // Notices Given
        const allNotices = events.filter(e => e.event_type === 'notice_given')
        if (allNotices.length > 0) {
            lines.push('### 📋 Notices Given')
            lines.push('')
            lines.push('| Resident | Unit | Property | Move-Out Date | Status |')
            lines.push('|----------|------|----------|---------------|--------|')
            allNotices.forEach(event => {
                const d = event.details
                lines.push(`| **${d.resident_name || 'Unknown'}** | ${d.unit_name} | ${event.property_code} | ${d.move_out_date || 'TBD'} | ${d.status_change || 'Notice'} |`)
            })
            lines.push('')
        }

        // Applications
        const allApplications = events.filter(e => e.event_type === 'application_saved')
        if (allApplications.length > 0) {
            lines.push('### 📝 New Applications')
            lines.push('')
            lines.push('| Applicant | Unit | Property | Application Date | Screening |')
            lines.push('|-----------|------|----------|------------------|-----------|')
            allApplications.forEach(event => {
                const d = event.details
                lines.push(`| **${d.applicant_name}** | ${d.unit_name} | ${event.property_code} | ${d.application_date} | ${d.screening_result || 'Pending'} |`)
            })
            lines.push('')
        }

        // Price Changes
        const allPriceChanges = events.filter(e => e.event_type === 'price_change')
        if (allPriceChanges.length > 0) {
            lines.push('### 💰 Availability Price Changes')
            lines.push('')
            lines.push('| Unit | Property | Old Rent | New Rent | Change | % Change |')
            lines.push('|------|----------|----------|----------|--------|----------|')
            allPriceChanges.forEach(event => {
                const d = event.details
                const changeSymbol = d.change_amount > 0 ? '↑' : '↓'
                const changeColor = d.change_amount > 0 ? '🟢' : '🔴'
                lines.push(`| **${d.unit_name}** | ${event.property_code} | $${d.old_rent.toFixed(0)} | $${d.new_rent.toFixed(0)} | ${changeColor} ${changeSymbol} $${Math.abs(d.change_amount).toFixed(0)} | ${d.change_percent.toFixed(1)}% |`)
            })
            lines.push('')
        }

        lines.push('---')
        lines.push('')
        // ==========================================
        // END TRACKING ENHANCEMENTS
        // ==========================================

        // Per-property details
        for (const propertyCode of properties) {
            const summary = propertySummaries[propertyCode]
            const propertyEvents = events.filter(e => e.property_code === propertyCode)

            lines.push(`## Property: ${propertyCode}`)
            lines.push('')

            // New Tenancies & Residents
            const newTenancies = propertyEvents.filter(e => e.event_type === 'new_tenancy')
            const newResidents = propertyEvents.filter(e => e.event_type === 'new_resident')

            if (newTenancies.length > 0 || newResidents.length > 0) {
                lines.push('### New Tenancies & Residents')
                lines.push('')

                if (newTenancies.length > 0) {
                    lines.push('**New Tenancies:**')
                    newTenancies.forEach(event => {
                        const d = event.details
                        lines.push(`- **${d.resident_name}** - Unit ${d.unit_name}`)
                        lines.push(`  - Status: ${d.status}`)
                        if (d.move_in_date) lines.push(`  - Move-in: ${d.move_in_date}`)
                        lines.push(`  - Source: ${d.source}`)
                    })
                    lines.push('')
                }

                if (newResidents.length > 0 && newResidents.length !== newTenancies.length) {
                    lines.push('**New Residents:**')
                    newResidents.forEach(event => {
                        const d = event.details
                        lines.push(`- **${d.resident_name}** (${d.role}) - Unit ${d.unit_name}`)
                        if (d.email) lines.push(`  - Email: ${d.email}`)
                        if (d.phone) lines.push(`  - Phone: ${d.phone}`)
                    })
                    lines.push('')
                }
            }

            // Updated counts
            if (summary.tenanciesUpdated > 0 || summary.residentsUpdated > 0) {
                lines.push('### Updates')
                lines.push('')
                if (summary.tenanciesUpdated > 0) {
                    lines.push(`- **Tenancies Updated:** ${summary.tenanciesUpdated}`)
                }
                if (summary.residentsUpdated > 0) {
                    lines.push(`- **Residents Updated:** ${summary.residentsUpdated}`)
                }
                lines.push('')
            }

            // Lease Renewals
            const renewals = propertyEvents.filter(e => e.event_type === 'lease_renewal')
            if (renewals.length > 0) {
                lines.push('### Lease Renewals')
                lines.push('')
                renewals.forEach(event => {
                    const d = event.details
                    lines.push(`- **${d.resident_name || 'Unknown'}** - Unit ${d.unit_name}`)
                    lines.push(`  - Old Lease: ${d.old_lease.start_date} to ${d.old_lease.end_date} ($${d.old_lease.rent_amount})`)
                    lines.push(`  - New Lease: ${d.new_lease.start_date} to ${d.new_lease.end_date} ($${d.new_lease.rent_amount})`)
                })
                lines.push('')
            } else if (summary.leasesNew > 0 || summary.leasesUpdated > 0) {
                lines.push('### Leases')
                lines.push('')
                lines.push(`- New: ${summary.leasesNew}`)
                lines.push(`- Updated: ${summary.leasesUpdated}`)
                lines.push(`- Renewals: 0`)
                lines.push('')
            }

            // Notices
            const notices = propertyEvents.filter(e => e.event_type === 'notice_given')
            if (notices.length > 0) {
                lines.push('### Notices Given')
                lines.push('')
                notices.forEach(event => {
                    const d = event.details
                    lines.push(`- **${d.resident_name || 'Unknown'}** - Unit ${d.unit_name}`)
                    if (d.move_in_date) lines.push(`  - Move-in: ${d.move_in_date}`)
                    if (d.move_out_date) lines.push(`  - Move-out: ${d.move_out_date}`)
                    if (d.status_change) lines.push(`  - Status: ${d.status_change}`)
                })
                lines.push('')
            }

            // Status Auto-fixes
            if (summary.statusAutoFixes.length > 0) {
                lines.push('### Status Auto-Fixes')
                lines.push('')
                summary.statusAutoFixes.forEach(fix => {
                    lines.push(`- ${fix}`)
                })
                lines.push('')
            }

            // Applications
            const applications = propertyEvents.filter(e => e.event_type === 'application_saved')
            if (applications.length > 0) {
                lines.push('### Applications')
                lines.push('')
                applications.forEach(event => {
                    const d = event.details
                    lines.push(`- **${d.applicant_name}** - Unit ${d.unit_name}`)
                    lines.push(`  - Date: ${d.application_date}`)
                    if (d.screening_result) lines.push(`  - Screening: ${d.screening_result}`)
                })
                lines.push('')
            }

            // Availabilities
            if (summary.availabilitiesNew > 0 || summary.availabilitiesUpdated > 0) {
                lines.push('### Availabilities')
                lines.push('')
                lines.push(`- New: ${summary.availabilitiesNew}`)
                lines.push(`- Updated: ${summary.availabilitiesUpdated}`)
                lines.push('')
            }

            // ==========================================
            // TRACKING ENHANCEMENTS - Price Changes per Property
            // ==========================================
            const priceChanges = propertyEvents.filter(e => e.event_type === 'price_change')
            if (priceChanges.length > 0) {
                lines.push('### 💰 Price Changes')
                lines.push('')
                priceChanges.forEach(event => {
                    const d = event.details
                    const changeSymbol = d.change_amount > 0 ? '↑' : '↓'
                    lines.push(`- **${d.unit_name}** - $${d.old_rent} → $${d.new_rent} (${changeSymbol} $${Math.abs(d.change_amount)} / ${d.change_percent.toFixed(1)}%)`)
                })
                lines.push('')
            }
            // ==========================================
            // END TRACKING ENHANCEMENTS
            // ==========================================

            // Flags
            if (summary.makereadyFlags > 0 || summary.applicationFlags > 0 || summary.transferFlags > 0) {
                lines.push('### Flags Created')
                lines.push('')
                if (summary.makereadyFlags > 0) {
                    lines.push(`- MakeReady Overdue: ${summary.makereadyFlags}`)
                }
                if (summary.applicationFlags > 0) {
                    lines.push(`- Application Overdue: ${summary.applicationFlags}`)
                }
                if (summary.transferFlags > 0) {
                    lines.push(`- Transfer Active: ${summary.transferFlags}`)
                }
                lines.push('')
            }

            lines.push('---')
            lines.push('')
        }

        return lines.join('\n')
    }

    /**
     * Generate filename for report
     */
    const generateFilename = (uploadDate: string, batchId: string): string => {
        const date = new Date(uploadDate)
        const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
        const timeStr = date.toISOString().split('T')[1].split(':').slice(0, 2).join('') // HHMM
        const shortBatchId = batchId.substring(0, 8)
        return `${dateStr}_${timeStr}_${shortBatchId}.md`
    }

    return {
        generateMarkdown,
        generateFilename
    }
}
