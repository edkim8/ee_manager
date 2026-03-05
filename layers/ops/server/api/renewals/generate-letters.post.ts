/**
 * POST /api/renewals/generate-letters
 *
 * Accepts an array of RenewalLetterRow objects plus a propertyCode.
 * Fetches the property's letter template config (letterhead URL, community name,
 * manager info) from the renewal_letter_templates table, embeds the letterhead as
 * a base64 data URL, and returns a merged PDF via Chrome headless.
 *
 * Body: { rows: RenewalLetterRow[], propertyCode: string }
 * Response: PDF binary (application/pdf)
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { writeFile, readFile, unlink, access, constants as fsConstants } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { generateRenewalLettersHtml } from '../../../utils/renewalLetterHtml'
import { getPropertyLetterConfig } from '../../../utils/renewalLetterConfig'
import type { RenewalLetterRow, LetterContext } from '../../../utils/renewalLetterHtml'

const execFileAsync = promisify(execFile)

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium'
]

async function findChrome(): Promise<string | null> {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      await access(candidate, fsConstants.X_OK)
      return candidate
    } catch { /* skip */ }
  }
  return null
}

/**
 * Fetch a URL and return a base64 data URL string.
 * Used to embed Supabase Storage images into the HTML so Chrome headless
 * can render them without network access restrictions (file:// mode).
 */
async function urlToDataUrl(imageUrl: string): Promise<string> {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) return ''
    const buffer = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    return `data:${contentType};base64,${buffer.toString('base64')}`
  } catch {
    return ''
  }
}

/**
 * Read a letterhead image from the local /public folder and base64-encode it.
 * Fallback used when no Supabase Storage URL is set for the property.
 */
async function localLetterheadDataUrl(propertyCode: string): Promise<string> {
  const config = getPropertyLetterConfig(propertyCode)
  if (!config.letterheadImagePath) return ''
  const absolutePath = join(process.cwd(), 'public', config.letterheadImagePath)
  try {
    await access(absolutePath, fsConstants.R_OK)
    const buffer = await readFile(absolutePath)
    const ext = absolutePath.split('.').pop()?.toLowerCase() ?? 'jpeg'
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg'
    return `data:${mimeType};base64,${buffer.toString('base64')}`
  } catch {
    return ''
  }
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody<{ rows: RenewalLetterRow[]; propertyCode: string }>(event)

  if (!body?.rows || !Array.isArray(body.rows) || body.rows.length === 0)
    throw createError({ statusCode: 400, statusMessage: 'Missing or empty rows array' })

  if (body.rows.length > 200)
    throw createError({ statusCode: 400, statusMessage: 'Maximum 200 letters per request' })

  const chromePath = await findChrome()
  if (!chromePath)
    throw createError({ statusCode: 503, statusMessage: 'Chrome binary not found. PDF generation requires Google Chrome.' })

  const propertyCode = body.propertyCode ?? ''

  // ── Fetch per-property template config from DB ─────────────────────────────
  const client = serverSupabaseServiceRole(event)
  const { data: tmpl } = await client
    .from('renewal_letter_templates')
    .select('community_name, manager_name, manager_phone, letterhead_url')
    .eq('property_code', propertyCode)
    .maybeSingle()

  const ctx: LetterContext = {
    communityName: tmpl?.community_name || getPropertyLetterConfig(propertyCode).propertyName,
    managerName:   tmpl?.manager_name   || '',
    managerPhone:  tmpl?.manager_phone  || '',
  }

  // ── Resolve letterhead: Storage URL (preferred) → local file → none ────────
  let letterheadDataUrl = ''
  if (tmpl?.letterhead_url) {
    letterheadDataUrl = await urlToDataUrl(tmpl.letterhead_url)
  }
  if (!letterheadDataUrl) {
    letterheadDataUrl = await localLetterheadDataUrl(propertyCode)
  }

  // ── Generate HTML ──────────────────────────────────────────────────────────
  const html = generateRenewalLettersHtml(body.rows, letterheadDataUrl, ctx)

  const id       = randomUUID()
  const htmlPath = join(tmpdir(), `renewal-letters-${id}.html`)
  const pdfPath  = join(tmpdir(), `renewal-letters-${id}.pdf`)

  try {
    await writeFile(htmlPath, html, 'utf8')

    await execFileAsync(chromePath, [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      `--print-to-pdf=${pdfPath}`,
      '--print-to-pdf-no-header',
      `file://${htmlPath}`
    ], { timeout: 60_000 })

    const pdfBuffer = await readFile(pdfPath)

    setResponseHeaders(event, {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="Renewal-Letters-${new Date().toISOString().slice(0, 10)}.pdf"`,
      'Content-Length':      String(pdfBuffer.length)
    })

    return pdfBuffer
  } finally {
    await unlink(htmlPath).catch(() => {})
    await unlink(pdfPath).catch(() => {})
  }
})
