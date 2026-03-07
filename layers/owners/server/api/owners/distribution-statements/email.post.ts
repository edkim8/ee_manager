/**
 * POST /api/owners/distribution-statements/email
 *
 * Emails distribution statements to an owner profile.
 * Generates one PDF per entity associated with the profile and sends
 * them all as attachments to the profile's email address.
 *
 * Body: { profile_id: string }
 */

import nodemailer      from 'nodemailer'
import { execFile }    from 'node:child_process'
import { promisify }   from 'node:util'
import { writeFile, readFile, unlink, access, constants as fsConstants } from 'node:fs/promises'
import { tmpdir }      from 'node:os'
import { join }        from 'node:path'
import { randomUUID }  from 'node:crypto'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

const execFileAsync = promisify(execFile)

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
]

async function findChrome(): Promise<string | null> {
  for (const c of CHROME_CANDIDATES) {
    try { await access(c, fsConstants.X_OK); return c } catch { /* skip */ }
  }
  return null
}

function fmt(val: any): string {
  const n = Number(val)
  if (isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function buildStatementHtml(entityName: string, profileName: string, items: any[], totals: any): string {
  const generated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const typeColors: Record<string, string> = {
    Operating: '#0d9488', Refinance: '#2563eb', Sale: '#7c3aed', Tax: '#d97706'
  }

  const rows = items.map((i: any) => {
    const source = i.source_entity_name
      ? `<span style="color:#7c3aed;font-size:10px">${i.source_entity_name}</span>`
      : i.property_code
        ? `<span style="background:#f1f5f9;border-radius:4px;padding:1px 6px;font-size:10px">${i.property_code}</span>`
        : '—'
    const typeColor = typeColors[i.event_type] || '#6b7280'
    const typeTag = i.event_type ? `<span style="color:${typeColor};font-size:10px">${i.event_type}</span>` : ''
    const withhold = Number(i.withhold_pct) > 0 ? `<span style="color:#d97706">${fmt(i.withhold_amount)}</span>` : '—'
    const confirmed = i.transfer_confirmed ? '<span style="color:#16a34a;font-weight:600">✓</span>' : '<span style="color:#9ca3af">–</span>'

    return `<tr>
      <td>${i.distribution_date}</td>
      <td>${source}</td>
      <td style="font-size:11px">${i.event_title} ${typeTag}</td>
      <td style="text-align:right;font-size:10px">${Number(i.equity_pct).toFixed(4)}%</td>
      <td style="text-align:right">${fmt(i.gross_amount)}</td>
      <td style="text-align:right">${withhold}</td>
      <td style="text-align:right;font-weight:600">${fmt(i.net_amount)}</td>
      <td style="text-align:center">${confirmed}</td>
      <td style="font-size:10px;color:#6b7280">${i.transfer_date || ''}</td>
    </tr>`
  }).join('\n')

  const has592 = items.some((i: any) => Number(i.withhold_pct) > 0)

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @page { size: letter landscape; margin: 0.5in 0.55in; @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 8pt; color: #9ca3af; } }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; font-size: 12px; margin: 0; }
  .header { border-bottom: 2px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header-left h1 { margin: 0 0 4px; font-size: 20px; color: #1e3a5f; }
  .header-left p  { margin: 2px 0; color: #6b7280; font-size: 11px; }
  .header-right   { text-align: right; color: #6b7280; font-size: 11px; }
  .summary { display: flex; gap: 24px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
  .summary-item label { display: block; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 2px; }
  .summary-item span  { font-size: 15px; font-weight: 700; color: #111827; font-variant-numeric: tabular-nums; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  thead tr { background: #1e3a5f; color: #fff; }
  th { padding: 6px 8px; text-align: left; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
  th:nth-child(4), th:nth-child(5), th:nth-child(6), th:nth-child(7) { text-align: right; }
  th:nth-child(8) { text-align: center; }
  td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  tr:nth-child(even) td { background: #f8fafc; }
  tfoot tr td { padding: 7px 8px; border-top: 2px solid #e2e8f0; font-weight: 700; background: #f1f5f9; }
  .notice { margin-top: 16px; padding: 8px 12px; background: #fef9c3; border: 1px solid #fde68a; border-radius: 4px; font-size: 10px; color: #78350f; }
</style></head><body>
  <div class="header">
    <div class="header-left">
      <h1>${entityName}</h1>
      <p>Distribution Statement — All Distributions Since Inception</p>
      ${profileName ? `<p>Contact: ${profileName}</p>` : ''}
    </div>
    <div class="header-right">
      <p>Generated: ${generated}</p>
      <p>${totals.count} distribution${totals.count !== 1 ? 's' : ''}</p>
    </div>
  </div>
  <div class="summary">
    <div class="summary-item"><label>Total Gross</label><span>${fmt(totals.gross)}</span></div>
    ${totals.withheld > 0 ? `<div class="summary-item"><label>Total Withheld (592)</label><span style="color:#d97706">${fmt(totals.withheld)}</span></div>` : ''}
    <div class="summary-item"><label>Total Net Received</label><span style="color:#1e3a5f">${fmt(totals.net)}</span></div>
    <div class="summary-item"><label>Distributions</label><span>${totals.count}</span></div>
  </div>
  <table>
    <thead><tr>
      <th>Date</th><th>Property / Entity</th><th>Event</th><th>Equity %</th>
      <th>Gross</th><th>Withheld</th><th>Net</th><th>Confirmed</th><th>Transfer Date</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td colspan="4">Totals (${totals.count} distributions)</td>
      <td style="text-align:right">${fmt(totals.gross)}</td>
      <td style="text-align:right;color:#d97706">${totals.withheld > 0 ? fmt(totals.withheld) : '—'}</td>
      <td style="text-align:right">${fmt(totals.net)}</td>
      <td colspan="2"></td>
    </tr></tfoot>
  </table>
  ${has592 ? `<div class="notice">CA Form 592 — ${fmt(totals.withheld)} withheld. File CA Form 592 with the FTB for each applicable tax year.</div>` : ''}
</body></html>`
}

async function generatePdfBuffer(chromePath: string, html: string): Promise<Buffer> {
  const id       = randomUUID()
  const htmlPath = join(tmpdir(), `dist-stmt-${id}.html`)
  const pdfPath  = join(tmpdir(), `dist-stmt-${id}.pdf`)
  try {
    await writeFile(htmlPath, html, 'utf8')
    await execFileAsync(chromePath, [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      `--print-to-pdf=${pdfPath}`, '--print-to-pdf-no-header', `file://${htmlPath}`,
    ], { timeout: 60_000 })
    return await readFile(pdfPath)
  } finally {
    await unlink(htmlPath).catch(() => {})
    await unlink(pdfPath).catch(() => {})
  }
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { profile_id } = await readBody<{ profile_id: string }>(event)
  if (!profile_id) throw createError({ statusCode: 400, statusMessage: 'profile_id is required' })

  const chromePath = await findChrome()
  if (!chromePath)
    throw createError({ statusCode: 503, statusMessage: 'Chrome binary not found' })

  const config = useRuntimeConfig()
  const client = serverSupabaseServiceRole(event)

  // Get profile info (email + name)
  const { data: prof, error: profErr } = await client
    .from('profiles' as any)
    .select('id, first_name, last_name, email')
    .eq('id', profile_id)
    .single()

  if (profErr || !prof) throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
  if (!prof.email) throw createError({ statusCode: 422, statusMessage: 'Profile has no email address' })

  const profileName = [prof.first_name, prof.last_name].filter(Boolean).join(' ') || prof.email

  // All entities for this profile that have distributions
  const { data: lineItems, error: liErr } = await client
    .from('distribution_line_items' as any)
    .select('owner_entity_id, owner_name')
    .eq('profile_id', profile_id)

  if (liErr) throw createError({ statusCode: 500, statusMessage: liErr.message })
  if (!lineItems?.length) throw createError({ statusCode: 404, statusMessage: 'No distributions found for this profile' })

  // Unique entities
  const entityMap = new Map<string, string>()
  for (const li of lineItems as any[]) {
    if (li.owner_entity_id && !entityMap.has(li.owner_entity_id)) {
      entityMap.set(li.owner_entity_id, li.owner_name)
    }
  }

  // Enrich line items with event data
  const allEventIds = [...new Set((lineItems as any[]).map((i: any) => i.event_id).filter(Boolean))]
  // Re-fetch full line items for this profile
  const { data: fullItems } = await client
    .from('distribution_line_items' as any)
    .select('*')
    .eq('profile_id', profile_id)

  const { data: eventsData } = await client
    .from('distribution_events' as any)
    .select('id, title, distribution_date, type, status, property_id, source_entity_id')
    .in('id', [...new Set((fullItems || []).map((i: any) => i.event_id))])

  const propertyIds = [...new Set((eventsData || []).map((e: any) => e.property_id).filter(Boolean))]
  const { data: properties } = propertyIds.length
    ? await client.from('properties' as any).select('id, code').in('id', propertyIds)
    : { data: [] }
  const propMap = new Map((properties || []).map((p: any) => [p.id, p.code as string]))

  const srcEntityIds = [...new Set((eventsData || []).map((e: any) => e.source_entity_id).filter(Boolean))]
  const { data: srcEntities } = srcEntityIds.length
    ? await client.from('ownership_entities' as any).select('id, name').in('id', srcEntityIds)
    : { data: [] }
  const srcEntityMap = new Map((srcEntities || []).map((e: any) => [e.id, e.name as string]))

  const eventMap = new Map((eventsData || []).map((e: any) => [e.id, e]))

  const enriched = ((fullItems || []) as any[]).map((i: any) => {
    const evt = eventMap.get(i.event_id) || {}
    return {
      ...i,
      event_title:        evt.title            || '—',
      distribution_date:  evt.distribution_date || '',
      event_type:         evt.type             || null,
      property_code:      propMap.get(evt.property_id) || null,
      source_entity_name: srcEntityMap.get(evt.source_entity_id) || null,
    }
  })

  // Generate one PDF per entity
  const attachments: { filename: string; content: Buffer }[] = []

  for (const [entityId, entityName] of entityMap) {
    const entityItems = enriched
      .filter((i: any) => i.owner_entity_id === entityId)
      .sort((a: any, b: any) => b.distribution_date.localeCompare(a.distribution_date))

    const totals = {
      gross:    entityItems.reduce((s: number, i: any) => s + Number(i.gross_amount),    0),
      withheld: entityItems.reduce((s: number, i: any) => s + Number(i.withhold_amount), 0),
      net:      entityItems.reduce((s: number, i: any) => s + Number(i.net_amount),      0),
      count:    entityItems.length,
    }

    const html = buildStatementHtml(entityName, profileName, entityItems, totals)
    const pdfBuffer = await generatePdfBuffer(chromePath, html)
    const safeFileName = entityName.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-')
    attachments.push({ filename: `${safeFileName}-Statement.pdf`, content: pdfBuffer })
  }

  // Build HTML email body with a summary table
  const entitySummaryRows = attachments
    .map(a => `<tr><td style="padding:4px 8px">${a.filename.replace('-Statement.pdf', '').replace(/-/g, ' ')}</td></tr>`)
    .join('')

  const emailHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; background: #f8f9fa; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { background: #1e3a5f; color: #fff; padding: 24px 32px; }
  .header h1 { margin: 0; font-size: 18px; font-weight: 600; }
  .header p  { margin: 4px 0 0; font-size: 12px; color: #94a3b8; }
  .body { padding: 24px 32px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  td { border-bottom: 1px solid #f1f5f9; }
  .footer { padding: 16px 32px; background: #f8f9fa; border-top: 1px solid #e2e8f0; font-size: 11px; color: #9ca3af; }
</style>
</head><body>
<div class="container">
  <div class="header">
    <h1>Distribution Statements</h1>
    <p>All distributions since inception · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>
  <div class="body">
    <p>Dear ${profileName},</p>
    <p>Please find attached your distribution statements. Each PDF covers all distributions since inception for the respective entity.</p>
    <table><tbody>${entitySummaryRows}</tbody></table>
    <p style="font-size:12px;color:#6b7280;margin-top:16px">If you have any questions about these distributions, please contact us.</p>
  </div>
  <div class="footer">Generated by EE Manager</div>
</div>
</body></html>`

  const transporter = nodemailer.createTransport({
    host: config.public.mailersendServer,
    port: parseInt(config.public.mailersendPort as string),
    auth: {
      user: config.public.mailersendUsername,
      pass: config.mailersendPassword,
    },
  })

  await transporter.sendMail({
    from:        `"${config.public.mailersendSmtpName || 'EE Manager'}" <${config.public.mailersendUsername}>`,
    to:          prof.email,
    subject:     `Distribution Statements — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    html:        emailHtml,
    attachments: attachments.map(a => ({ filename: a.filename, content: a.content, contentType: 'application/pdf' })),
  })

  return {
    success:      true,
    recipient:    prof.email,
    entity_count: entityMap.size,
    entities:     [...entityMap.values()],
  }
})
