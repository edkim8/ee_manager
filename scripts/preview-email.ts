/**
 * Email preview generator — run with: npx tsx scripts/preview-email.ts
 * Outputs a simulated solver email to /tmp/solver-email-preview.html
 */
import { writeFileSync } from 'node:fs'
import { generateHighFidelityHtmlReport, type SolverEvent, type OperationalSummary, type PropertySnapshotDeltas, type PropertyRenewalCountsMap } from '../layers/base/utils/reporting'

const run = {
  batch_id: '2026-03-10_0712_a3f9b',
  upload_date: '2026-03-10T07:12:00.000Z',
  status: 'completed',
  error_message: null,
  properties_processed: ['RS', 'SB', 'CV', 'OB', 'WO'],
  summary: {
    RS: {
      tenanciesNew: 1, tenanciesUpdated: 4,
      residentsNew: 1, residentsUpdated: 4,
      leasesNew: 1, leasesUpdated: 3, leasesRenewed: 2,
      availabilitiesNew: 0, availabilitiesUpdated: 28,
      noticesProcessed: 9,
      statusAutoFixes: [],
      makereadyFlags: 1, applicationFlags: 0, transferFlags: 0,
      applicationsSaved: 1, priceChanges: 3,
    },
    SB: {
      tenanciesNew: 0, tenanciesUpdated: 6,
      residentsNew: 0, residentsUpdated: 6,
      leasesNew: 0, leasesUpdated: 4, leasesRenewed: 1,
      availabilitiesNew: 0, availabilitiesUpdated: 31,
      noticesProcessed: 14,
      statusAutoFixes: [],
      makereadyFlags: 2, applicationFlags: 1, transferFlags: 0,
      applicationsSaved: 2, priceChanges: 1,
    },
    CV: {
      tenanciesNew: 0, tenanciesUpdated: 2,
      residentsNew: 0, residentsUpdated: 2,
      leasesNew: 0, leasesUpdated: 1, leasesRenewed: 0,
      availabilitiesNew: 0, availabilitiesUpdated: 18,
      noticesProcessed: 4,
      statusAutoFixes: [],
      makereadyFlags: 0, applicationFlags: 0, transferFlags: 0,
      applicationsSaved: 0, priceChanges: 6, // AIRM micro-decrements
    },
    OB: {
      tenanciesNew: 0, tenanciesUpdated: 3,
      residentsNew: 0, residentsUpdated: 3,
      leasesNew: 0, leasesUpdated: 2, leasesRenewed: 1,
      availabilitiesNew: 1, availabilitiesUpdated: 22,
      noticesProcessed: 6,
      statusAutoFixes: [],
      makereadyFlags: 1, applicationFlags: 0, transferFlags: 0,
      applicationsSaved: 1, priceChanges: 2,
    },
    WO: {
      tenanciesNew: 0, tenanciesUpdated: 1,
      residentsNew: 0, residentsUpdated: 1,
      leasesNew: 0, leasesUpdated: 1, leasesRenewed: 0,
      availabilitiesNew: 0, availabilitiesUpdated: 14,
      noticesProcessed: 3,
      statusAutoFixes: [],
      makereadyFlags: 0, applicationFlags: 0, transferFlags: 0,
      applicationsSaved: 0, priceChanges: 0,
    },
  },
}

