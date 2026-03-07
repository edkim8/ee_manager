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

const ORDINALS = ['1st', '2nd', '3rd', '4th']

function quarterOf(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const q = Math.floor(d.getMonth() / 3)
  return { key: `${d.getFullYear()}-Q${q + 1}`, label: `${ORDINALS[q]} Quarter ${d.getFullYear()}` }
}

function groupByQuarter(items: any[]) {
  const groups = new Map<string, { label: string; items: any[] }>()
  for (const item of items) {
    const { key, label } = quarterOf(item.distribution_date)
    if (!groups.has(key)) groups.set(key, { label, items: [] })
    groups.get(key)!.items.push(item)
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, g]) => {
      const sorted = [...g.items].sort((a, b) => {
        if (a.distribution_date !== b.distribution_date)
          return b.distribution_date.localeCompare(a.distribution_date)
        return (a.source_entity_name || a.property_code || '').localeCompare(b.source_entity_name || b.property_code || '')
      })
      return {
        label: g.label,
        items: sorted,
        subtotal: {
          net:      sorted.reduce((s: number, i: any) => s + Number(i.net_amount),      0),
          withheld: sorted.reduce((s: number, i: any) => s + Number(i.withhold_amount), 0),
        },
      }
    })
}

function buildStatementHtml(data: any): string {
  const { entity_name, profile_name, items, totals } = data
  const generated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const groups    = groupByQuarter(items)
  const has592    = totals.withheld > 0

  const groupSections = groups.map(group => {
    const rows = group.items.map((i: any) => {
      const source = i.source_entity_name
        ? `<span style="color:#7c3aed">${i.source_entity_name}</span>`
        : i.property_code
          ? `<span style="background:#f1f5f9;border-radius:4px;padding:1px 5px">${i.property_code}</span>`
          : '—'
      const withhold = Number(i.withhold_amount) > 0
        ? `<span style="color:#d97706">${fmt(i.withhold_amount)}</span>` : '—'
      return `<tr>
        <td>${source}<br><span style="color:#9ca3af;font-size:9px">${i.property_name || i.event_title}</span></td>
        <td style="text-align:right;color:#6b7280">${fmt(i.event_total_amount)}</td>
        <td style="text-align:right">${Number(i.equity_pct).toFixed(4)}%</td>
        <td style="text-align:right;font-weight:600">${fmt(i.net_amount)}</td>
        ${has592 ? `<td style="text-align:right">${withhold}</td>` : ''}
        <td>${i.transfer_date || '<span style="color:#9ca3af">Pending</span>'}</td>
      </tr>`
    }).join('\n')

    return `
    <div class="section-title">
      ${group.label} Distributions for ${entity_name}
      <span class="section-total">${fmt(group.subtotal.net)}</span>
    </div>
    <table>
      <thead><tr>
        <th>Property / Entity</th>
        <th style="text-align:right">Total Dist.</th>
        <th style="text-align:right">Equity %</th>
        <th style="text-align:right">Distribution</th>
        ${has592 ? '<th style="text-align:right">Withheld</th>' : ''}
        <th>Transaction Date</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr>
        <td colspan="3" style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:0.04em">${group.label} Subtotal</td>
        <td style="text-align:right">${fmt(group.subtotal.net)}</td>
        ${has592 ? `<td style="text-align:right;color:#d97706">${group.subtotal.withheld > 0 ? fmt(group.subtotal.withheld) : '—'}</td>` : ''}
        <td></td>
      </tr></tfoot>
    </table>`
  }).join('\n')

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @page { size: letter landscape; margin: 0.5in 0.55in; @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 8pt; color: #9ca3af; } }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; font-size: 11px; margin: 0; }
  .doc-header { border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; }
  .doc-header h1 { margin: 0 0 3px; font-size: 18px; color: #1e3a5f; }
  .doc-header p  { margin: 2px 0; color: #6b7280; font-size: 10px; }
  .doc-header-right { text-align: right; color: #6b7280; font-size: 10px; }
  .summary { display: flex; gap: 20px; margin-bottom: 20px; padding: 10px 14px; background: #f8fafc; border-radius: 5px; border: 1px solid #e2e8f0; }
  .summary-item label { display: block; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 2px; }
  .summary-item span  { font-size: 14px; font-weight: 700; color: #111827; }
  .section-title { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 700; color: #1e3a5f; margin: 20px 0 6px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
  .section-total { font-size: 13px; font-weight: 700; color: #111827; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 4px; }
  thead tr { background: #1e3a5f; color: #fff; }
  th { padding: 5px 7px; text-align: left; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
  td { padding: 4px 7px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  tfoot tr td { padding: 5px 7px; border-top: 2px solid #e2e8f0; font-weight: 700; background: #f1f5f9; }
  .notice { margin-top: 14px; padding: 7px 10px; background: #fef9c3; border: 1px solid #fde68a; border-radius: 4px; font-size: 9px; color: #78350f; }
</style>
</head><body>
  <div class="doc-header">
    <div>
      <h1>${entity_name}</h1>
      <p>Distribution Statement — All Distributions Since Inception</p>
      ${profile_name ? `<p>Contact: ${profile_name}</p>` : ''}
    </div>
    <div class="doc-header-right">
      <p>Generated: ${generated}</p>
      <p>${totals.count} distribution${totals.count !== 1 ? 's' : ''}</p>
    </div>
  </div>

  <div class="summary">
    <div class="summary-item"><label>Total Gross</label><span>${fmt(totals.gross)}</span></div>
    ${totals.withheld > 0 ? `<div class="summary-item"><label>Withheld (592)</label><span style="color:#d97706">${fmt(totals.withheld)}</span></div>` : ''}
    <div class="summary-item"><label>Total Net Received</label><span style="color:#1e3a5f">${fmt(totals.net)}</span></div>
    <div class="summary-item"><label>Distributions</label><span>${totals.count}</span></div>
  </div>

  ${groupSections}

  ${has592 ? `<div class="notice">CA Form 592 — Total withheld: ${fmt(totals.withheld)}. File CA Form 592 with the FTB for each applicable tax year.</div>` : ''}
</body></html>`
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { entity_id } = await readBody<{ entity_id: string }>(event)
  if (!entity_id) throw createError({ statusCode: 400, statusMessage: 'entity_id is required' })

  const chromePath = await findChrome()
  if (!chromePath)
    throw createError({ statusCode: 503, statusMessage: 'Chrome binary not found. PDF generation requires Google Chrome.' })

  // Fetch statement data
  const client = serverSupabaseServiceRole(event)

  const { data: items, error } = await client
    .from('distribution_line_items' as any)
    .select('*')
    .eq('owner_entity_id', entity_id)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!items?.length) throw createError({ statusCode: 404, statusMessage: 'No distributions found for this entity' })

  // Enrich with event metadata
  const eventIds = [...new Set((items as any[]).map((i: any) => i.event_id))]
  const { data: eventsData } = await client
    .from('distribution_events' as any)
    .select('id, title, distribution_date, type, status, total_amount, property_id, source_entity_id, entity_level')
    .in('id', eventIds)

  const propertyIds = [...new Set((eventsData || []).map((e: any) => e.property_id).filter(Boolean))]
  const { data: properties } = propertyIds.length
    ? await client.from('properties' as any).select('id, code, name').in('id', propertyIds)
    : { data: [] }
  const propMap = new Map((properties || []).map((p: any) => [p.id, { code: p.code, name: p.name }]))

  const srcEntityIds = [...new Set((eventsData || []).map((e: any) => e.source_entity_id).filter(Boolean))]
  const { data: srcEntities } = srcEntityIds.length
    ? await client.from('ownership_entities' as any).select('id, name').in('id', srcEntityIds)
    : { data: [] }
  const srcEntityMap = new Map((srcEntities || []).map((e: any) => [e.id, e.name as string]))

  const eventMap = new Map((eventsData || []).map((e: any) => [e.id, e]))

  const enrichedItems = ((items as any[]).map((i: any) => {
    const evt  = eventMap.get(i.event_id) || {}
    const prop = propMap.get(evt.property_id)
    return {
      ...i,
      event_title:        evt.title            || '—',
      distribution_date:  evt.distribution_date || '',
      event_type:         evt.type             || null,
      property_code:       prop?.code           || null,
      event_total_amount:  evt.total_amount     || 0,
      source_entity_name:  srcEntityMap.get(evt.source_entity_id) || null,
    }
  })).sort((a: any, b: any) => b.distribution_date.localeCompare(a.distribution_date))

  // Profile info for header
  const profileId = (items as any[])[0]?.profile_id || null
  let profileName = ''
  if (profileId) {
    const { data: prof } = await client
      .from('profiles' as any)
      .select('first_name, last_name, email')
      .eq('id', profileId)
      .single()
    if (prof) profileName = [prof.first_name, prof.last_name].filter(Boolean).join(' ')
  }

  const totals = {
    gross:    enrichedItems.reduce((s: number, i: any) => s + Number(i.gross_amount),    0),
    withheld: enrichedItems.reduce((s: number, i: any) => s + Number(i.withhold_amount), 0),
    net:      enrichedItems.reduce((s: number, i: any) => s + Number(i.net_amount),      0),
    count:    enrichedItems.length,
  }

  const html = buildStatementHtml({
    entity_name:  (items as any[])[0]?.owner_name || 'Unknown',
    profile_name: profileName,
    items:        enrichedItems,
    totals,
  })

  const id       = randomUUID()
  const htmlPath = join(tmpdir(), `dist-statement-${id}.html`)
  const pdfPath  = join(tmpdir(), `dist-statement-${id}.pdf`)
  const safeFileName = ((items as any[])[0]?.owner_name || 'Statement').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-')

  try {
    await writeFile(htmlPath, html, 'utf8')
    await execFileAsync(chromePath, [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      `--print-to-pdf=${pdfPath}`,
      '--print-to-pdf-no-header',
      `file://${htmlPath}`,
    ], { timeout: 60_000 })

    const pdfBuffer = await readFile(pdfPath)

    setResponseHeaders(event, {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${safeFileName}-Statement.pdf"`,
      'Content-Length':      String(pdfBuffer.length),
    })

    return pdfBuffer
  } finally {
    await unlink(htmlPath).catch(() => {})
    await unlink(pdfPath).catch(() => {})
  }
})