const events: SolverEvent[] = [
  // New Tenancy
  {
    property_code: 'RS',
    event_type: 'new_tenancy',
    details: {
      resident_name: 'Martinez, Carlos',
      unit_name: '2205',
      status: 'Future',
      move_in_date: '2026-04-01',
    },
  },

  // Lease Renewals
  {
    property_code: 'RS',
    event_type: 'lease_renewal',
    details: {
      resident_name: 'Thompson, Jennifer',
      unit_name: '1108',
      old_lease: { rent_amount: 1525 },
      new_lease: { rent_amount: 1575 },
    },
  },
  {
    property_code: 'RS',
    event_type: 'lease_renewal',
    details: {
      resident_name: 'Okafor, David',
      unit_name: '3312',
      old_lease: { rent_amount: 1650 },
      new_lease: { rent_amount: 1700 },
    },
  },
  {
    property_code: 'SB',
    event_type: 'lease_renewal',
    details: {
      resident_name: 'Patel, Anisha',
      unit_name: '2019',
      old_lease: { rent_amount: 1600 },
      new_lease: { rent_amount: 1660 },
    },
  },
  {
    property_code: 'OB',
    event_type: 'lease_renewal',
    details: {
      resident_name: 'Nguyen, Linh',
      unit_name: 'S-214',
      old_lease: { rent_amount: 2450 },
      new_lease: { rent_amount: 2525 },
    },
  },

  // Price Changes — RS
  {
    property_code: 'RS',
    event_type: 'price_change',
    details: { unit_name: '1015', old_rent: 1425, new_rent: 1450, change_amount: 25, change_percent: 1.75 },
  },
  {
    property_code: 'RS',
    event_type: 'price_change',
    details: { unit_name: '2130', old_rent: 1575, new_rent: 1550, change_amount: -25, change_percent: -1.59 },
  },
  {
    property_code: 'RS',
    event_type: 'price_change',
    details: { unit_name: '3218', old_rent: 1700, new_rent: 1725, change_amount: 25, change_percent: 1.47 },
  },
  // Price Changes — SB
  {
    property_code: 'SB',
    event_type: 'price_change',
    details: { unit_name: '1101', old_rent: 1550, new_rent: 1600, change_amount: 50, change_percent: 3.23 },
  },
  // Price Changes — CV (AIRM micro-decrements, normal)
  {
    property_code: 'CV',
    event_type: 'price_change',
    details: { unit_name: 'C-301', old_rent: 2365, new_rent: 2363, change_amount: -2, change_percent: -0.08 },
  },
  {
    property_code: 'CV',
    event_type: 'price_change',
    details: { unit_name: 'C-412', old_rent: 2410, new_rent: 2408, change_amount: -2, change_percent: -0.08 },
  },
  {
    property_code: 'CV',
    event_type: 'price_change',
    details: { unit_name: 'C-115', old_rent: 2290, new_rent: 2289, change_amount: -1, change_percent: -0.04 },
  },
  {
    property_code: 'CV',
    event_type: 'price_change',
    details: { unit_name: 'C-220', old_rent: 2350, new_rent: 2349, change_amount: -1, change_percent: -0.04 },
  },
  {
    property_code: 'CV',
    event_type: 'price_change',
    details: { unit_name: 'C-318', old_rent: 2380, new_rent: 2378, change_amount: -2, change_percent: -0.08 },
  },
  {
    property_code: 'CV',
    event_type: 'price_change',
    details: { unit_name: 'C-502', old_rent: 2420, new_rent: 2419, change_amount: -1, change_percent: -0.04 },
  },
  // Price Changes — OB
  {
    property_code: 'OB',
    event_type: 'price_change',
    details: { unit_name: 'S-108', old_rent: 2500, new_rent: 2475, change_amount: -25, change_percent: -1.0 },
  },
  {
    property_code: 'OB',
    event_type: 'price_change',
    details: { unit_name: 'S-310', old_rent: 2550, new_rent: 2525, change_amount: -25, change_percent: -0.98 },
  },

  // Applications
  {
    property_code: 'SB',
    event_type: 'application_saved',
    details: {
      applicant_name: 'Williams, Sarah',
      unit_name: '3125',
      application_date: '2026-03-10',
      screening_result: 'Approved',
    },
  },
  {
    property_code: 'SB',
    event_type: 'application_saved',
    details: {
      applicant_name: 'Chen, Michael',
      unit_name: '1208',
      application_date: '2026-03-10',
      screening_result: 'Pending',
    },
  },
  {
    property_code: 'RS',
    event_type: 'application_saved',
    details: {
      applicant_name: 'Robinson, Derek',
      unit_name: '2205',
      application_date: '2026-03-09',
      screening_result: 'Approved',
    },
  },
  {
    property_code: 'OB',
    event_type: 'application_saved',
    details: {
      applicant_name: 'Kim, Jae-Won',
      unit_name: 'S-108',
      application_date: '2026-03-10',
      screening_result: 'Pending',
    },
  },

  // Notices — RS
  {
    property_code: 'RS',
    event_type: 'notice_given',
    details: { resident_name: 'Kenton, Patricia', unit_name: '2019', move_out_date: '2026-04-07', status_change: 'Notice' },
  },
  {
    property_code: 'RS',
    event_type: 'notice_given',
    details: { resident_name: 'Jeffers, Ryan', unit_name: '3130', move_out_date: '2026-04-14', status_change: 'Notice' },
  },
  {
    property_code: 'RS',
    event_type: 'notice_given',
    details: { resident_name: 'Poorman, Timothy', unit_name: '1015', move_out_date: '2026-04-30', status_change: 'Notice' },
  },
  {
    property_code: 'RS',
    event_type: 'notice_given',
    details: { resident_name: 'Alvarez, Rosa', unit_name: '2112', move_out_date: '2026-04-15', status_change: 'Notice' },
  },
  // Notices — SB
  {
    property_code: 'SB',
    event_type: 'notice_given',
    details: { resident_name: 'Foster, Brian', unit_name: '1101', move_out_date: '2026-03-31', status_change: 'Notice' },
  },
  {
    property_code: 'SB',
    event_type: 'notice_given',
    details: { resident_name: 'Hassan, Nadia', unit_name: '2208', move_out_date: '2026-04-07', status_change: 'Notice' },
  },
  {
    property_code: 'SB',
    event_type: 'notice_given',
    details: { resident_name: 'Clark, Raymond', unit_name: '3015', move_out_date: '2026-04-30', status_change: 'Notice' },
  },
  // Notices — CV
  {
    property_code: 'CV',
    event_type: 'notice_given',
    details: { resident_name: 'Torres, Elena', unit_name: 'C-220', move_out_date: '2026-04-15', status_change: 'Notice' },
  },
  {
    property_code: 'CV',
    event_type: 'notice_given',
    details: { resident_name: 'Park, James', unit_name: 'C-412', move_out_date: '2026-04-30', status_change: 'Notice' },
  },
  // Notices — OB
  {
    property_code: 'OB',
    event_type: 'notice_given',
    details: { resident_name: 'Sullivan, Karen', unit_name: 'S-214', move_out_date: '2026-04-14', status_change: 'Notice' },
  },
  {
    property_code: 'OB',
    event_type: 'notice_given',
    details: { resident_name: 'parra, melissa', unit_name: 'S-108', move_out_date: '2026-03-31', status_change: 'Notice' },
  },
  // Notices — WO
  {
    property_code: 'WO',
    event_type: 'notice_given',
    details: { resident_name: 'Anderson, Kevin', unit_name: 'WO-115', move_out_date: '2026-04-30', status_change: 'Notice' },
  },
]

const operationalSummary: OperationalSummary = {
  alerts: {
    active: 7,
    newToday: 2,
    closedToday: 1,
  },
  workOrders: {
    open: 23,
    newToday: 3,
    completedToday: 4,
    overdueOpen: 5,
  },
  makeReady: {
    active: 5,
    overdue: 2,
    readyThisWeek: 0,
  },
  delinquencies: {
    count: 12,
    totalAmount: 28_475.50,
    over90Days: 3,
    amount30Plus: 19_820.00,
  },
  technical: {
    filesProcessed: 15,
    filesWithErrors: 0,
    status: 'completed',
    errorMessage: null,
  },
}

// Simulated snapshot deltas — today vs yesterday per property
// Negative available_delta means units were leased (fewer vacant today)
const snapshotDeltas: PropertySnapshotDeltas = {
  RS: { available_count: 8,  available_delta: -2, avg_contracted_rent: 1490, rent_delta: 0    },
  SB: { available_count: 11, available_delta: 0,  avg_contracted_rent: 1642, rent_delta: 8    },
  CV: { available_count: 5,  available_delta: 1,  avg_contracted_rent: 2362, rent_delta: -2   },
  OB: { available_count: 3,  available_delta: -1, avg_contracted_rent: 2527, rent_delta: -25  },
  WO: { available_count: 4,  available_delta: null, avg_contracted_rent: 2945, rent_delta: null }, // no prior snapshot
}

// Simulated renewal worksheet counts per property
const renewalCounts: PropertyRenewalCountsMap = {
  RS: { pending: 3, offered: 2 },  // 3 not yet sent, 2 awaiting resident signature
  SB: { pending: 5, offered: 4 },
  CV: { pending: 1, offered: 0 },
  OB: { pending: 2, offered: 3 },
  WO: { pending: 0, offered: 1 },
}

const html = generateHighFidelityHtmlReport(run, events, operationalSummary, 'https://eemanager.vercel.app', snapshotDeltas, renewalCounts)

// Wrap in a full HTML document for browser preview
const fullPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solver Email Preview — ${new Date(run.upload_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</title>
  <style>
    body { margin: 0; padding: 32px; background: #f3f4f6; font-family: 'Inter', system-ui, sans-serif; }
    .preview-banner {
      max-width: 800px; margin: 0 auto 16px;
      background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px;
      padding: 10px 16px; font-size: 13px; color: #92400e; display: flex;
      justify-content: space-between; align-items: center;
    }
    .preview-banner strong { font-weight: 700; }
  </style>
</head>
<body>
  <div class="preview-banner">
    <span><strong>Email Preview</strong> — Simulated solver run · 2026-03-10 · batch 2026-03-10_0712_a3f9b</span>
    <span>All 5 properties · 4 renewals · 1 new resident · 17 price changes · 12 notices</span>
  </div>
  ${html}
</body>
</html>`

const outPath = '/tmp/solver-email-preview.html'
writeFileSync(outPath, fullPage, 'utf-8')
console.log(`\n✓ Preview written to: ${outPath}`)
console.log(`  Open with: open ${outPath}\n`)
